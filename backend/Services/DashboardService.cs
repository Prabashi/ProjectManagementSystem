using ProjectManagementSystem.Data.Entities;
using ProjectManagementSystem.Models.Requests;
using ProjectManagementSystem.Models.Responses;
using ProjectManagementSystem.Repositories;

namespace ProjectManagementSystem.Services;

public class DashboardService : IDashboardService
{
    private readonly IDashboardRepository _dashboardRepository;
    private readonly IProjectRepository   _projectRepository;
    private readonly ISprintRepository    _sprintRepository;
    private readonly ITicketRepository    _ticketRepository;

    public DashboardService(
        IDashboardRepository dashboardRepository,
        IProjectRepository   projectRepository,
        ISprintRepository    sprintRepository,
        ITicketRepository    ticketRepository)
    {
        _dashboardRepository = dashboardRepository;
        _projectRepository   = projectRepository;
        _sprintRepository    = sprintRepository;
        _ticketRepository    = ticketRepository;
    }

    public async Task<DashboardResponse> GetDashboardAsync(Guid projectId, Guid userId)
    {
        _ = await _projectRepository.GetByIdAsync(projectId)
            ?? throw new KeyNotFoundException($"Project {projectId} not found.");

        if (!await _projectRepository.IsMemberAsync(projectId, userId))
            throw new UnauthorizedAccessException("You are not a member of this project.");

        var dashboard = await _dashboardRepository.GetByProjectIdAsync(projectId)
            ?? throw new KeyNotFoundException($"No dashboard found for project {projectId}.");

        var activeSprint = await _sprintRepository.GetActiveSprintAsync(projectId);

        IEnumerable<Ticket> tickets = [];
        if (activeSprint != null)
            tickets = await _ticketRepository.GetByProjectIdAsync(projectId, activeSprint.Id);

        return ToResponse(dashboard, activeSprint?.Id, tickets);
    }

    public async Task<DashboardResponse> CreateDashboardAsync(
        Guid projectId, Guid userId, CreateDashboardRequest request)
    {
        _ = await _projectRepository.GetByIdAsync(projectId)
            ?? throw new KeyNotFoundException($"Project {projectId} not found.");

        if (!await _projectRepository.IsMemberAsync(projectId, userId))
            throw new UnauthorizedAccessException("You are not a member of this project.");

        if (await _dashboardRepository.GetByProjectIdAsync(projectId) != null)
            throw new InvalidOperationException("A dashboard already exists for this project.");

        var dashboard = new Dashboard
        {
            Id              = Guid.NewGuid(),
            ProjectId       = projectId,
            Name            = request.Name,
            CreatedByUserId = userId,
            CreatedAt       = DateTime.UtcNow
        };

        await _dashboardRepository.CreateAsync(dashboard);
        return ToResponse(dashboard, null, []);
    }

    private static DashboardResponse ToResponse(
        Dashboard dashboard, Guid? activeSprintId, IEnumerable<Ticket> tickets) =>
        new(dashboard.Id, dashboard.ProjectId, dashboard.Name, dashboard.CreatedByUserId,
            dashboard.CreatedAt, activeSprintId,
            tickets.Select(t => new TicketResponse(
                t.Id, t.ProjectId, t.SprintId, t.Subject, t.Description, t.Estimate,
                t.AssigneeId, t.Assignee?.Username, t.Status, t.BoardOrder,
                t.CreatedByUserId, t.CreatedAt, t.UpdatedAt)));
}
