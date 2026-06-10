using FluentAssertions;
using NSubstitute;
using ProjectManagementSystem.Data.Entities;
using ProjectManagementSystem.Repositories;
using ProjectManagementSystem.Services;

namespace ProjectManagementSystem.Tests.Services;

public class UserServiceTests
{
    private readonly IUserRepository _userRepo = Substitute.For<IUserRepository>();
    private readonly UserService     _sut;

    public UserServiceTests() => _sut = new UserService(_userRepo);

    [Fact]
    public async Task GetAllUsersAsync_ReturnsAllUsersAsResponses()
    {
        var users = new[]
        {
            new User { Id = Guid.NewGuid(), Username = "alice", Role = "Admin",  PasswordHash = "h" },
            new User { Id = Guid.NewGuid(), Username = "bob",   Role = "User",   PasswordHash = "h" }
        };
        _userRepo.GetAllAsync().Returns(users);

        var result = await _sut.GetAllUsersAsync();

        result.Should().HaveCount(2);
        result.Should().ContainSingle(u => u.Username == "alice" && u.Role == "Admin");
        result.Should().ContainSingle(u => u.Username == "bob"   && u.Role == "User");
    }

    [Fact]
    public async Task GetAllUsersAsync_ReturnsEmptyList_WhenNoUsersExist()
    {
        _userRepo.GetAllAsync().Returns([]);

        var result = await _sut.GetAllUsersAsync();

        result.Should().BeEmpty();
    }
}
