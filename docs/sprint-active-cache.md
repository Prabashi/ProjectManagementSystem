# In-Memory Caching of the Active Sprint

This document explains the in-memory cache-aside layer added in front of `GetActiveSprintAsync`, why it exists, how it stays correct across horizontally-scaled instances, and the trade-offs behind the design.

---

## What's Cached, and Why Only This

`ISprintRepository.GetActiveSprintAsync(projectId)` — "which sprint is currently active for this project" — is cached. Nothing else on the repository is.

It was chosen because it's the intersection of **hot** and **cheap to keep correct**:

- **Hot**: it's read on every dashboard load, often once per visible project per request.
- **Cheap to keep correct**: only three write paths can ever change the answer for a given project — `UpdateAsync`, `DeleteAsync`, and `DeactivateAllAsync` on a `Sprint`. A small, enumerable set of invalidation points means the cache can be kept exactly correct instead of relying on a short TTL to paper over staleness.

`CreateAsync`, `GetByProjectIdAsync`, and `GetByIdAsync` are not cached — they're either not hot enough to matter or don't have the same narrow invalidation surface.

---

## Architecture: Decorator over the Repository

```
ISprintService
      │
      ▼
ISprintRepository  ◄── interface consumed by everything above
      │
      ▼
CachedSprintRepository   (cache-aside decorator)
      │
      ▼
SprintRepository         (EF Core / Postgres)
```

[CachedSprintRepository](../backend/Repositories/CachedSprintRepository.cs) implements `ISprintRepository` and wraps the real [SprintRepository](../backend/Repositories/SprintRepository.cs), which is registered separately as its own concrete type so it can be injected as the "inner" dependency:

```csharp
builder.Services.AddMemoryCache();
builder.Services.AddScoped<SprintRepository>();
builder.Services.AddScoped<ISprintRepository>(sp => new CachedSprintRepository(
    sp.GetRequiredService<SprintRepository>(),
    sp.GetRequiredService<IMemoryCache>()));
```

Everything else in the app (`ISprintService`, controllers) depends only on `ISprintRepository` and is unaware caching exists — classic Decorator pattern. Pass-through methods (`CreateAsync`, `GetByProjectIdAsync`, `GetByIdAsync`) just forward to the inner repository unchanged.

### The cache-aside read

```csharp
public Task<Sprint?> GetActiveSprintAsync(Guid projectId)
    => _cache.GetOrCreateAsync(SprintCacheKeys.ActiveSprint(projectId), entry =>
    {
        entry.AbsoluteExpirationRelativeToNow = CacheDuration; // 30 minutes
        return _inner.GetActiveSprintAsync(projectId);
    });
```

`IMemoryCache.GetOrCreateAsync` returns the cached entry if present, otherwise calls the factory (a real DB query), stores the result, and returns it. The 30-minute absolute expiration is a safety net, not the primary invalidation mechanism — see below.

### Write paths evict their own entry

```csharp
public async Task UpdateAsync(Sprint sprint)
{
    await _inner.UpdateAsync(sprint);
    _cache.Remove(SprintCacheKeys.ActiveSprint(sprint.ProjectId));
}
```

`UpdateAsync`, `DeleteAsync`, and `DeactivateAllAsync` all write through to the inner repository first, then remove the cache entry for that project. This means a read immediately after a write on the **same instance** always goes back to the database and gets the fresh value.

---

## Cache Key

[SprintCacheKeys](../backend/Repositories/SprintCacheKeys.cs) is the single source of truth for the key format:

```csharp
public static class SprintCacheKeys
{
    public static string ActiveSprint(Guid projectId) => $"sprint:active:{projectId}";
}
```

It's a separate static class (rather than a private constant on `CachedSprintRepository`) because two unrelated classes need to agree on the exact same string: the cache *writer/evictor* (`CachedSprintRepository`) and the cross-instance *evictor* (`SprintActiveChangeListener`, below). Centralizing it removes any risk of the two drifting out of sync.

---

## The Cross-Instance Problem

`IMemoryCache` is process-local. If the API is horizontally scaled (multiple instances behind a load balancer), each instance has its own independent cache. A write on instance A evicts A's entry — but instances B and C still hold the stale value until their 30-minute TTL expires.

This is solved without introducing a distributed cache (Redis, etc.), using PostgreSQL's `LISTEN`/`NOTIFY`:

```
Instance A                          PostgreSQL                       Instance B / C
──────────                          ──────────                       ───────────────
UpdateAsync(sprint)
  │
  ├─ writes row ──────────────────► AFTER INSERT/UPDATE/DELETE
  │                                  trigger fires
  │                                       │
  │                                       ▼
  │                                 pg_notify('sprint_active_changed',
  │                                            project_id)
  │                                       │
  ├─ evicts own cache entry              │
  │  (local IMemoryCache.Remove)         ▼
  │                                 every LISTENing instance
  │                                 receives the notification
  │                                       │
  │                                       ▼
  │                                 SprintActiveChangeListener
  │                                 evicts its own local entry
  ▼                                       ▼
cache miss next read              cache miss next read
→ fresh DB query                  → fresh DB query
```

### The DB trigger

[R__Sprint_active_changed_notify.sql](../backend/sql/R__Sprint_active_changed_notify.sql) is a Flyway repeatable migration that defines the trigger function and the trigger itself. Repeatable migrations (prefix `R__`) are re-applied automatically whenever their file changes, making them the right home for database objects like functions and triggers that can be replaced in place — unlike versioned migrations (`V__`) which run exactly once.

The trigger fires only when `GetActiveSprintAsync` could actually return a different result:

```sql
CREATE OR REPLACE FUNCTION notify_sprint_active_changed() RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.is_active)
    OR (TG_OP = 'DELETE' AND OLD.is_active)
    OR (TG_OP = 'UPDATE' AND (NEW.is_active OR OLD.is_active))
    THEN
        PERFORM pg_notify('sprint_active_changed', COALESCE(NEW.project_id, OLD.project_id)::text);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sprint_active_changed ON sprints;

CREATE TRIGGER trg_sprint_active_changed
    AFTER INSERT OR UPDATE OR DELETE ON sprints
    FOR EACH ROW
    EXECUTE FUNCTION notify_sprint_active_changed();
```

The three conditions:

| Operation | Condition | Why |
|---|---|---|
| `INSERT` | `NEW.is_active = true` | A new inactive sprint doesn't change the active one |
| `DELETE` | `OLD.is_active = true` | Deleting an inactive sprint changes nothing for the cache |
| `UPDATE` | `NEW.is_active OR OLD.is_active` | Catches activation/deactivation **and** any field change on an already-active sprint — the cached `Sprint` entity would otherwise hold stale data (e.g. an outdated name or end date) |

Because this lives at the database level, it fires for writes from any source — the API, a migration, an admin script, or a different service. The cache can never get out of sync with the database for longer than it takes a notification to propagate (effectively immediate).

### The listener

[SprintActiveChangeListener](../backend/BackgroundServices/SprintActiveChangeListener.cs) is a `BackgroundService` (hosted service, lives for the app's lifetime) that:

1. Opens its own dedicated `NpgsqlConnection` (see "Why its own connection" below) and runs `LISTEN sprint_active_changed;`.
2. Blocks on `connection.WaitAsync(...)` until a notification arrives.
3. On notification, parses the payload as the `projectId` and calls `_cache.Remove(SprintCacheKeys.ActiveSprint(projectId))` — evicting *this instance's* local entry.
4. If the connection drops, logs and reconnects after a 5-second delay, looping for the app's lifetime.

Every instance runs its own copy of this listener, so every instance independently evicts its own cache the moment any write happens anywhere.

### Why its own connection, not `AppDbContext`

`SprintActiveChangeListener` is registered as a singleton (all `IHostedService`s are). `AppDbContext` is scoped. Per [dbcontext-lifetimes-and-factory.md](dbcontext-lifetimes-and-factory.md), a singleton cannot hold a scoped dependency (captive dependency problem) — and a long-lived `LISTEN` connection wouldn't fit the request-scoped `DbContext` model anyway, since it needs to sit open and idle for the app's entire lifetime, not be created and disposed per request. So it opens a raw `NpgsqlConnection` from the connection string directly, used only for `LISTEN`/`NOTIFY`, entirely separate from EF Core.

---

## Why `AsNoTracking()` Matters Here

```csharp
public async Task<Sprint?> GetActiveSprintAsync(Guid projectId)
    // AsNoTracking: results may be cached (see CachedSprintRepository) and held across
    // requests, so they must never be attached to a later request's DbContext.
    => await _context.Sprints.AsNoTracking()
        .FirstOrDefaultAsync(s => s.ProjectId == projectId && s.IsActive);
```

Without `AsNoTracking()`, the returned `Sprint` entity would be attached to the `AppDbContext` (scoped, request-lifetime) that created it. The cache then holds a reference to that entity for up to 30 minutes — far longer than the `DbContext` that tracked it lives. A later request reusing that cached entity with a *different* `DbContext` would hit EF Core's tracking conflicts (an entity can only be tracked by one context at a time). `AsNoTracking()` returns a plain, detached object with no such lifetime coupling, which is a hard requirement for anything that gets cached across requests.

---

## Why No Distributed Cache Is Needed

A natural question: doesn't horizontal scaling usually mean you need Redis or similar for a shared cache?

Not here, because the invalidation problem and the storage problem are solved separately:

- **Storage**: each instance keeps its own fast, zero-network, zero-extra-infrastructure `IMemoryCache`.
- **Invalidation**: Postgres `LISTEN`/`NOTIFY` (a feature of the database already in use) fans out the "this changed" signal to every instance, since they all already hold a connection to the same database.

This avoids adding Redis (or another distributed cache) purely to keep N local caches in sync, at the cost of: (a) it only works for invalidation, not for sharing the actual cached *value* across instances — each instance still re-queries the DB on its own first miss; and (b) it depends on Postgres notifications being delivered, which is why the 30-minute absolute TTL safety net exists — if a notification is ever missed (e.g. during a reconnect window), staleness is bounded to at most 30 minutes rather than indefinite.

---

## Testing

[CachedSprintRepositoryTests](../backend/ProjectManagementSystem.Tests/Repositories/CachedSprintRepositoryTests.cs) covers `CachedSprintRepository` in isolation, using a real `MemoryCache` (not a mock — cheap and in-process, so faking it gains nothing) and an `ISprintRepository` substitute for the inner repository:

- First call to `GetActiveSprintAsync` hits the inner repository; the second call doesn't (cache hit).
- Different `projectId`s are cached independently.
- `UpdateAsync` / `DeleteAsync` / `DeactivateAllAsync` each delegate to the inner repository *and* evict the cache entry, verified by asserting a subsequent `GetActiveSprintAsync` re-queries the inner repository and returns the new value.
- The pure pass-through methods (`CreateAsync`, `GetByProjectIdAsync`, `GetByIdAsync`) simply delegate.

`SprintActiveChangeListener` is not yet covered by an automated test (it requires a live Postgres `LISTEN`/`NOTIFY` round trip), so correctness there currently relies on the trigger SQL and manual/integration verification.

---

## Summary

| Concern | Mechanism |
|---|---|
| What's cached | `GetActiveSprintAsync(projectId)` only |
| Cache store | `IMemoryCache`, per-instance, in-process |
| Cache key | `SprintCacheKeys.ActiveSprint(projectId)` → `sprint:active:{projectId}` |
| Same-instance invalidation | `CachedSprintRepository` evicts on `UpdateAsync`/`DeleteAsync`/`DeactivateAllAsync` |
| Cross-instance invalidation | Postgres trigger → `pg_notify` → `SprintActiveChangeListener` (`LISTEN`) → evicts local entry |
| Staleness safety net | 30-minute absolute expiration |
| Entity lifetime safety | `AsNoTracking()` so cached entities aren't bound to a disposed `DbContext` |
