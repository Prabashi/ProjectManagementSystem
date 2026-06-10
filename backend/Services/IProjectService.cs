using ProjectManagementSystem.Models.Requests;
using ProjectManagementSystem.Models.Responses;

namespace ProjectManagementSystem.Services;

public interface IProjectService
{
    Task<ProjectResponse> CreateProjectAsync(CreateProjectRequest request, Guid createdByUserId);
    Task<IEnumerable<ProjectResponse>> GetUserProjectsAsync(Guid userId);
    Task<ProjectResponse> GetProjectByIdAsync(Guid projectId, Guid userId);
    Task AddMemberAsync(Guid projectId, Guid newUserId);
    Task<IEnumerable<ProjectMemberResponse>> GetProjectMembersAsync(Guid projectId, Guid userId);
}
