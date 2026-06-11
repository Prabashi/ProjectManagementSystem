using Microsoft.EntityFrameworkCore;
using ProjectManagementSystem.Data;
using ProjectManagementSystem.Data.Entities;

namespace ProjectManagementSystem.Repositories;

public class TicketRepository : ITicketRepository
{
    private readonly AppDbContext _context;

    public TicketRepository(AppDbContext context) => _context = context;

    public async Task<Ticket> CreateAsync(Ticket ticket)
    {
        _context.Tickets.Add(ticket);
        await _context.SaveChangesAsync();
        return ticket;
    }

    public async Task<IEnumerable<Ticket>> GetByProjectIdAsync(Guid projectId, Guid? sprintId = null)
    {
        var query = _context.Tickets
            .Include(t => t.Assignee)
            .Where(t => t.ProjectId == projectId);

        if (sprintId.HasValue)
            query = query.Where(t => t.SprintId == sprintId);

        return await query
            .OrderBy(t => t.Status)
            .ThenBy(t => t.BoardOrder)
            .ToListAsync();
    }

    public async Task<Ticket?> GetByIdAsync(Guid ticketId)
        => await _context.Tickets
            .Include(t => t.Assignee)
            .FirstOrDefaultAsync(t => t.Id == ticketId);

    public async Task UpdateAsync(Ticket ticket)
    {
        _context.Tickets.Update(ticket);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Ticket ticket)
    {
        _context.Tickets.Remove(ticket);
        await _context.SaveChangesAsync();
    }

    public async Task<int> GetMaxBoardOrderAsync(Guid projectId, string status)
    {
        var max = await _context.Tickets
            .Where(t => t.ProjectId == projectId && t.Status == status)
            .MaxAsync(t => (int?)t.BoardOrder);
        return max ?? -1;
    }
}
