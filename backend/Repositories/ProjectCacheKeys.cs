namespace ProjectManagementSystem.Repositories;

public static class ProjectCacheKeys
{
    public static string IsMember(Guid projectId, Guid userId) => $"project:member:{projectId}:{userId}";
}
