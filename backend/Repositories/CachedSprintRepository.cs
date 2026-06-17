using Microsoft.Extensions.Caching.Memory;
using ProjectManagementSystem.Data.Entities;

namespace ProjectManagementSystem.Repositories;

/// <summary>
/// Decorates <see cref="ISprintRepository"/> with an in-memory cache-aside layer over
/// <see cref="GetActiveSprintAsync"/> — the one read that's both hot (hit on every dashboard
/// load) and cheap to keep correct, since only three writes can ever change which sprint is
/// active for a project.
///
/// Each writer here evicts its own process's cache entry immediately. Eviction on *other*
/// horizontally-scaled instances is handled separately by
/// <see cref="ProjectManagementSystem.BackgroundServices.SprintActiveChangeListener"/>, which
/// reacts to a PostgreSQL NOTIFY raised by a DB trigger (see
/// sql/V6__Add_sprint_active_changed_notify.sql) — so this class never needs a distributed
/// cache to stay consistent across instances. A short absolute expiration is kept as a safety
/// net regardless.
/// </summary>
public class CachedSprintRepository : ISprintRepository
{
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(30);

    private readonly ISprintRepository _inner;
    private readonly IMemoryCache _cache;

    public CachedSprintRepository(ISprintRepository inner, IMemoryCache cache)
    {
        _inner = inner;
        _cache = cache;
    }

    public Task<Sprint> CreateAsync(Sprint sprint) => _inner.CreateAsync(sprint);

    public Task<IEnumerable<Sprint>> GetByProjectIdAsync(Guid projectId) => _inner.GetByProjectIdAsync(projectId);

    public Task<Sprint?> GetByIdAsync(Guid sprintId) => _inner.GetByIdAsync(sprintId);

    public Task<Sprint?> GetActiveSprintAsync(Guid projectId)
        => _cache.GetOrCreateAsync(SprintCacheKeys.ActiveSprint(projectId), entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = CacheDuration;
            return _inner.GetActiveSprintAsync(projectId);
        });

    public async Task UpdateAsync(Sprint sprint)
    {
        await _inner.UpdateAsync(sprint);
        _cache.Remove(SprintCacheKeys.ActiveSprint(sprint.ProjectId));
    }

    public async Task DeleteAsync(Sprint sprint)
    {
        await _inner.DeleteAsync(sprint);
        _cache.Remove(SprintCacheKeys.ActiveSprint(sprint.ProjectId));
    }

    public async Task DeactivateAllAsync(Guid projectId)
    {
        await _inner.DeactivateAllAsync(projectId);
        _cache.Remove(SprintCacheKeys.ActiveSprint(projectId));
    }
}
