using ProjectManagementSystem.Data.Entities;
using ProjectManagementSystem.Models.Requests;
using ProjectManagementSystem.Repositories;
using ProjectManagementSystem.Services;

namespace ProjectManagementSystem.Tests.Services;

public class TicketServiceTests
{
    private readonly ITicketRepository  _ticketRepository  = Substitute.For<ITicketRepository>();
    private readonly IProjectRepository _projectRepository = Substitute.For<IProjectRepository>();
    private readonly ISprintRepository  _sprintRepository  = Substitute.For<ISprintRepository>();
    private readonly TicketService      _sut;

    private readonly Guid _projectId = Guid.NewGuid();
    private readonly Guid _ticketId  = Guid.NewGuid();
    private readonly Guid _userId    = Guid.NewGuid();
    private readonly Guid _sprintId  = Guid.NewGuid();

    public TicketServiceTests()
    {
        _sut = new TicketService(_ticketRepository, _projectRepository, _sprintRepository);
    }

    // ── CreateTicketAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateTicketAsync_ValidRequest_ReturnsTicket()
    {
        _projectRepository.GetByIdAsync(_projectId).Returns(new Project { Id = _projectId });
        _projectRepository.IsMemberAsync(_projectId, _userId).Returns(true);
        _ticketRepository.GetMaxBoardOrderAsync(_projectId, "ToDo").Returns(2);
        _ticketRepository.CreateAsync(Arg.Any<Ticket>()).Returns(ci => ci.Arg<Ticket>());

        var result = await _sut.CreateTicketAsync(_projectId, _userId,
            new CreateTicketRequest("Fix bug", null, null, null, null, "ToDo"));

        result.Subject.Should().Be("Fix bug");
        result.Status.Should().Be("ToDo");
        result.BoardOrder.Should().Be(3);
        result.ProjectId.Should().Be(_projectId);
    }

    [Fact]
    public async Task CreateTicketAsync_ProjectNotFound_ThrowsKeyNotFoundException()
    {
        _projectRepository.GetByIdAsync(_projectId).Returns((Project?)null);

        var act = () => _sut.CreateTicketAsync(_projectId, _userId,
            new CreateTicketRequest("Fix bug", null, null, null, null, "ToDo"));

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task CreateTicketAsync_RequesterNotMember_ThrowsUnauthorizedAccessException()
    {
        _projectRepository.GetByIdAsync(_projectId).Returns(new Project { Id = _projectId });
        _projectRepository.IsMemberAsync(_projectId, _userId).Returns(false);

        var act = () => _sut.CreateTicketAsync(_projectId, _userId,
            new CreateTicketRequest("Fix bug", null, null, null, null, "ToDo"));

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task CreateTicketAsync_SprintNotInProject_ThrowsKeyNotFoundException()
    {
        _projectRepository.GetByIdAsync(_projectId).Returns(new Project { Id = _projectId });
        _projectRepository.IsMemberAsync(_projectId, _userId).Returns(true);
        _sprintRepository.GetByIdAsync(_sprintId).Returns(
            new Sprint { Id = _sprintId, ProjectId = Guid.NewGuid(), Name = "S1", CreatedAt = DateTime.UtcNow });

        var act = () => _sut.CreateTicketAsync(_projectId, _userId,
            new CreateTicketRequest("Fix bug", null, null, null, _sprintId, "ToDo"));

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task CreateTicketAsync_AssigneeNotMember_ThrowsInvalidOperationException()
    {
        var assigneeId = Guid.NewGuid();
        _projectRepository.GetByIdAsync(_projectId).Returns(new Project { Id = _projectId });
        _projectRepository.IsMemberAsync(_projectId, _userId).Returns(true);
        _projectRepository.IsMemberAsync(_projectId, assigneeId).Returns(false);
        _ticketRepository.GetMaxBoardOrderAsync(_projectId, "ToDo").Returns(0);

        var act = () => _sut.CreateTicketAsync(_projectId, _userId,
            new CreateTicketRequest("Fix bug", null, null, assigneeId, null, "ToDo"));

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Assignee is not a member of this project.");
    }

    // ── GetTicketsAsync ──────────────────────────────────────────────────────────

    [Fact]
    public async Task GetTicketsAsync_MemberUser_ReturnsTickets()
    {
        _projectRepository.GetByIdAsync(_projectId).Returns(new Project { Id = _projectId });
        _projectRepository.IsMemberAsync(_projectId, _userId).Returns(true);
        _ticketRepository.GetByProjectIdAsync(_projectId, null).Returns(new List<Ticket>
        {
            new() { Id = _ticketId, ProjectId = _projectId, Subject = "Bug", Status = "ToDo",
                    BoardOrder = 0, CreatedByUserId = _userId, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
        });

        var result = await _sut.GetTicketsAsync(_projectId, _userId);

        result.Should().HaveCount(1);
        result.First().Subject.Should().Be("Bug");
    }

    [Fact]
    public async Task GetTicketsAsync_ProjectNotFound_ThrowsKeyNotFoundException()
    {
        _projectRepository.GetByIdAsync(_projectId).Returns((Project?)null);

        var act = () => _sut.GetTicketsAsync(_projectId, _userId);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task GetTicketsAsync_NonMember_ThrowsUnauthorizedAccessException()
    {
        _projectRepository.GetByIdAsync(_projectId).Returns(new Project { Id = _projectId });
        _projectRepository.IsMemberAsync(_projectId, _userId).Returns(false);

        var act = () => _sut.GetTicketsAsync(_projectId, _userId);

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    // ── GetTicketByIdAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task GetTicketByIdAsync_ValidRequest_ReturnsTicket()
    {
        _projectRepository.GetByIdAsync(_projectId).Returns(new Project { Id = _projectId });
        _projectRepository.IsMemberAsync(_projectId, _userId).Returns(true);
        _ticketRepository.GetByIdAsync(_ticketId).Returns(
            new Ticket { Id = _ticketId, ProjectId = _projectId, Subject = "Bug", Status = "ToDo",
                         BoardOrder = 0, CreatedByUserId = _userId, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });

        var result = await _sut.GetTicketByIdAsync(_projectId, _ticketId, _userId);

        result.Id.Should().Be(_ticketId);
    }

    [Fact]
    public async Task GetTicketByIdAsync_TicketBelongsToDifferentProject_ThrowsKeyNotFoundException()
    {
        _projectRepository.GetByIdAsync(_projectId).Returns(new Project { Id = _projectId });
        _projectRepository.IsMemberAsync(_projectId, _userId).Returns(true);
        _ticketRepository.GetByIdAsync(_ticketId).Returns(
            new Ticket { Id = _ticketId, ProjectId = Guid.NewGuid(), Subject = "Bug", Status = "ToDo",
                         BoardOrder = 0, CreatedByUserId = _userId, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });

        var act = () => _sut.GetTicketByIdAsync(_projectId, _ticketId, _userId);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    // ── UpdateTicketAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateTicketAsync_SameStatus_PreservesBoardOrder()
    {
        _projectRepository.GetByIdAsync(_projectId).Returns(new Project { Id = _projectId });
        _projectRepository.IsMemberAsync(_projectId, _userId).Returns(true);
        var ticket = new Ticket { Id = _ticketId, ProjectId = _projectId, Subject = "Old", Status = "ToDo",
                                  BoardOrder = 2, CreatedByUserId = _userId, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        _ticketRepository.GetByIdAsync(_ticketId).Returns(ticket);
        _ticketRepository.UpdateAsync(Arg.Any<Ticket>()).Returns(Task.CompletedTask);

        var result = await _sut.UpdateTicketAsync(_projectId, _ticketId, _userId,
            new UpdateTicketRequest("New subject", null, null, null, null, "ToDo"));

        result.Subject.Should().Be("New subject");
        result.BoardOrder.Should().Be(2);
        await _ticketRepository.DidNotReceive().GetMaxBoardOrderAsync(Arg.Any<Guid>(), Arg.Any<string>());
    }

    [Fact]
    public async Task UpdateTicketAsync_StatusChanged_PlacesAtEndOfNewColumn()
    {
        _projectRepository.GetByIdAsync(_projectId).Returns(new Project { Id = _projectId });
        _projectRepository.IsMemberAsync(_projectId, _userId).Returns(true);
        var ticket = new Ticket { Id = _ticketId, ProjectId = _projectId, Subject = "Bug", Status = "ToDo",
                                  BoardOrder = 0, CreatedByUserId = _userId, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        _ticketRepository.GetByIdAsync(_ticketId).Returns(ticket);
        _ticketRepository.GetMaxBoardOrderAsync(_projectId, "InProgress").Returns(4);
        _ticketRepository.UpdateAsync(Arg.Any<Ticket>()).Returns(Task.CompletedTask);

        var result = await _sut.UpdateTicketAsync(_projectId, _ticketId, _userId,
            new UpdateTicketRequest("Bug", null, null, null, null, "InProgress"));

        result.Status.Should().Be("InProgress");
        result.BoardOrder.Should().Be(5);
    }

    [Fact]
    public async Task UpdateTicketAsync_TicketNotFound_ThrowsKeyNotFoundException()
    {
        _projectRepository.GetByIdAsync(_projectId).Returns(new Project { Id = _projectId });
        _projectRepository.IsMemberAsync(_projectId, _userId).Returns(true);
        _ticketRepository.GetByIdAsync(_ticketId).Returns((Ticket?)null);

        var act = () => _sut.UpdateTicketAsync(_projectId, _ticketId, _userId,
            new UpdateTicketRequest("Bug", null, null, null, null, "ToDo"));

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    // ── DeleteTicketAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task DeleteTicketAsync_ValidTicket_DeletesTicket()
    {
        _projectRepository.GetByIdAsync(_projectId).Returns(new Project { Id = _projectId });
        var ticket = new Ticket { Id = _ticketId, ProjectId = _projectId, Subject = "Bug", Status = "ToDo",
                                  BoardOrder = 0, CreatedByUserId = _userId, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        _ticketRepository.GetByIdAsync(_ticketId).Returns(ticket);
        _ticketRepository.DeleteAsync(ticket).Returns(Task.CompletedTask);

        await _sut.DeleteTicketAsync(_projectId, _ticketId);

        await _ticketRepository.Received(1).DeleteAsync(ticket);
    }

    [Fact]
    public async Task DeleteTicketAsync_TicketNotFound_ThrowsKeyNotFoundException()
    {
        _projectRepository.GetByIdAsync(_projectId).Returns(new Project { Id = _projectId });
        _ticketRepository.GetByIdAsync(_ticketId).Returns((Ticket?)null);

        var act = () => _sut.DeleteTicketAsync(_projectId, _ticketId);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task DeleteTicketAsync_TicketBelongsToDifferentProject_ThrowsKeyNotFoundException()
    {
        _projectRepository.GetByIdAsync(_projectId).Returns(new Project { Id = _projectId });
        _ticketRepository.GetByIdAsync(_ticketId).Returns(
            new Ticket { Id = _ticketId, ProjectId = Guid.NewGuid(), Subject = "Bug", Status = "ToDo",
                         BoardOrder = 0, CreatedByUserId = _userId, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });

        var act = () => _sut.DeleteTicketAsync(_projectId, _ticketId);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }
}
