using ProjectManagementSystem.Data.Entities;

namespace ProjectManagementSystem.Repositories;

public interface IDashboardRepository
{
    Task<Dashboard?>  GetByProjectIdAsync(Guid projectId);
    Task<Dashboard>   CreateAsync(Dashboard dashboard);
}
