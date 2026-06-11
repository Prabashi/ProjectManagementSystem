using ProjectManagementSystem.Data.Entities;

namespace ProjectManagementSystem.Repositories;

public interface ISprintRepository
{
    Task<Sprint>               CreateAsync(Sprint sprint);
    Task<IEnumerable<Sprint>>  GetByProjectIdAsync(Guid projectId);
    Task<Sprint?>              GetByIdAsync(Guid sprintId);
    Task                       UpdateAsync(Sprint sprint);
    Task                       DeleteAsync(Sprint sprint);
    Task                       DeactivateAllAsync(Guid projectId);
}
