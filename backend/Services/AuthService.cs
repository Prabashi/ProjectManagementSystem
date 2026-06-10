using ProjectManagementSystem.Data.Entities;
using ProjectManagementSystem.Models.Requests;
using ProjectManagementSystem.Models.Responses;
using ProjectManagementSystem.Repositories;

namespace ProjectManagementSystem.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly ITokenService _tokenService;

    public AuthService(IUserRepository userRepository, ITokenService tokenService)
    {
        _userRepository = userRepository;
        _tokenService = tokenService;
    }

    public async Task<UserResponse> RegisterAsync(RegisterRequest request)
    {
        if (await _userRepository.UsernameExistsAsync(request.Username))
            throw new InvalidOperationException("Username is already taken.");

        var user = new User
        {
            Id           = Guid.NewGuid(),
            Username     = request.Username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role         = request.Role,
            CreatedAt    = DateTime.UtcNow
        };

        var created = await _userRepository.CreateAsync(user);
        return new UserResponse(created.Id, created.Username, created.Role);
    }

    public async Task<(UserResponse User, string Token)> LoginAsync(LoginRequest request)
    {
        var user = await _userRepository.GetByUsernameAsync(request.Username)
            ?? throw new UnauthorizedAccessException("Invalid username or password.");

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("Invalid username or password.");

        var token = _tokenService.GenerateToken(user);
        return (new UserResponse(user.Id, user.Username, user.Role), token);
    }
}
