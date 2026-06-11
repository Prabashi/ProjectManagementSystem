using Microsoft.EntityFrameworkCore;
using ProjectManagementSystem.Data;
using ProjectManagementSystem.Data.Entities;

namespace ProjectManagementSystem.Repositories;

public class DashboardRepository : IDashboardRepository
{
    private readonly AppDbContext _context;

    public DashboardRepository(AppDbContext context) => _context = context;

    public async Task<Dashboard?> GetByProjectIdAsync(Guid projectId)
        => await _context.Dashboards.FirstOrDefaultAsync(d => d.ProjectId == projectId);

    public async Task<Dashboard> CreateAsync(Dashboard dashboard)
    {
        _context.Dashboards.Add(dashboard);
        await _context.SaveChangesAsync();
        return dashboard;
    }
}
