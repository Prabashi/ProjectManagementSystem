using ProjectManagementSystem.Data.Entities;

namespace ProjectManagementSystem.Repositories;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(Guid id);
    Task<User?> GetByUsernameAsync(string username);
    Task<bool> UsernameExistsAsync(string username);
    Task<User> CreateAsync(User user);
    Task<IEnumerable<User>> GetAllAsync();
}
