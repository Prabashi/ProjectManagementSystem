using ProjectManagementSystem.Data.Entities;
using ProjectManagementSystem.Models.Requests;
using ProjectManagementSystem.Models.Responses;
using ProjectManagementSystem.Repositories;

namespace ProjectManagementSystem.Services;

public class SprintService : ISprintService
{
    private readonly ISprintRepository  _sprintRepository;
    private readonly IProjectRepository _projectRepository;
    private readonly IProjectNotifier   _notifier;

    public SprintService(
        ISprintRepository  sprintRepository,
        IProjectRepository projectRepository,
        IProjectNotifier   notifier)
    {
        _sprintRepository  = sprintRepository;
        _projectRepository = projectRepository;
        _notifier          = notifier;
    }

    public async Task<SprintResponse> CreateSprintAsync(Guid projectId, CreateSprintRequest request)
    {
        _ = await _projectRepository.GetByIdAsync(projectId)
            ?? throw new KeyNotFoundException($"Project {projectId} not found.");

        var sprint = new Sprint
        {
            Id        = Guid.NewGuid(),
            ProjectId = projectId,
            Name      = request.Name,
            StartDate = request.StartDate,
            EndDate   = request.EndDate,
            IsActive  = false,
            CreatedAt = DateTime.UtcNow
        };

        await _sprintRepository.CreateAsync(sprint);
        return ToResponse(sprint);
    }

    public async Task<IEnumerable<SprintResponse>> GetSprintsAsync(Guid projectId, Guid userId)
    {
        _ = await _projectRepository.GetByIdAsync(projectId)
            ?? throw new KeyNotFoundException($"Project {projectId} not found.");

        if (!await _projectRepository.IsMemberAsync(projectId, userId))
            throw new UnauthorizedAccessException("You are not a member of this project.");

        var sprints = await _sprintRepository.GetByProjectIdAsync(projectId);
        return sprints.Select(ToResponse);
    }

    public async Task<SprintResponse> GetSprintByIdAsync(Guid projectId, Guid sprintId, Guid userId)
    {
        _ = await _projectRepository.GetByIdAsync(projectId)
            ?? throw new KeyNotFoundException($"Project {projectId} not found.");

        if (!await _projectRepository.IsMemberAsync(projectId, userId))
            throw new UnauthorizedAccessException("You are not a member of this project.");

        var sprint = await _sprintRepository.GetByIdAsync(sprintId)
            ?? throw new KeyNotFoundException($"Sprint {sprintId} not found.");

        if (sprint.ProjectId != projectId)
            throw new KeyNotFoundException($"Sprint {sprintId} not found in project {projectId}.");

        return ToResponse(sprint);
    }

    public async Task<SprintResponse> SetActiveSprintAsync(Guid projectId, Guid sprintId)
    {
        _ = await _projectRepository.GetByIdAsync(projectId)
            ?? throw new KeyNotFoundException($"Project {projectId} not found.");

        var sprint = await _sprintRepository.GetByIdAsync(sprintId)
            ?? throw new KeyNotFoundException($"Sprint {sprintId} not found.");

        if (sprint.ProjectId != projectId)
            throw new KeyNotFoundException($"Sprint {sprintId} not found in project {projectId}.");

        await _sprintRepository.DeactivateAllAsync(projectId);
        sprint.IsActive = true;
        await _sprintRepository.UpdateAsync(sprint);
        var response = ToResponse(sprint);
        await _notifier.SprintChangedAsync(projectId, response);
        return response;
    }

    public async Task DeleteSprintAsync(Guid projectId, Guid sprintId)
    {
        _ = await _projectRepository.GetByIdAsync(projectId)
            ?? throw new KeyNotFoundException($"Project {projectId} not found.");

        var sprint = await _sprintRepository.GetByIdAsync(sprintId)
            ?? throw new KeyNotFoundException($"Sprint {sprintId} not found.");

        if (sprint.ProjectId != projectId)
            throw new KeyNotFoundException($"Sprint {sprintId} not found in project {projectId}.");

        await _sprintRepository.DeleteAsync(sprint);
    }

    private static SprintResponse ToResponse(Sprint s) =>
        new(s.Id, s.ProjectId, s.Name, s.StartDate, s.EndDate, s.IsActive, s.CreatedAt);
}
