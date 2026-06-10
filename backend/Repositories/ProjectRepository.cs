using Microsoft.EntityFrameworkCore;
using ProjectManagementSystem.Data;
using ProjectManagementSystem.Data.Entities;

namespace ProjectManagementSystem.Repositories;

public class ProjectRepository : IProjectRepository
{
    private readonly AppDbContext _context;

    public ProjectRepository(AppDbContext context) => _context = context;

    public async Task<Project> CreateAsync(Project project)
    {
        _context.Projects.Add(project);
        await _context.SaveChangesAsync();
        return project;
    }

    public async Task<Project?> GetByIdAsync(Guid id) =>
        await _context.Projects.FindAsync(id);

    public async Task<IEnumerable<Project>> GetByUserIdAsync(Guid userId) =>
        await _context.Projects
            .Where(p => p.ProjectMembers.Any(m => m.UserId == userId))
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

    public async Task<ProjectMember> AddMemberAsync(ProjectMember member)
    {
        _context.ProjectMembers.Add(member);
        await _context.SaveChangesAsync();
        return member;
    }

    public async Task<bool> IsMemberAsync(Guid projectId, Guid userId) =>
        await _context.ProjectMembers
            .AnyAsync(m => m.ProjectId == projectId && m.UserId == userId);

    public async Task<IEnumerable<ProjectMember>> GetMembersAsync(Guid projectId) =>
        await _context.ProjectMembers
            .Include(m => m.User)
            .Where(m => m.ProjectId == projectId)
            .ToListAsync();
}
