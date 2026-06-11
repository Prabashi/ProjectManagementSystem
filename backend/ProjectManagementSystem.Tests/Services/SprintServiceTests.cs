using ProjectManagementSystem.Data.Entities;
using ProjectManagementSystem.Models.Requests;
using ProjectManagementSystem.Repositories;
using ProjectManagementSystem.Services;

namespace ProjectManagementSystem.Tests.Services;

public class SprintServiceTests
{
    private readonly ISprintRepository  _sprintRepository  = Substitute.For<ISprintRepository>();
    private readonly IProjectRepository _projectRepository = Substitute.For<IProjectRepository>();
    private readonly IProjectNotifier   _notifier          = Substitute.For<IProjectNotifier>();
    private readonly SprintService      _sut;

    private readonly Guid _projectId = Guid.NewGuid();
    private readonly Guid _sprintId  = Guid.NewGuid();
    private readonly Guid _userId    = Guid.NewGuid();

    public SprintServiceTests()
    {
        _sut = new SprintService(_sprintRepository, _projectRepository, _notifier);
    }

    // ── CreateSprintAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateSprintAsync_ValidProject_ReturnsSprint()
    {
        _projectRepository.GetByIdAsync(_projectId).Returns(new Project { Id = _projectId });
        _sprintRepository.CreateAsync(Arg.Any<Sprint>()).Returns(ci => ci.Arg<Sprint>());

        var result = await _sut.CreateSprintAsync(_projectId, new CreateSprintRequest("Sprint 1", null, null));

        result.Name.Should().Be("Sprint 1");
        result.ProjectId.Should().Be(_projectId);
        result.IsActive.Should().BeFalse();
    }

    [Fact]
    public async Task CreateSprintAsync_ProjectNotFound_ThrowsKeyNotFoundException()
    {
        _projectRepository.GetByIdAsync(_projectId).Returns((Project?)null);

        var act = () => _sut.CreateSprintAsync(_projectId, new CreateSprintRequest("Sprint 1", null, null));

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    // ── GetSprintsAsync ──────────────────────────────────────────────────────────

    [Fact]
    public async Task GetSprintsAsync_MemberUser_ReturnsSprints()
    {
        _projectRepository.GetByIdAsync(_projectId).Returns(new Project { Id = _projectId });
        _projectRepository.IsMemberAsync(_projectId, _userId).Returns(true);
        _sprintRepository.GetByProjectIdAsync(_projectId).Returns(new List<Sprint>
        {
            new() { Id = _sprintId, ProjectId = _projectId, Name = "Sprint 1", IsActive = false, CreatedAt = DateTime.UtcNow }
        });

        var result = await _sut.GetSprintsAsync(_projectId, _userId);

        result.Should().HaveCount(1);
        result.First().Name.Should().Be("Sprint 1");
    }

    [Fact]
    public async Task GetSprintsAsync_ProjectNotFound_ThrowsKeyNotFoundException()
    {
        _projectRepository.GetByIdAsync(_projectId).Returns((Project?)null);

        var act = () => _sut.GetSprintsAsync(_projectId, _userId);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task GetSprintsAsync_NonMember_ThrowsUnauthorizedAccessException()
    {
        _projectRepository.GetByIdAsync(_projectId).Returns(new Project { Id = _projectId });
        _projectRepository.IsMemberAsync(_projectId, _userId).Returns(false);

        var act = () => _sut.GetSprintsAsync(_projectId, _userId);

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    // ── GetSprintByIdAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task GetSprintByIdAsync_ValidRequest_ReturnsSprint()
    {
        _projectRepository.GetByIdAsync(_projectId).Returns(new Project { Id = _projectId });
        _projectRepository.IsMemberAsync(_projectId, _userId).Returns(true);
        _sprintRepository.GetByIdAsync(_sprintId).Returns(
            new Sprint { Id = _sprintId, ProjectId = _projectId, Name = "Sprint 1", IsActive = true, CreatedAt = DateTime.UtcNow });

        var result = await _sut.GetSprintByIdAsync(_projectId, _sprintId, _userId);

        result.Id.Should().Be(_sprintId);
        result.IsActive.Should().BeTrue();
    }

    [Fact]
    public async Task GetSprintByIdAsync_SprintBelongsToDifferentProject_ThrowsKeyNotFoundException()
    {
        var otherProjectId = Guid.NewGuid();
        _projectRepository.GetByIdAsync(_projectId).Returns(new Project { Id = _projectId });
        _projectRepository.IsMemberAsync(_projectId, _userId).Returns(true);
        _sprintRepository.GetByIdAsync(_sprintId).Returns(
            new Sprint { Id = _sprintId, ProjectId = otherProjectId, Name = "Sprint 1", IsActive = false, CreatedAt = DateTime.UtcNow });

        var act = () => _sut.GetSprintByIdAsync(_projectId, _sprintId, _userId);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    // ── SetActiveSprintAsync ────────────────────────────────────────────────────

    [Fact]
    public async Task SetActiveSprintAsync_ValidSprint_DeactivatesAllThenActivatesSprint()
    {
        _projectRepository.GetByIdAsync(_projectId).Returns(new Project { Id = _projectId });
        var sprint = new Sprint { Id = _sprintId, ProjectId = _projectId, Name = "Sprint 1", IsActive = false, CreatedAt = DateTime.UtcNow };
        _sprintRepository.GetByIdAsync(_sprintId).Returns(sprint);
        _sprintRepository.DeactivateAllAsync(_projectId).Returns(Task.CompletedTask);
        _sprintRepository.UpdateAsync(Arg.Any<Sprint>()).Returns(Task.CompletedTask);

        var result = await _sut.SetActiveSprintAsync(_projectId, _sprintId);

        result.IsActive.Should().BeTrue();
        await _sprintRepository.Received(1).DeactivateAllAsync(_projectId);
        await _sprintRepository.Received(1).UpdateAsync(Arg.Is<Sprint>(s => s.IsActive));
    }

    [Fact]
    public async Task SetActiveSprintAsync_SprintNotFound_ThrowsKeyNotFoundException()
    {
        _projectRepository.GetByIdAsync(_projectId).Returns(new Project { Id = _projectId });
        _sprintRepository.GetByIdAsync(_sprintId).Returns((Sprint?)null);

        var act = () => _sut.SetActiveSprintAsync(_projectId, _sprintId);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task SetActiveSprintAsync_SprintBelongsToDifferentProject_ThrowsKeyNotFoundException()
    {
        _projectRepository.GetByIdAsync(_projectId).Returns(new Project { Id = _projectId });
        _sprintRepository.GetByIdAsync(_sprintId).Returns(
            new Sprint { Id = _sprintId, ProjectId = Guid.NewGuid(), Name = "Sprint 1", IsActive = false, CreatedAt = DateTime.UtcNow });

        var act = () => _sut.SetActiveSprintAsync(_projectId, _sprintId);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    // ── DeleteSprintAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task DeleteSprintAsync_ValidSprint_DeletesSprint()
    {
        _projectRepository.GetByIdAsync(_projectId).Returns(new Project { Id = _projectId });
        var sprint = new Sprint { Id = _sprintId, ProjectId = _projectId, Name = "Sprint 1", IsActive = false, CreatedAt = DateTime.UtcNow };
        _sprintRepository.GetByIdAsync(_sprintId).Returns(sprint);
        _sprintRepository.DeleteAsync(sprint).Returns(Task.CompletedTask);

        await _sut.DeleteSprintAsync(_projectId, _sprintId);

        await _sprintRepository.Received(1).DeleteAsync(sprint);
    }

    [Fact]
    public async Task DeleteSprintAsync_SprintNotFound_ThrowsKeyNotFoundException()
    {
        _projectRepository.GetByIdAsync(_projectId).Returns(new Project { Id = _projectId });
        _sprintRepository.GetByIdAsync(_sprintId).Returns((Sprint?)null);

        var act = () => _sut.DeleteSprintAsync(_projectId, _sprintId);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task DeleteSprintAsync_SprintBelongsToDifferentProject_ThrowsKeyNotFoundException()
    {
        _projectRepository.GetByIdAsync(_projectId).Returns(new Project { Id = _projectId });
        _sprintRepository.GetByIdAsync(_sprintId).Returns(
            new Sprint { Id = _sprintId, ProjectId = Guid.NewGuid(), Name = "Sprint 1", IsActive = false, CreatedAt = DateTime.UtcNow });

        var act = () => _sut.DeleteSprintAsync(_projectId, _sprintId);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }
}
