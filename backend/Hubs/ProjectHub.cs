using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using ProjectManagementSystem.Repositories;

namespace ProjectManagementSystem.Hubs;

[Authorize]
public class ProjectHub : Hub
{
    private readonly IProjectRepository _projectRepository;

    public ProjectHub(IProjectRepository projectRepository)
    {
        _projectRepository = projectRepository;
    }

    public async Task JoinProject(string projectId)
    {
        if (!Guid.TryParse(projectId, out var projectGuid))
            throw new HubException("Invalid project ID.");

        var userId = Guid.Parse(Context.User!.FindFirstValue(ClaimTypes.NameIdentifier)!);

        if (!await _projectRepository.IsMemberAsync(projectGuid, userId))
            throw new HubException("Not a member of this project.");

        await Groups.AddToGroupAsync(Context.ConnectionId, $"project-{projectId}");
    }

    public async Task LeaveProject(string projectId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"project-{projectId}");
    }
}
