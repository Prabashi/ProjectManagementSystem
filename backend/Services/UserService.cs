using ProjectManagementSystem.Models.Responses;
using ProjectManagementSystem.Repositories;

namespace ProjectManagementSystem.Services;

public class UserService : IUserService
{
    private readonly IUserRepository _userRepository;

    public UserService(IUserRepository userRepository) => _userRepository = userRepository;

    public async Task<IEnumerable<UserResponse>> GetAllUsersAsync()
    {
        var users = await _userRepository.GetAllAsync();
        return users.Select(u => new UserResponse(u.Id, u.Username, u.Role));
    }
}
