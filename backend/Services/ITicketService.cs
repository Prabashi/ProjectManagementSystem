using ProjectManagementSystem.Models.Requests;
using ProjectManagementSystem.Models.Responses;

namespace ProjectManagementSystem.Services;

public interface ITicketService
{
    Task<TicketResponse>              CreateTicketAsync(Guid projectId, Guid userId, CreateTicketRequest request);
    Task<IEnumerable<TicketResponse>> GetTicketsAsync(Guid projectId, Guid userId, Guid? sprintId = null);
    Task<TicketResponse>              GetTicketByIdAsync(Guid projectId, Guid ticketId, Guid userId);
    Task<TicketResponse>              UpdateTicketAsync(Guid projectId, Guid ticketId, Guid userId, UpdateTicketRequest request);
    Task                              DeleteTicketAsync(Guid projectId, Guid ticketId);
}
