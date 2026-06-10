using ProjectManagementSystem.Data.Entities;

namespace ProjectManagementSystem.Services;

public interface ITokenService
{
    string GenerateToken(User user);
}
