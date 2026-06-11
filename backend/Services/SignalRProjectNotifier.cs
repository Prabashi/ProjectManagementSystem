using Microsoft.AspNetCore.SignalR;
using ProjectManagementSystem.Hubs;
using ProjectManagementSystem.Models.Responses;

namespace ProjectManagementSystem.Services;

public class SignalRProjectNotifier : IProjectNotifier
{
    private readonly IHubContext<ProjectHub> _hub;

    public SignalRProjectNotifier(IHubContext<ProjectHub> hub) => _hub = hub;

    public Task TicketCreatedAsync(Guid projectId, TicketResponse ticket) =>
        _hub.Clients.Group($"project-{projectId}").SendAsync("TicketCreated", new { ticket });

    public Task TicketUpdatedAsync(Guid projectId, TicketResponse ticket) =>
        _hub.Clients.Group($"project-{projectId}").SendAsync("TicketUpdated", new { ticket });

    public Task TicketDeletedAsync(Guid projectId, Guid ticketId) =>
        _hub.Clients.Group($"project-{projectId}").SendAsync("TicketDeleted", new { ticketId });

    public Task SprintChangedAsync(Guid projectId, SprintResponse sprint) =>
        _hub.Clients.Group($"project-{projectId}").SendAsync("SprintChanged", new { sprint });
}
