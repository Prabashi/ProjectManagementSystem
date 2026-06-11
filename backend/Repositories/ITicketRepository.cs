using ProjectManagementSystem.Data.Entities;

namespace ProjectManagementSystem.Repositories;

public interface ITicketRepository
{
    Task<Ticket>              CreateAsync(Ticket ticket);
    Task<IEnumerable<Ticket>> GetByProjectIdAsync(Guid projectId, Guid? sprintId = null);
    Task<Ticket?>             GetByIdAsync(Guid ticketId);
    Task                      UpdateAsync(Ticket ticket);
    Task                      DeleteAsync(Ticket ticket);
    Task<int>                 GetMaxBoardOrderAsync(Guid projectId, string status);
}
