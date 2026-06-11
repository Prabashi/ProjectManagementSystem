using ProjectManagementSystem.Models.Responses;

namespace ProjectManagementSystem.Services;

public interface IProjectNotifier
{
    Task TicketCreatedAsync(Guid projectId, TicketResponse ticket);
    Task TicketUpdatedAsync(Guid projectId, TicketResponse ticket);
    Task TicketDeletedAsync(Guid projectId, Guid ticketId);
    Task SprintChangedAsync(Guid projectId, SprintResponse sprint);
}
