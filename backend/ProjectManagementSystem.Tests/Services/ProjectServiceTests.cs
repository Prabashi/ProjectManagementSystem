using FluentAssertions;
using NSubstitute;
using NSubstitute.ReturnsExtensions;
using ProjectManagementSystem.Data.Entities;
using ProjectManagementSystem.Models.Requests;
using ProjectManagementSystem.Repositories;
using ProjectManagementSystem.Services;

namespace ProjectManagementSystem.Tests.Services;

public class ProjectServiceTests
{
    private readonly IProjectRepository _projectRepo = Substitute.For<IProjectRepository>();
    private readonly IUserRepository    _userRepo    = Substitute.For<IUserRepository>();
    private readonly ProjectService     _sut;

    public ProjectServiceTests() => _sut = new ProjectService(_projectRepo, _userRepo);

    // ── CreateProjectAsync ────────────────────────────────────────────────────

    [Fact]
    public async Task CreateProjectAsync_ReturnsProjectResponseWithCorrectData()
    {
        var userId  = Guid.NewGuid();
        var request = new CreateProjectRequest("Alpha", "First project");
        _projectRepo.CreateAsync(Arg.Any<Project>())
                    .Returns(ci => ci.Arg<Project>());
        _projectRepo.AddMemberAsync(Arg.Any<ProjectMember>())
                    .Returns(ci => ci.Arg<ProjectMember>());

        var result = await _sut.CreateProjectAsync(request, userId);

        result.Name.Should().Be("Alpha");
        result.Description.Should().Be("First project");
        result.CreatedByUserId.Should().Be(userId);
    }

    [Fact]
    public async Task CreateProjectAsync_AutomaticallyAddsCreatorAsMember()
    {
        var userId = Guid.NewGuid();
        _projectRepo.CreateAsync(Arg.Any<Project>()).Returns(ci => ci.Arg<Project>());
        _projectRepo.AddMemberAsync(Arg.Any<ProjectMember>()).Returns(ci => ci.Arg<ProjectMember>());

        await _sut.CreateProjectAsync(new CreateProjectRequest("Beta", null), userId);

        await _projectRepo.Received(1)
            .AddMemberAsync(Arg.Is<ProjectMember>(m => m.UserId == userId));
    }

    // ── GetUserProjectsAsync ──────────────────────────────────────────────────

    [Fact]
    public async Task GetUserProjectsAsync_ReturnsProjectsForUser()
    {
        var userId   = Guid.NewGuid();
        var projects = new[] { new Project { Id = Guid.NewGuid(), Name = "P1", CreatedByUserId = userId, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow } };
        _projectRepo.GetByUserIdAsync(userId).Returns(projects);

        var result = await _sut.GetUserProjectsAsync(userId);

        result.Should().HaveCount(1).And.ContainSingle(p => p.Name == "P1");
    }

    // ── GetProjectByIdAsync ───────────────────────────────────────────────────

    [Fact]
    public async Task GetProjectByIdAsync_ReturnProject_WhenUserIsMember()
    {
        var projectId = Guid.NewGuid();
        var userId    = Guid.NewGuid();
        var project   = new Project { Id = projectId, Name = "Gamma", CreatedByUserId = userId, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        _projectRepo.GetByIdAsync(projectId).Returns(project);
        _projectRepo.IsMemberAsync(projectId, userId).Returns(true);

        var result = await _sut.GetProjectByIdAsync(projectId, userId);

        result.Id.Should().Be(projectId);
    }

    [Fact]
    public async Task GetProjectByIdAsync_ThrowsKeyNotFoundException_WhenProjectDoesNotExist()
    {
        _projectRepo.GetByIdAsync(Arg.Any<Guid>()).ReturnsNull();

        await _sut.Invoking(s => s.GetProjectByIdAsync(Guid.NewGuid(), Guid.NewGuid()))
                  .Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task GetProjectByIdAsync_ThrowsUnauthorizedAccessException_WhenUserIsNotMember()
    {
        var projectId = Guid.NewGuid();
        _projectRepo.GetByIdAsync(projectId).Returns(new Project { Id = projectId, CreatedByUserId = Guid.NewGuid(), CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        _projectRepo.IsMemberAsync(projectId, Arg.Any<Guid>()).Returns(false);

        await _sut.Invoking(s => s.GetProjectByIdAsync(projectId, Guid.NewGuid()))
                  .Should().ThrowAsync<UnauthorizedAccessException>();
    }

    // ── AddMemberAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task AddMemberAsync_AddsMember_WhenAllConditionsMet()
    {
        var projectId = Guid.NewGuid();
        var newUserId = Guid.NewGuid();
        _projectRepo.GetByIdAsync(projectId).Returns(new Project { Id = projectId, CreatedByUserId = Guid.NewGuid(), CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        _userRepo.GetByIdAsync(newUserId).Returns(new User { Id = newUserId, Username = "bob", Role = "User", PasswordHash = "h" });
        _projectRepo.IsMemberAsync(projectId, newUserId).Returns(false);
        _projectRepo.AddMemberAsync(Arg.Any<ProjectMember>()).Returns(ci => ci.Arg<ProjectMember>());

        await _sut.AddMemberAsync(projectId, newUserId);

        await _projectRepo.Received(1)
            .AddMemberAsync(Arg.Is<ProjectMember>(m => m.UserId == newUserId && m.ProjectId == projectId));
    }

    [Fact]
    public async Task AddMemberAsync_ThrowsKeyNotFoundException_WhenProjectDoesNotExist()
    {
        _projectRepo.GetByIdAsync(Arg.Any<Guid>()).ReturnsNull();

        await _sut.Invoking(s => s.AddMemberAsync(Guid.NewGuid(), Guid.NewGuid()))
                  .Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task AddMemberAsync_ThrowsKeyNotFoundException_WhenUserDoesNotExist()
    {
        var projectId = Guid.NewGuid();
        _projectRepo.GetByIdAsync(projectId).Returns(new Project { Id = projectId, CreatedByUserId = Guid.NewGuid(), CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        _userRepo.GetByIdAsync(Arg.Any<Guid>()).ReturnsNull();

        await _sut.Invoking(s => s.AddMemberAsync(projectId, Guid.NewGuid()))
                  .Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task AddMemberAsync_ThrowsInvalidOperationException_WhenAlreadyMember()
    {
        var projectId = Guid.NewGuid();
        var userId    = Guid.NewGuid();
        _projectRepo.GetByIdAsync(projectId).Returns(new Project { Id = projectId, CreatedByUserId = Guid.NewGuid(), CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        _userRepo.GetByIdAsync(userId).Returns(new User { Id = userId, Username = "alice", Role = "User", PasswordHash = "h" });
        _projectRepo.IsMemberAsync(projectId, userId).Returns(true);

        await _sut.Invoking(s => s.AddMemberAsync(projectId, userId))
                  .Should().ThrowAsync<InvalidOperationException>();
    }

    // ── GetProjectMembersAsync ────────────────────────────────────────────────

    [Fact]
    public async Task GetProjectMembersAsync_ReturnsMembers_WhenUserIsMember()
    {
        var projectId = Guid.NewGuid();
        var userId    = Guid.NewGuid();
        var user      = new User { Id = Guid.NewGuid(), Username = "carol", Role = "User", PasswordHash = "h" };
        var members   = new[] { new ProjectMember { ProjectId = projectId, UserId = user.Id, AddedAt = DateTime.UtcNow, User = user } };
        _projectRepo.IsMemberAsync(projectId, userId).Returns(true);
        _projectRepo.GetMembersAsync(projectId).Returns(members);

        var result = await _sut.GetProjectMembersAsync(projectId, userId);

        result.Should().HaveCount(1).And.ContainSingle(m => m.Username == "carol");
    }

    [Fact]
    public async Task GetProjectMembersAsync_ThrowsUnauthorizedAccessException_WhenUserIsNotMember()
    {
        var projectId = Guid.NewGuid();
        _projectRepo.IsMemberAsync(projectId, Arg.Any<Guid>()).Returns(false);

        await _sut.Invoking(s => s.GetProjectMembersAsync(projectId, Guid.NewGuid()))
                  .Should().ThrowAsync<UnauthorizedAccessException>();
    }
}
