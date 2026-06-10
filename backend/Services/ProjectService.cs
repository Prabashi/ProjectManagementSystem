using ProjectManagementSystem.Data.Entities;
using ProjectManagementSystem.Models.Requests;
using ProjectManagementSystem.Models.Responses;
using ProjectManagementSystem.Repositories;

namespace ProjectManagementSystem.Services;

public class ProjectService : IProjectService
{
    private readonly IProjectRepository _projectRepository;
    private readonly IUserRepository    _userRepository;

    public ProjectService(IProjectRepository projectRepository, IUserRepository userRepository)
    {
        _projectRepository = projectRepository;
        _userRepository    = userRepository;
    }

    public async Task<ProjectResponse> CreateProjectAsync(CreateProjectRequest request, Guid createdByUserId)
    {
        var project = new Project
        {
            Name              = request.Name,
            Description       = request.Description,
            CreatedByUserId   = createdByUserId,
            CreatedAt         = DateTime.UtcNow,
            UpdatedAt         = DateTime.UtcNow
        };

        await _projectRepository.CreateAsync(project);

        await _projectRepository.AddMemberAsync(new ProjectMember
        {
            ProjectId = project.Id,
            UserId    = createdByUserId,
            AddedAt   = DateTime.UtcNow
        });

        return ToResponse(project);
    }

    public async Task<IEnumerable<ProjectResponse>> GetUserProjectsAsync(Guid userId)
    {
        var projects = await _projectRepository.GetByUserIdAsync(userId);
        return projects.Select(ToResponse);
    }

    public async Task<ProjectResponse> GetProjectByIdAsync(Guid projectId, Guid userId)
    {
        var project = await _projectRepository.GetByIdAsync(projectId)
            ?? throw new KeyNotFoundException($"Project {projectId} not found.");

        if (!await _projectRepository.IsMemberAsync(projectId, userId))
            throw new UnauthorizedAccessException("You are not a member of this project.");

        return ToResponse(project);
    }

    public async Task AddMemberAsync(Guid projectId, Guid newUserId)
    {
        _ = await _projectRepository.GetByIdAsync(projectId)
            ?? throw new KeyNotFoundException($"Project {projectId} not found.");

        var userToAdd = await _userRepository.GetByIdAsync(newUserId)
            ?? throw new KeyNotFoundException($"User {newUserId} not found.");

        if (await _projectRepository.IsMemberAsync(projectId, newUserId))
            throw new InvalidOperationException($"User '{userToAdd.Username}' is already a member of this project.");

        await _projectRepository.AddMemberAsync(new ProjectMember
        {
            ProjectId = projectId,
            UserId    = newUserId,
            AddedAt   = DateTime.UtcNow
        });
    }

    public async Task<IEnumerable<ProjectMemberResponse>> GetProjectMembersAsync(Guid projectId, Guid userId)
    {
        if (!await _projectRepository.IsMemberAsync(projectId, userId))
            throw new UnauthorizedAccessException("You are not a member of this project.");

        var members = await _projectRepository.GetMembersAsync(projectId);
        return members.Select(m => new ProjectMemberResponse(m.UserId, m.User.Username, m.User.Role, m.AddedAt));
    }

    private static ProjectResponse ToResponse(Project p) =>
        new(p.Id, p.Name, p.Description, p.CreatedByUserId, p.CreatedAt, p.UpdatedAt);
}
