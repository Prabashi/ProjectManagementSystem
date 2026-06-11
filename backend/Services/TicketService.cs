using ProjectManagementSystem.Data.Entities;
using ProjectManagementSystem.Models.Requests;
using ProjectManagementSystem.Models.Responses;
using ProjectManagementSystem.Repositories;

namespace ProjectManagementSystem.Services;

public class TicketService : ITicketService
{
    private readonly ITicketRepository  _ticketRepository;
    private readonly IProjectRepository _projectRepository;
    private readonly ISprintRepository  _sprintRepository;

    public TicketService(
        ITicketRepository  ticketRepository,
        IProjectRepository projectRepository,
        ISprintRepository  sprintRepository)
    {
        _ticketRepository  = ticketRepository;
        _projectRepository = projectRepository;
        _sprintRepository  = sprintRepository;
    }

    public async Task<TicketResponse> CreateTicketAsync(
        Guid projectId, Guid userId, CreateTicketRequest request)
    {
        _ = await _projectRepository.GetByIdAsync(projectId)
            ?? throw new KeyNotFoundException($"Project {projectId} not found.");

        if (!await _projectRepository.IsMemberAsync(projectId, userId))
            throw new UnauthorizedAccessException("You are not a member of this project.");

        if (request.SprintId.HasValue)
        {
            var sprint = await _sprintRepository.GetByIdAsync(request.SprintId.Value)
                ?? throw new KeyNotFoundException($"Sprint {request.SprintId} not found.");
            if (sprint.ProjectId != projectId)
                throw new KeyNotFoundException($"Sprint {request.SprintId} does not belong to this project.");
        }

        if (request.AssigneeId.HasValue &&
            !await _projectRepository.IsMemberAsync(projectId, request.AssigneeId.Value))
            throw new InvalidOperationException("Assignee is not a member of this project.");

        var boardOrder = await _ticketRepository.GetMaxBoardOrderAsync(projectId, request.Status) + 1;

        var ticket = new Ticket
        {
            Id              = Guid.NewGuid(),
            ProjectId       = projectId,
            SprintId        = request.SprintId,
            Subject         = request.Subject,
            Description     = request.Description,
            Estimate        = request.Estimate,
            AssigneeId      = request.AssigneeId,
            Status          = request.Status,
            BoardOrder      = boardOrder,
            CreatedByUserId = userId,
            CreatedAt       = DateTime.UtcNow,
            UpdatedAt       = DateTime.UtcNow
        };

        await _ticketRepository.CreateAsync(ticket);
        return ToResponse(ticket);
    }

    public async Task<IEnumerable<TicketResponse>> GetTicketsAsync(
        Guid projectId, Guid userId, Guid? sprintId = null)
    {
        _ = await _projectRepository.GetByIdAsync(projectId)
            ?? throw new KeyNotFoundException($"Project {projectId} not found.");

        if (!await _projectRepository.IsMemberAsync(projectId, userId))
            throw new UnauthorizedAccessException("You are not a member of this project.");

        var tickets = await _ticketRepository.GetByProjectIdAsync(projectId, sprintId);
        return tickets.Select(ToResponse);
    }

    public async Task<TicketResponse> GetTicketByIdAsync(
        Guid projectId, Guid ticketId, Guid userId)
    {
        _ = await _projectRepository.GetByIdAsync(projectId)
            ?? throw new KeyNotFoundException($"Project {projectId} not found.");

        if (!await _projectRepository.IsMemberAsync(projectId, userId))
            throw new UnauthorizedAccessException("You are not a member of this project.");

        var ticket = await _ticketRepository.GetByIdAsync(ticketId)
            ?? throw new KeyNotFoundException($"Ticket {ticketId} not found.");

        if (ticket.ProjectId != projectId)
            throw new KeyNotFoundException($"Ticket {ticketId} not found in project {projectId}.");

        return ToResponse(ticket);
    }

    public async Task<TicketResponse> UpdateTicketAsync(
        Guid projectId, Guid ticketId, Guid userId, UpdateTicketRequest request)
    {
        _ = await _projectRepository.GetByIdAsync(projectId)
            ?? throw new KeyNotFoundException($"Project {projectId} not found.");

        if (!await _projectRepository.IsMemberAsync(projectId, userId))
            throw new UnauthorizedAccessException("You are not a member of this project.");

        var ticket = await _ticketRepository.GetByIdAsync(ticketId)
            ?? throw new KeyNotFoundException($"Ticket {ticketId} not found.");

        if (ticket.ProjectId != projectId)
            throw new KeyNotFoundException($"Ticket {ticketId} not found in project {projectId}.");

        if (request.SprintId.HasValue)
        {
            var sprint = await _sprintRepository.GetByIdAsync(request.SprintId.Value)
                ?? throw new KeyNotFoundException($"Sprint {request.SprintId} not found.");
            if (sprint.ProjectId != projectId)
                throw new KeyNotFoundException($"Sprint {request.SprintId} does not belong to this project.");
        }

        if (request.AssigneeId.HasValue &&
            !await _projectRepository.IsMemberAsync(projectId, request.AssigneeId.Value))
            throw new InvalidOperationException("Assignee is not a member of this project.");

        if (ticket.Status != request.Status)
        {
            ticket.BoardOrder = await _ticketRepository.GetMaxBoardOrderAsync(projectId, request.Status) + 1;
        }

        ticket.Subject     = request.Subject;
        ticket.Description = request.Description;
        ticket.Estimate    = request.Estimate;
        ticket.AssigneeId  = request.AssigneeId;
        ticket.SprintId    = request.SprintId;
        ticket.Status      = request.Status;
        ticket.UpdatedAt   = DateTime.UtcNow;

        await _ticketRepository.UpdateAsync(ticket);
        return ToResponse(ticket);
    }

    public async Task<TicketResponse> MoveTicketAsync(
        Guid projectId, Guid ticketId, Guid userId, MoveTicketRequest request)
    {
        _ = await _projectRepository.GetByIdAsync(projectId)
            ?? throw new KeyNotFoundException($"Project {projectId} not found.");

        if (!await _projectRepository.IsMemberAsync(projectId, userId))
            throw new UnauthorizedAccessException("You are not a member of this project.");

        var ticket = await _ticketRepository.GetByIdAsync(ticketId)
            ?? throw new KeyNotFoundException($"Ticket {ticketId} not found.");

        if (ticket.ProjectId != projectId)
            throw new KeyNotFoundException($"Ticket {ticketId} not found in project {projectId}.");

        if (ticket.Status != request.Status)
            ticket.BoardOrder = await _ticketRepository.GetMaxBoardOrderAsync(projectId, request.Status) + 1;

        ticket.Status    = request.Status;
        ticket.UpdatedAt = DateTime.UtcNow;

        await _ticketRepository.UpdateAsync(ticket);
        return ToResponse(ticket);
    }

    public async Task DeleteTicketAsync(Guid projectId, Guid ticketId)
    {
        _ = await _projectRepository.GetByIdAsync(projectId)
            ?? throw new KeyNotFoundException($"Project {projectId} not found.");

        var ticket = await _ticketRepository.GetByIdAsync(ticketId)
            ?? throw new KeyNotFoundException($"Ticket {ticketId} not found.");

        if (ticket.ProjectId != projectId)
            throw new KeyNotFoundException($"Ticket {ticketId} not found in project {projectId}.");

        await _ticketRepository.DeleteAsync(ticket);
    }

    private static TicketResponse ToResponse(Ticket t) =>
        new(t.Id, t.ProjectId, t.SprintId, t.Subject, t.Description, t.Estimate,
            t.AssigneeId, t.Assignee?.Username, t.Status, t.BoardOrder,
            t.CreatedByUserId, t.CreatedAt, t.UpdatedAt);
}
