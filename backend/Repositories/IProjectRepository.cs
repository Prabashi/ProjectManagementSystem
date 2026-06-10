using ProjectManagementSystem.Data.Entities;

namespace ProjectManagementSystem.Repositories;

public interface IProjectRepository
{
    Task<Project> CreateAsync(Project project);
    Task<Project?> GetByIdAsync(Guid id);
    Task<IEnumerable<Project>> GetByUserIdAsync(Guid userId);
    Task<ProjectMember> AddMemberAsync(ProjectMember member);
    Task<bool> IsMemberAsync(Guid projectId, Guid userId);
    Task<IEnumerable<ProjectMember>> GetMembersAsync(Guid projectId);
}
