using ProjectManagementSystem.Models.Requests;
using ProjectManagementSystem.Models.Responses;

namespace ProjectManagementSystem.Services;

public interface ISprintService
{
    Task<SprintResponse>              CreateSprintAsync(Guid projectId, CreateSprintRequest request);
    Task<IEnumerable<SprintResponse>> GetSprintsAsync(Guid projectId, Guid userId);
    Task<SprintResponse>              GetSprintByIdAsync(Guid projectId, Guid sprintId, Guid userId);
    Task<SprintResponse>              SetActiveSprintAsync(Guid projectId, Guid sprintId);
    Task                              DeleteSprintAsync(Guid projectId, Guid sprintId);
}
