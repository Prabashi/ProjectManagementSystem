using ProjectManagementSystem.Models.Requests;
using ProjectManagementSystem.Models.Responses;

namespace ProjectManagementSystem.Services;

public interface IAuthService
{
    Task<UserResponse> RegisterAsync(RegisterRequest request);
    Task<(UserResponse User, string Token)> LoginAsync(LoginRequest request);
}
