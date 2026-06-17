using Microsoft.Extensions.Caching.Memory;
using ProjectManagementSystem.Data.Entities;
using ProjectManagementSystem.Repositories;

namespace ProjectManagementSystem.Tests.Repositories;

public class CachedSprintRepositoryTests
{
    private readonly ISprintRepository       _inner = Substitute.For<ISprintRepository>();
    private readonly IMemoryCache             _cache = new MemoryCache(new MemoryCacheOptions());
    private readonly CachedSprintRepository   _sut;

    private readonly Guid _projectId = Guid.NewGuid();

    public CachedSprintRepositoryTests()
    {
        _sut = new CachedSprintRepository(_inner, _cache);
    }

    // ── GetActiveSprintAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task GetActiveSprintAsync_FirstCall_FetchesFromInnerRepository()
    {
        var sprint = new Sprint { Id = Guid.NewGuid(), ProjectId = _projectId, IsActive = true };
        _inner.GetActiveSprintAsync(_projectId).Returns(sprint);

        var result = await _sut.GetActiveSprintAsync(_projectId);

        result.Should().Be(sprint);
        await _inner.Received(1).GetActiveSprintAsync(_projectId);
    }

    [Fact]
    public async Task GetActiveSprintAsync_SecondCall_ReturnsCachedValueWithoutHittingInnerRepository()
    {
        var sprint = new Sprint { Id = Guid.NewGuid(), ProjectId = _projectId, IsActive = true };
        _inner.GetActiveSprintAsync(_projectId).Returns(sprint);

        await _sut.GetActiveSprintAsync(_projectId);
        var result = await _sut.GetActiveSprintAsync(_projectId);

        result.Should().Be(sprint);
        await _inner.Received(1).GetActiveSprintAsync(_projectId);
    }

    [Fact]
    public async Task GetActiveSprintAsync_DifferentProjects_CachedIndependently()
    {
        var otherProjectId = Guid.NewGuid();
        var sprint      = new Sprint { Id = Guid.NewGuid(), ProjectId = _projectId,      IsActive = true };
        var otherSprint = new Sprint { Id = Guid.NewGuid(), ProjectId = otherProjectId,  IsActive = true };
        _inner.GetActiveSprintAsync(_projectId).Returns(sprint);
        _inner.GetActiveSprintAsync(otherProjectId).Returns(otherSprint);

        var result      = await _sut.GetActiveSprintAsync(_projectId);
        var otherResult = await _sut.GetActiveSprintAsync(otherProjectId);

        result.Should().Be(sprint);
        otherResult.Should().Be(otherSprint);
    }

    // ── UpdateAsync ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateAsync_DelegatesToInnerRepository()
    {
        var sprint = new Sprint { Id = Guid.NewGuid(), ProjectId = _projectId };

        await _sut.UpdateAsync(sprint);

        await _inner.Received(1).UpdateAsync(sprint);
    }

    [Fact]
    public async Task UpdateAsync_EvictsCachedActiveSprintForThatProject()
    {
        var staleSprint = new Sprint { Id = Guid.NewGuid(), ProjectId = _projectId, IsActive = true };
        var freshSprint = new Sprint { Id = Guid.NewGuid(), ProjectId = _projectId, IsActive = true };
        _inner.GetActiveSprintAsync(_projectId).Returns(staleSprint, freshSprint);
        await _sut.GetActiveSprintAsync(_projectId); // warms the cache with staleSprint

        await _sut.UpdateAsync(new Sprint { Id = Guid.NewGuid(), ProjectId = _projectId, IsActive = true });
        var result = await _sut.GetActiveSprintAsync(_projectId);

        result.Should().Be(freshSprint);
        await _inner.Received(2).GetActiveSprintAsync(_projectId);
    }

    // ── DeleteAsync ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task DeleteAsync_DelegatesToInnerRepository()
    {
        var sprint = new Sprint { Id = Guid.NewGuid(), ProjectId = _projectId };

        await _sut.DeleteAsync(sprint);

        await _inner.Received(1).DeleteAsync(sprint);
    }

    [Fact]
    public async Task DeleteAsync_EvictsCachedActiveSprintForThatProject()
    {
        var staleSprint = new Sprint { Id = Guid.NewGuid(), ProjectId = _projectId, IsActive = true };
        _inner.GetActiveSprintAsync(_projectId).Returns(staleSprint, (Sprint?)null);
        await _sut.GetActiveSprintAsync(_projectId); // warms the cache

        await _sut.DeleteAsync(staleSprint);
        var result = await _sut.GetActiveSprintAsync(_projectId);

        result.Should().BeNull();
        await _inner.Received(2).GetActiveSprintAsync(_projectId);
    }

    // ── DeactivateAllAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task DeactivateAllAsync_DelegatesToInnerRepository()
    {
        await _sut.DeactivateAllAsync(_projectId);

        await _inner.Received(1).DeactivateAllAsync(_projectId);
    }

    [Fact]
    public async Task DeactivateAllAsync_EvictsCachedActiveSprintForThatProject()
    {
        var staleSprint = new Sprint { Id = Guid.NewGuid(), ProjectId = _projectId, IsActive = true };
        _inner.GetActiveSprintAsync(_projectId).Returns(staleSprint, (Sprint?)null);
        await _sut.GetActiveSprintAsync(_projectId); // warms the cache

        await _sut.DeactivateAllAsync(_projectId);
        var result = await _sut.GetActiveSprintAsync(_projectId);

        result.Should().BeNull();
        await _inner.Received(2).GetActiveSprintAsync(_projectId);
    }

    // ── Pure pass-through methods ────────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_DelegatesToInnerRepository()
    {
        var sprint = new Sprint { Id = Guid.NewGuid(), ProjectId = _projectId };
        _inner.CreateAsync(sprint).Returns(sprint);

        var result = await _sut.CreateAsync(sprint);

        result.Should().Be(sprint);
        await _inner.Received(1).CreateAsync(sprint);
    }

    [Fact]
    public async Task GetByProjectIdAsync_DelegatesToInnerRepository()
    {
        var sprints = new List<Sprint> { new() { Id = Guid.NewGuid(), ProjectId = _projectId } };
        _inner.GetByProjectIdAsync(_projectId).Returns(sprints);

        var result = await _sut.GetByProjectIdAsync(_projectId);

        result.Should().BeEquivalentTo(sprints);
    }

    [Fact]
    public async Task GetByIdAsync_DelegatesToInnerRepository()
    {
        var sprintId = Guid.NewGuid();
        var sprint   = new Sprint { Id = sprintId, ProjectId = _projectId };
        _inner.GetByIdAsync(sprintId).Returns(sprint);

        var result = await _sut.GetByIdAsync(sprintId);

        result.Should().Be(sprint);
    }
}
