using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using ProjectManagementSystem.Data.Entities;
using ProjectManagementSystem.Repositories;

namespace ProjectManagementSystem.Tests.Repositories;

public class CachedProjectRepositoryTests
{
    private readonly IProjectRepository      _inner = Substitute.For<IProjectRepository>();
    private readonly IDistributedCache       _cache = new MemoryDistributedCache(Options.Create(new MemoryDistributedCacheOptions()));
    private readonly CachedProjectRepository _sut;

    private readonly Guid _projectId = Guid.NewGuid();
    private readonly Guid _userId    = Guid.NewGuid();

    public CachedProjectRepositoryTests()
    {
        _sut = new CachedProjectRepository(_inner, _cache);
    }

    // ── IsMemberAsync ────────────────────────────────────────────────────────────

    [Fact]
    public async Task IsMemberAsync_FirstCall_FetchesFromInnerRepository()
    {
        _inner.IsMemberAsync(_projectId, _userId).Returns(true);

        var result = await _sut.IsMemberAsync(_projectId, _userId);

        result.Should().BeTrue();
        await _inner.Received(1).IsMemberAsync(_projectId, _userId);
    }

    [Fact]
    public async Task IsMemberAsync_SecondCall_ReturnsCachedValueWithoutHittingInnerRepository()
    {
        _inner.IsMemberAsync(_projectId, _userId).Returns(true);

        await _sut.IsMemberAsync(_projectId, _userId);
        var result = await _sut.IsMemberAsync(_projectId, _userId);

        result.Should().BeTrue();
        await _inner.Received(1).IsMemberAsync(_projectId, _userId);
    }

    [Fact]
    public async Task IsMemberAsync_FalseResult_CachedCorrectly()
    {
        _inner.IsMemberAsync(_projectId, _userId).Returns(false);

        await _sut.IsMemberAsync(_projectId, _userId);
        var result = await _sut.IsMemberAsync(_projectId, _userId);

        result.Should().BeFalse();
        await _inner.Received(1).IsMemberAsync(_projectId, _userId);
    }

    [Fact]
    public async Task IsMemberAsync_DifferentUserIds_CachedIndependently()
    {
        var otherUserId = Guid.NewGuid();
        _inner.IsMemberAsync(_projectId, _userId).Returns(true);
        _inner.IsMemberAsync(_projectId, otherUserId).Returns(false);

        var result      = await _sut.IsMemberAsync(_projectId, _userId);
        var otherResult = await _sut.IsMemberAsync(_projectId, otherUserId);

        result.Should().BeTrue();
        otherResult.Should().BeFalse();
    }

    // ── AddMemberAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task AddMemberAsync_DelegatesToInnerRepository()
    {
        var member = new ProjectMember { ProjectId = _projectId, UserId = _userId };
        _inner.AddMemberAsync(member).Returns(member);

        var result = await _sut.AddMemberAsync(member);

        result.Should().Be(member);
        await _inner.Received(1).AddMemberAsync(member);
    }

    [Fact]
    public async Task AddMemberAsync_EvictsCachedMembership_SubsequentCallRequeriesInner()
    {
        var member = new ProjectMember { ProjectId = _projectId, UserId = _userId };
        _inner.IsMemberAsync(_projectId, _userId).Returns(false, true);
        _inner.AddMemberAsync(member).Returns(member);

        await _sut.IsMemberAsync(_projectId, _userId); // prime cache with false
        await _sut.AddMemberAsync(member);             // evicts
        var result = await _sut.IsMemberAsync(_projectId, _userId); // re-queries inner

        result.Should().BeTrue();
        await _inner.Received(2).IsMemberAsync(_projectId, _userId);
    }

    // ── Pure pass-through methods ────────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_DelegatesToInnerRepository()
    {
        var project = new Project { Id = Guid.NewGuid(), Name = "Test" };
        _inner.CreateAsync(project).Returns(project);

        var result = await _sut.CreateAsync(project);

        result.Should().Be(project);
        await _inner.Received(1).CreateAsync(project);
    }

    [Fact]
    public async Task GetByIdAsync_DelegatesToInnerRepository()
    {
        var project = new Project { Id = _projectId, Name = "Test" };
        _inner.GetByIdAsync(_projectId).Returns(project);

        var result = await _sut.GetByIdAsync(_projectId);

        result.Should().Be(project);
    }

    [Fact]
    public async Task GetByUserIdAsync_DelegatesToInnerRepository()
    {
        var projects = new List<Project> { new() { Id = Guid.NewGuid(), Name = "Test" } };
        _inner.GetByUserIdAsync(_userId).Returns(projects);

        var result = await _sut.GetByUserIdAsync(_userId);

        result.Should().BeEquivalentTo(projects);
    }

    [Fact]
    public async Task GetMembersAsync_DelegatesToInnerRepository()
    {
        var members = new List<ProjectMember> { new() { ProjectId = _projectId, UserId = _userId } };
        _inner.GetMembersAsync(_projectId).Returns(members);

        var result = await _sut.GetMembersAsync(_projectId);

        result.Should().BeEquivalentTo(members);
    }
}
