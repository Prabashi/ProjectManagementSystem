namespace ProjectManagementSystem.Repositories;

/// <summary>
/// Single source of truth for the active-sprint cache key format, shared by
/// <see cref="CachedSprintRepository"/> (which populates/evicts the cache) and
/// <see cref="ProjectManagementSystem.BackgroundServices.SprintActiveChangeListener"/>
/// (which evicts it in response to cross-instance NOTIFY events).
/// </summary>
public static class SprintCacheKeys
{
    public static string ActiveSprint(Guid projectId) => $"sprint:active:{projectId}";
}
