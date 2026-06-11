using ProjectManagementSystem.Models.Requests;
using ProjectManagementSystem.Models.Responses;

namespace ProjectManagementSystem.Services;

public interface IDashboardService
{
    Task<DashboardResponse> GetDashboardAsync(Guid projectId, Guid userId);
    Task<DashboardResponse> CreateDashboardAsync(Guid projectId, Guid userId, CreateDashboardRequest request);
}
