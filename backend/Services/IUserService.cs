using ProjectManagementSystem.Models.Responses;

namespace ProjectManagementSystem.Services;

public interface IUserService
{
    Task<IEnumerable<UserResponse>> GetAllUsersAsync();
}
