# DbContext Lifetimes and DbContextFactory

This document explains why services in this project are registered with `AddScoped`, why `DbContext` can't be a singleton, and how `IDbContextFactory<AppDbContext>` would change things if background services are introduced.

---

## Why `AddScoped` Is Used for All Services

The core reason is that all services depend (directly or indirectly) on `AppDbContext`, and **`DbContext` must never be a singleton**.

### The three DI lifetimes

| Lifetime | Instance created | Instance lives until |
|---|---|---|
| `AddSingleton` | Once, on first request | App shutdown |
| `AddScoped` | Once per HTTP request | Request ends |
| `AddTransient` | Every time it is resolved | Immediately after use |

### Why `DbContext` can't be a singleton

`AppDbContext` (EF Core) is not thread-safe. It holds:

- An open database connection
- An in-memory change tracker (tracks which entities are new/modified/deleted)

If it were a singleton, **all concurrent requests would share the same instance**, causing:

- Race conditions on the change tracker
- One request seeing uncommitted changes from another
- Connection pool exhaustion

So EF Core registers `DbContext` as **scoped** by default (`AddDbContext` does this automatically).

### The captive dependency problem

If a service were registered as `AddSingleton` but depends on a scoped `DbContext`, ASP.NET Core throws at startup:

```
Cannot consume scoped service 'AppDbContext' from singleton 'IProjectService'
```

This is called a **captive dependency** — a longer-lived object holds a reference to a shorter-lived one, keeping it alive beyond its intended scope. The scoped `DbContext` would effectively become a singleton inside that service, bringing back all the thread-safety problems above.

### Why `AddScoped` is the right fit here

Every service in this project follows this dependency chain:

```
Controller  →  Service  →  Repository  →  AppDbContext
```

All of them need to share **the same `DbContext` instance within a single request** (so that changes made in one service are visible to another within the same transaction), but each request must get a **fresh instance** (so one request's state doesn't bleed into another).

`AddScoped` gives exactly that: one instance per request, shared across the full chain, then discarded when the response is sent.

### When you would use the others

- `AddSingleton` — stateless services with no DB dependency (e.g. a pure in-memory cache, a configuration reader, a static helper)
- `AddTransient` — very lightweight, truly stateless operations where you explicitly want a fresh instance every time (rare in web APIs)

---

## Using `IDbContextFactory<AppDbContext>` Instead

Using `IDbContextFactory<AppDbContext>` changes the model from **scope-managed** to **manually-managed** lifetimes, which unlocks some scenarios but adds responsibility.

### How it works

Instead of injecting `AppDbContext` directly, you inject the factory and create/dispose contexts yourself:

```csharp
public class ProjectRepository : IProjectRepository
{
    private readonly IDbContextFactory<AppDbContext> _factory;

    public ProjectRepository(IDbContextFactory<AppDbContext> factory)
        => _factory = factory;

    public async Task<Project?> GetByIdAsync(Guid id)
    {
        await using var db = _factory.CreateDbContext();
        return await db.Projects.FindAsync(id);
    }
}
```

Registered with:

```csharp
builder.Services.AddDbContextFactory<AppDbContext>(options =>
    options.UseNpgsql(connectionString));
```

The factory itself is registered as a **singleton** — only the contexts it *creates* are short-lived.

### What it enables

**Singleton services can now use the DB**

Because the factory is a singleton but each method creates and disposes its own context, you're no longer holding a long-lived `DbContext`. This breaks the captive dependency problem — a singleton service can safely call the DB.

**Parallelism within a single request**

With a scoped `DbContext`, you can't run two EF queries in parallel (`DbContext` is not thread-safe). With the factory each parallel operation gets its own context:

```csharp
await using var db1 = _factory.CreateDbContext();
await using var db2 = _factory.CreateDbContext();

await Task.WhenAll(
    db1.Projects.ToListAsync(),
    db2.Tickets.ToListAsync()
);
```

**Required for Blazor Server**

Blazor Server components live across many user interactions (not per-request), so a scoped `DbContext` would survive far too long. The factory is the officially recommended pattern there.

### What you lose

**Shared unit of work across a request**

With scoped `DbContext`, all repositories in a request share one instance — changes in `ProjectRepository` are visible to `TicketRepository` before anything is saved, and you can wrap the whole request in one transaction.

With the factory, each method creates its own isolated context. To share state or a transaction across services you'd have to pass a context around explicitly or implement a Unit of Work on top — significantly more complexity.

**Simplicity**

`await using var db = _factory.CreateDbContext()` in every method is boilerplate you'd repeat everywhere, and forgetting `await using` leaks connections.

### The verdict for this project (no background services)

The current scoped approach is the right choice because:

- All services are already scoped (no singleton needs DB access)
- No parallel EF queries within a single request
- The shared-context-per-request behaviour is actively useful (consistent view of data within a request)
- No Blazor or background-service complexity

The factory pattern would only be worth the trade-off if singleton background services (e.g. `IHostedService`) needed DB access, or if there were a specific need for intra-request parallelism.

---

## Mixing `DbContext` and `DbContextFactory` (If Background Services Are Added)

If background services are introduced later, mixing both patterns is not just possible — it's the recommended approach, and EF Core makes it easy.

### The key fact

Calling `AddDbContextFactory<AppDbContext>()` registers **two things at once**:

1. `IDbContextFactory<AppDbContext>` — as a **singleton**
2. `AppDbContext` itself — as a **scoped** service, created internally via the factory

So one call replaces the current `AddDbContext<AppDbContext>(...)` registration while keeping everything working exactly as before for scoped consumers:

```csharp
builder.Services.AddDbContextFactory<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));
```

### What each consumer does

**Scoped services (current Controllers/Services/Repositories)** — inject `AppDbContext` directly, unchanged:

```csharp
public class ProjectRepository : IProjectRepository
{
    private readonly AppDbContext _db;
    public ProjectRepository(AppDbContext db) => _db = db;
}
```

No code changes needed here. They still get one shared instance per HTTP request.

**Singleton background services** — inject `IDbContextFactory<AppDbContext>` and create/dispose a context per unit of work:

```csharp
public class OverdueTicketNotifier : BackgroundService
{
    private readonly IDbContextFactory<AppDbContext> _factory;
    private readonly IProjectNotifier _notifier;

    public OverdueTicketNotifier(IDbContextFactory<AppDbContext> factory, IProjectNotifier notifier)
    {
        _factory = factory;
        _notifier = notifier;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            await using var db = await _factory.CreateDbContextAsync(stoppingToken);
            var overdue = await db.Tickets.Where(t => t.DueDate < DateTime.UtcNow).ToListAsync(stoppingToken);
            // ... notify ...

            await Task.Delay(TimeSpan.FromMinutes(15), stoppingToken);
        }
    }
}
```

Registered with `builder.Services.AddHostedService<OverdueTicketNotifier>();`

A `BackgroundService` is itself a singleton (hosted services live for the app's lifetime), so it **cannot** inject scoped `AppDbContext` directly — that would throw the captive dependency error described above. The factory sidesteps this: it's a singleton, but every `CreateDbContextAsync()` call hands back a fresh, short-lived context that gets `await using`-disposed.

### The alternative: `IServiceScopeFactory`

There's a second pattern worth knowing, used before `IDbContextFactory` existed:

```csharp
protected override async Task ExecuteAsync(CancellationToken stoppingToken)
{
    using var scope = _scopeFactory.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    // ...
}
```

This creates an artificial "request scope" and resolves the normal scoped `AppDbContext` from it — useful if the background service also needs other scoped dependencies (e.g. `IProjectService`, `ITicketService`) rather than just the `DbContext` itself. `IDbContextFactory` is more direct when only the context is needed.

### Recommendation if background services are added

Register `AddDbContextFactory` instead of `AddDbContext` (a one-line swap), keep all existing scoped injections as-is, and use `IDbContextFactory<AppDbContext>` only in the new hosted service. No other code needs to change.
