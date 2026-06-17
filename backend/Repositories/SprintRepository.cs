using Microsoft.EntityFrameworkCore;
using ProjectManagementSystem.Data;
using ProjectManagementSystem.Data.Entities;

namespace ProjectManagementSystem.Repositories;

public class SprintRepository : ISprintRepository
{
    private readonly AppDbContext _context;

    public SprintRepository(AppDbContext context) => _context = context;

    public async Task<Sprint> CreateAsync(Sprint sprint)
    {
        _context.Sprints.Add(sprint);
        await _context.SaveChangesAsync();
        return sprint;
    }

    public async Task<IEnumerable<Sprint>> GetByProjectIdAsync(Guid projectId)
        => await _context.Sprints
            .Where(s => s.ProjectId == projectId)
            .OrderBy(s => s.CreatedAt)
            .ToListAsync();

    public async Task<Sprint?> GetByIdAsync(Guid sprintId)
        => await _context.Sprints.FindAsync(sprintId);

    public async Task<Sprint?> GetActiveSprintAsync(Guid projectId)
        // AsNoTracking: results may be cached (see CachedSprintRepository) and held across
        // requests, so they must never be attached to a later request's DbContext.
        => await _context.Sprints.AsNoTracking()
            .FirstOrDefaultAsync(s => s.ProjectId == projectId && s.IsActive);

    public async Task UpdateAsync(Sprint sprint)
    {
        _context.Sprints.Update(sprint);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Sprint sprint)
    {
        _context.Sprints.Remove(sprint);
        await _context.SaveChangesAsync();
    }

    public async Task DeactivateAllAsync(Guid projectId)
        => await _context.Sprints
            .Where(s => s.ProjectId == projectId && s.IsActive)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.IsActive, false));
}
