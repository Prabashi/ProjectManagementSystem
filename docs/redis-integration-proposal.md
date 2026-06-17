# Redis Integration Proposal

This document identifies where Redis adds concrete value in this project, explains why each use case is a good fit, and describes the implementation approach for each. It is a forward-looking design document — the current system does not use Redis.

---

## Summary of Use Cases

| Priority | Use Case | Problem Solved |
|---|---|---|
| 1 | **SignalR backplane** | Real-time messages silently lost under horizontal scale |
| 2 | **Distributed cache (active sprint)** | Per-instance `IMemoryCache` + pg `LISTEN/NOTIFY` complexity |
| 3 | **JWT revocation blocklist** | No way to invalidate a token before expiry |
| 4 | **`IsMemberAsync` cache** | Hot-path DB hit on every hub connect and dashboard load |

---

## Use Case 1 — SignalR Redis Backplane (Highest Priority)

### The Problem

[ProjectHub](../backend/Hubs/ProjectHub.cs) puts clients into SignalR groups (`project-{id}`) and [SignalRProjectNotifier](../backend/Services/SignalRProjectNotifier.cs) broadcasts ticket events to those groups. With a single instance this works. With multiple instances behind a load balancer, group membership is process-local:

```
Client A connected to Instance 1 → JoinProject("abc")
Client B connected to Instance 2 → JoinProject("abc")

Ticket created → event sent to Instance 1's hub
                 Instance 1 delivers to Client A ✓
                 Instance 2 never receives the event → Client B sees nothing ✗
```

This is a silent correctness failure — no errors are logged, and the feature appears to work in development (single instance) but breaks in any scaled deployment.

### The Fix: AddStackExchangeRedis

The entire fix is one call in [Program.cs](../backend/Program.cs):

```csharp
builder.Services
    .AddSignalR()
    .AddStackExchangeRedis(connectionString, options =>
    {
        options.Configuration.ChannelPrefix = RedisChannel.Literal("pms");
    });
```

Redis pub/sub becomes the backplane: when any instance calls `Clients.Group(...).SendAsync(...)`, Redis fans the message out to every other instance, which then delivers it to their locally connected clients.

**No changes to `ProjectHub` or `SignalRProjectNotifier` are needed** — they depend only on `IHubContext<ProjectHub>`, which is already the right abstraction.

### NuGet Package

```
Microsoft.AspNetCore.SignalR.StackExchangeRedis
```

---

## Use Case 2 — Distributed Cache for Active Sprint

### The Current Design

[CachedSprintRepository](../backend/Repositories/CachedSprintRepository.cs) caches `GetActiveSprintAsync` using `IMemoryCache`. Because `IMemoryCache` is per-process, a write on one instance evicts only that instance's entry. Cross-instance invalidation is handled by a Postgres `LISTEN/NOTIFY` trigger driving [SprintActiveChangeListener](../backend/BackgroundServices/SprintActiveChangeListener.cs).

This works correctly and is documented in [sprint-active-cache.md](sprint-active-cache.md). It was deliberately chosen over Redis to avoid an external dependency.

### Why Redis Improves This

With Redis as a shared `IDistributedCache`:

- All instances read from and write to the same cache entry.
- A write (eviction) on any instance immediately removes the shared entry — every other instance gets a cache miss on its next read and re-queries the DB.
- `SprintActiveChangeListener` becomes unnecessary and can be deleted.
- The Flyway repeatable migration `R__Sprint_active_changed_notify.sql` becomes unnecessary and can be dropped.

The **Decorator pattern** in `CachedSprintRepository` stays unchanged. Only the cache backing store changes from `IMemoryCache` to `IDistributedCache`.

### Implementation Sketch

**1. Register `IDistributedCache` backed by Redis:**

```csharp
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = builder.Configuration.GetConnectionString("Redis");
    options.InstanceName = "pms:";
});
```

**2. Rewrite `CachedSprintRepository` to use `IDistributedCache`:**

`IDistributedCache` works with `byte[]`, so the `Sprint` entity needs to be serialized. Use `System.Text.Json`:

```csharp
public class CachedSprintRepository(ISprintRepository inner, IDistributedCache cache)
    : ISprintRepository
{
    private static readonly DistributedCacheEntryOptions CacheOptions = new()
    {
        AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(30)
    };

    public async Task<Sprint?> GetActiveSprintAsync(Guid projectId)
    {
        var key  = SprintCacheKeys.ActiveSprint(projectId);
        var json = await cache.GetStringAsync(key);

        if (json is not null)
            return JsonSerializer.Deserialize<Sprint>(json);

        var sprint = await inner.GetActiveSprintAsync(projectId);
        var value  = JsonSerializer.Serialize(sprint); // null → "null" is valid
        await cache.SetStringAsync(key, value, CacheOptions);
        return sprint;
    }

    public async Task UpdateAsync(Sprint sprint)
    {
        await inner.UpdateAsync(sprint);
        await cache.RemoveAsync(SprintCacheKeys.ActiveSprint(sprint.ProjectId));
    }

    // DeleteAsync, DeactivateAllAsync: same pattern — write inner, then RemoveAsync
    // CreateAsync, GetByProjectIdAsync, GetByIdAsync: pass-through unchanged
}
```

**3. Remove the background service and trigger:**

- Delete `SprintActiveChangeListener.cs`
- Remove its registration from `Program.cs`
- Drop `R__Sprint_active_changed_notify.sql` (or replace with a `DROP TRIGGER` / `DROP FUNCTION` migration to clean the DB)

**4. Note on `IDistributedCache` vs `IMemoryCache` serialization:**

`IMemoryCache` can store any object reference. `IDistributedCache` stores bytes — the entity must be serializable. All EF Core scaffolded entities are plain POCOs so `System.Text.Json` handles them; verify there are no circular navigation references on `Sprint` before committing to this approach.

### NuGet Package

```
Microsoft.Extensions.Caching.StackExchangeRedis
```

---

## Use Case 3 — JWT Revocation Blocklist

### The Problem

[TokenService](../backend/Services/TokenService.cs) generates JWTs valid for the configured `ExpiryHours`. There is no logout endpoint. Once issued, a token is valid until expiry — a stolen token cannot be invalidated, and a user cannot terminate their own session.

The token already includes a `jti` (JWT ID) claim via `JwtRegisteredClaimNames.Jti`. This is the hook for revocation.

### The Design

**On logout:** store the `jti` in Redis with a TTL equal to the token's remaining lifetime.

**On every authenticated request:** middleware checks whether the incoming token's `jti` is in the blocklist. If it is, reject with `401`.

```
Redis key: blocklist:{jti}
Value:     "1" (presence is the signal; value doesn't matter)
TTL:       token's remaining lifetime (so Redis self-cleans expired entries)
```

### Implementation Sketch

**1. Logout endpoint** (`POST /auth/logout`, `[Authorize]`):

```csharp
[HttpPost("logout")]
[Authorize]
public async Task<IActionResult> Logout()
{
    var jti     = User.FindFirstValue(JwtRegisteredClaimNames.Jti)!;
    var expClaim = User.FindFirstValue(JwtRegisteredClaimNames.Exp)!;
    var exp     = DateTimeOffset.FromUnixTimeSeconds(long.Parse(expClaim));
    var ttl     = exp - DateTimeOffset.UtcNow;

    if (ttl > TimeSpan.Zero)
        await _cache.SetStringAsync(
            $"blocklist:{jti}",
            "1",
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = ttl });

    return NoContent();
}
```

**2. Revocation middleware** (runs after `UseAuthentication`):

```csharp
app.Use(async (context, next) =>
{
    if (context.User.Identity?.IsAuthenticated == true)
    {
        var jti   = context.User.FindFirstValue(JwtRegisteredClaimNames.Jti);
        var cache = context.RequestServices.GetRequiredService<IDistributedCache>();

        if (jti is not null && await cache.GetStringAsync($"blocklist:{jti}") is not null)
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return;
        }
    }
    await next();
});
```

**Key properties of this design:**

- Redis TTL matches the token's remaining lifetime — the blocklist self-cleans; no cron job needed.
- A revoked token issued on instance A is also rejected on instance B (shared Redis).
- Zero DB reads on the revocation check path.
- Tokens that are already expired never need to be added to the blocklist.

---

## Use Case 4 — `IsMemberAsync` Cache (Optional)

### The Problem

`IProjectRepository.IsMemberAsync(projectId, userId)` is called:

- On every `JoinProject` call in [ProjectHub](../backend/Hubs/ProjectHub.cs)
- On every `GetDashboardAsync` call in [DashboardService](../backend/Services/DashboardService.cs)

Both are hot paths. The result changes only when `AddMemberAsync` is called, which is infrequent.

### Design Considerations

Unlike the active sprint cache, membership has a **security implication**: a false positive (cached `true` for a user who was removed) would grant unauthorized access. For this reason:

- **Do not rely on explicit invalidation alone** — use a short TTL (e.g., 5 minutes) as the primary mechanism.
- Explicit eviction on `AddMemberAsync` is a nice-to-have optimization (avoids a 5-minute wait for newly-added members to gain access).
- There is no `RemoveMemberAsync` in the current `IProjectRepository` — if member removal is added later, it must also evict the cache entry.

### Implementation Sketch

A `CachedProjectRepository` decorator on `IProjectRepository`, analogous to `CachedSprintRepository`:

```csharp
// Cache key: "project:member:{projectId}:{userId}"
public async Task<bool> IsMemberAsync(Guid projectId, Guid userId)
{
    var key    = $"project:member:{projectId}:{userId}";
    var cached = await _cache.GetStringAsync(key);
    if (cached is not null) return cached == "true";

    var result = await _inner.IsMemberAsync(projectId, userId);
    await _cache.SetStringAsync(key, result ? "true" : "false",
        new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5)
        });
    return result;
}
```

**Recommendation:** Implement this after the first three use cases are stable, once the Redis infrastructure is already in place. The short TTL keeps security risk low.

---

## Infrastructure Changes

### docker-compose.yml (dev)

Add a Redis service alongside the existing `db` and `migrate` services:

```yaml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 5s
    timeout: 3s
    retries: 5
```

### docker-compose.fullstack.yml (E2E / CI / production)

Same Redis service block. The API service should depend on it:

```yaml
api:
  depends_on:
    redis:
      condition: service_healthy
```

### Connection string

Add to `appsettings.json`:

```json
"ConnectionStrings": {
  "Redis": "localhost:6379"
}
```

Override in `appsettings.Docker.json` (and environment-specific config) with the appropriate hostname (`redis:6379` inside Docker Compose).

### NuGet packages (backend)

```
StackExchange.Redis
Microsoft.Extensions.Caching.StackExchangeRedis
Microsoft.AspNetCore.SignalR.StackExchangeRedis
```

---

## Recommended Migration Path

Implement in phases to keep each change reviewable and testable independently:

| Phase | Change | Risk |
|---|---|---|
| 1 | Add Redis to docker-compose; wire SignalR backplane | Low — `ProjectHub` code unchanged; only registration changes |
| 2 | Replace `IMemoryCache` with `IDistributedCache` in `CachedSprintRepository`; retire `SprintActiveChangeListener` and pg trigger | Medium — entity serialization must be verified; integration-test with live Redis |
| 3 | JWT revocation: logout endpoint + middleware | Medium — middleware ordering matters; must run after `UseAuthentication` |
| 4 | `IsMemberAsync` cache decorator | Low — short TTL limits blast radius; no correctness dependency on explicit eviction |

Phase 1 can be merged independently and is the highest-value change to make first given the current SignalR correctness gap under horizontal scaling.

---

## What Redis Does Not Change

- **Data ownership**: PostgreSQL remains the source of truth. Redis holds only derived/computed values and ephemeral state (revoked JTIs). No writes go to Redis that don't already have a corresponding PostgreSQL record.
- **Auth mechanism**: JWT-based authentication is unchanged. Redis adds revocation on top of it.
- **Repository interfaces**: `ISprintRepository`, `IProjectRepository`, and all others remain the same. Caching is invisible to callers — the Decorator pattern contains it.
- **EF Core and migrations**: unaffected. Flyway still owns the schema. The only migration-related change is dropping the now-unnecessary pg trigger.
