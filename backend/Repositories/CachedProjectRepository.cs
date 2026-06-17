using Microsoft.Extensions.Caching.Distributed;
using ProjectManagementSystem.Caching;
using ProjectManagementSystem.Data.Entities;

namespace ProjectManagementSystem.Repositories;

public class CachedProjectRepository(IProjectRepository inner, IDistributedCache cache)
    : IProjectRepository
{
    private static readonly DistributedCacheEntryOptions MembershipOptions = new()
    {
        AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5)
    };

    public Task<Project> CreateAsync(Project project) => inner.CreateAsync(project);
    public Task<Project?> GetByIdAsync(Guid id) => inner.GetByIdAsync(id);
    public Task<IEnumerable<Project>> GetByUserIdAsync(Guid userId) => inner.GetByUserIdAsync(userId);
    public Task<IEnumerable<ProjectMember>> GetMembersAsync(Guid projectId) => inner.GetMembersAsync(projectId);

    public async Task<bool> IsMemberAsync(Guid projectId, Guid userId)
    {
        var key    = ProjectCacheKeys.IsMember(projectId, userId);
        var cached = await cache.GetStringAsync(key);
        if (cached is not null)
            return cached == "true";

        var result = await inner.IsMemberAsync(projectId, userId);
        await cache.SetStringAsync(key, result ? "true" : "false", MembershipOptions);
        return result;
    }

    public async Task<ProjectMember> AddMemberAsync(ProjectMember member)
    {
        var result = await inner.AddMemberAsync(member);
        await cache.RemoveAsync(ProjectCacheKeys.IsMember(member.ProjectId, member.UserId));
        return result;
    }
}
