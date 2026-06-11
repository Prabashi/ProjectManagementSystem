namespace ProjectManagementSystem.Models.Responses;

public record DashboardResponse(
    Guid                        Id,
    Guid                        ProjectId,
    string                      Name,
    Guid                        CreatedByUserId,
    DateTime                    CreatedAt,
    Guid?                       ActiveSprintId,
    IEnumerable<TicketResponse> Tickets
);
