using ProjectManagementSystem.Data.Entities;
using ProjectManagementSystem.Models.Requests;
using ProjectManagementSystem.Repositories;
using ProjectManagementSystem.Services;

namespace ProjectManagementSystem.Tests.Services;

public class DashboardServiceTests
{
    private readonly IDashboardRepository _dashboardRepository = Substitute.For<IDashboardRepository>();
    private readonly IProjectRepository   _projectRepository   = Substitute.For<IProjectRepository>();
    private readonly ISprintRepository    _sprintRepository    = Substitute.For<ISprintRepository>();
    private readonly ITicketRepository    _ticketRepository    = Substitute.For<ITicketRepository>();
    private readonly DashboardService     _sut;

    private readonly Guid _projectId   = Guid.NewGuid();
    private readonly Guid _dashboardId = Guid.NewGuid();
    private readonly Guid _sprintId    = Guid.NewGuid();
    private readonly Guid _ticketId    = Guid.NewGuid();
    private readonly Guid _userId      = Guid.NewGuid();

    public DashboardServiceTests()
    {
        _sut = new DashboardService(_dashboardRepository, _projectRepository, _sprintRepository, _ticketRepository);
    }

    // ── GetDashboardAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task GetDashboardAsync_NoActiveSprint_ReturnsEmptyTickets()
    {
        _projectRepository.GetByIdAsync(_projectId).Returns(new Project { Id = _projectId });
        _projectRepository.IsMemberAsync(_projectId, _userId).Returns(true);
        _dashboardRepository.GetByProjectIdAsync(_projectId).Returns(
            new Dashboard { Id = _dashboardId, ProjectId = _projectId, Name = "Board",
                            CreatedByUserId = _userId, CreatedAt = DateTime.UtcNow });
        _sprintRepository.GetActiveSprintAsync(_projectId).Returns((Sprint?)null);

        var result = await _sut.GetDashboardAsync(_projectId, _userId);

        result.ActiveSprintId.Should().BeNull();
        result.Tickets.Should().BeEmpty();
        await _ticketRepository.DidNotReceive().GetByProjectIdAsync(Arg.Any<Guid>(), Arg.Any<Guid?>());
    }

    [Fact]
    public async Task GetDashboardAsync_WithActiveSprint_ReturnsSprintTickets()
    {
        _projectRepository.GetByIdAsync(_projectId).Returns(new Project { Id = _projectId });
        _projectRepository.IsMemberAsync(_projectId, _userId).Returns(true);
        _dashboardRepository.GetByProjectIdAsync(_projectId).Returns(
            new Dashboard { Id = _dashboardId, ProjectId = _projectId, Name = "Board",
                            CreatedByUserId = _userId, CreatedAt = DateTime.UtcNow });
        _sprintRepository.GetActiveSprintAsync(_projectId).Returns(
            new Sprint { Id = _sprintId, ProjectId = _projectId, Name = "S1",
                         IsActive = true, CreatedAt = DateTime.UtcNow });
        _ticketRepository.GetByProjectIdAsync(_projectId, _sprintId).Returns(new List<Ticket>
        {
            new() { Id = _ticketId, ProjectId = _projectId, SprintId = _sprintId, Subject = "Bug",
                    Status = "ToDo", BoardOrder = 0, CreatedByUserId = _userId,
                    CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
        });

        var result = await _sut.GetDashboardAsync(_projectId, _userId);

        result.ActiveSprintId.Should().Be(_sprintId);
        result.Tickets.Should().HaveCount(1);
        result.Tickets.First().Subject.Should().Be("Bug");
    }

    [Fact]
    public async Task GetDashboardAsync_ProjectNotFound_ThrowsKeyNotFoundException()
    {
        _projectRepository.GetByIdAsync(_projectId).Returns((Project?)null);

        var act = () => _sut.GetDashboardAsync(_projectId, _userId);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task GetDashboardAsync_NotMember_ThrowsUnauthorizedAccessException()
    {
        _projectRepository.GetByIdAsync(_projectId).Returns(new Project { Id = _projectId });
        _projectRepository.IsMemberAsync(_projectId, _userId).Returns(false);

        var act = () => _sut.GetDashboardAsync(_projectId, _userId);

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task GetDashboardAsync_DashboardNotFound_ThrowsKeyNotFoundException()
    {
        _projectRepository.GetByIdAsync(_projectId).Returns(new Project { Id = _projectId });
        _projectRepository.IsMemberAsync(_projectId, _userId).Returns(true);
        _dashboardRepository.GetByProjectIdAsync(_projectId).Returns((Dashboard?)null);

        var act = () => _sut.GetDashboardAsync(_projectId, _userId);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    // ── CreateDashboardAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task CreateDashboardAsync_Success_ReturnsDashboard()
    {
        _projectRepository.GetByIdAsync(_projectId).Returns(new Project { Id = _projectId });
        _projectRepository.IsMemberAsync(_projectId, _userId).Returns(true);
        _dashboardRepository.GetByProjectIdAsync(_projectId).Returns((Dashboard?)null);
        _dashboardRepository.CreateAsync(Arg.Any<Dashboard>()).Returns(ci => ci.Arg<Dashboard>());

        var result = await _sut.CreateDashboardAsync(_projectId, _userId,
            new CreateDashboardRequest("Sprint Board"));

        result.Name.Should().Be("Sprint Board");
        result.ProjectId.Should().Be(_projectId);
        result.ActiveSprintId.Should().BeNull();
        result.Tickets.Should().BeEmpty();
    }

    [Fact]
    public async Task CreateDashboardAsync_ProjectNotFound_ThrowsKeyNotFoundException()
    {
        _projectRepository.GetByIdAsync(_projectId).Returns((Project?)null);

        var act = () => _sut.CreateDashboardAsync(_projectId, _userId,
            new CreateDashboardRequest("Board"));

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task CreateDashboardAsync_NotMember_ThrowsUnauthorizedAccessException()
    {
        _projectRepository.GetByIdAsync(_projectId).Returns(new Project { Id = _projectId });
        _projectRepository.IsMemberAsync(_projectId, _userId).Returns(false);

        var act = () => _sut.CreateDashboardAsync(_projectId, _userId,
            new CreateDashboardRequest("Board"));

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task CreateDashboardAsync_DashboardAlreadyExists_ThrowsInvalidOperationException()
    {
        _projectRepository.GetByIdAsync(_projectId).Returns(new Project { Id = _projectId });
        _projectRepository.IsMemberAsync(_projectId, _userId).Returns(true);
        _dashboardRepository.GetByProjectIdAsync(_projectId).Returns(
            new Dashboard { Id = _dashboardId, ProjectId = _projectId, Name = "Existing",
                            CreatedByUserId = _userId, CreatedAt = DateTime.UtcNow });

        var act = () => _sut.CreateDashboardAsync(_projectId, _userId,
            new CreateDashboardRequest("Duplicate"));

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("A dashboard already exists for this project.");
    }
}
