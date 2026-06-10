using ProjectManagementSystem.Data.Entities;
using ProjectManagementSystem.Models.Requests;
using ProjectManagementSystem.Repositories;
using ProjectManagementSystem.Services;

namespace ProjectManagementSystem.Tests.Services;

public class AuthServiceTests
{
    private readonly IUserRepository _userRepository = Substitute.For<IUserRepository>();
    private readonly ITokenService   _tokenService   = Substitute.For<ITokenService>();
    private readonly AuthService     _sut;

    public AuthServiceTests()
    {
        _sut = new AuthService(_userRepository, _tokenService);
    }

    // ── Register ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task RegisterAsync_NewUsername_ReturnsUserResponse()
    {
        _userRepository.UsernameExistsAsync("alice").Returns(false);
        _userRepository.CreateAsync(Arg.Any<User>())
            .Returns(ci => ci.Arg<User>());

        var result = await _sut.RegisterAsync(new RegisterRequest("alice", "Password1!", "User"));

        result.Username.Should().Be("alice");
        result.Role.Should().Be("User");
        result.Id.Should().NotBeEmpty();
    }

    [Fact]
    public async Task RegisterAsync_ExistingUsername_ThrowsInvalidOperationException()
    {
        _userRepository.UsernameExistsAsync("alice").Returns(true);

        var act = () => _sut.RegisterAsync(new RegisterRequest("alice", "Password1!", "User"));

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Username is already taken.");
    }

    [Fact]
    public async Task RegisterAsync_PasswordIsHashed_NotStoredAsPlainText()
    {
        _userRepository.UsernameExistsAsync(Arg.Any<string>()).Returns(false);
        User? capturedUser = null;
        _userRepository.CreateAsync(Arg.Do<User>(u => capturedUser = u))
            .Returns(ci => ci.Arg<User>());

        await _sut.RegisterAsync(new RegisterRequest("bob", "PlainTextPass!", "Admin"));

        capturedUser!.PasswordHash.Should().NotBe("PlainTextPass!");
        BCrypt.Net.BCrypt.Verify("PlainTextPass!", capturedUser.PasswordHash).Should().BeTrue();
    }

    // ── Login ─────────────────────────────────────────────────────────────────

    [Fact]
    public async Task LoginAsync_ValidCredentials_ReturnsUserAndToken()
    {
        var user = new User
        {
            Id           = Guid.NewGuid(),
            Username     = "alice",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password1!"),
            Role         = "User"
        };
        _userRepository.GetByUsernameAsync("alice").Returns(user);
        _tokenService.GenerateToken(user).Returns("jwt-token");

        var (userResponse, token) = await _sut.LoginAsync(new LoginRequest("alice", "Password1!"));

        userResponse.Username.Should().Be("alice");
        token.Should().Be("jwt-token");
    }

    [Fact]
    public async Task LoginAsync_NonExistentUsername_ThrowsUnauthorizedAccessException()
    {
        _userRepository.GetByUsernameAsync("ghost").Returns((User?)null);

        var act = () => _sut.LoginAsync(new LoginRequest("ghost", "any"));

        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("Invalid username or password.");
    }

    [Fact]
    public async Task LoginAsync_WrongPassword_ThrowsUnauthorizedAccessException()
    {
        var user = new User
        {
            Id           = Guid.NewGuid(),
            Username     = "alice",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("CorrectPass!"),
            Role         = "User"
        };
        _userRepository.GetByUsernameAsync("alice").Returns(user);

        var act = () => _sut.LoginAsync(new LoginRequest("alice", "WrongPass!"));

        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("Invalid username or password.");
    }
}
