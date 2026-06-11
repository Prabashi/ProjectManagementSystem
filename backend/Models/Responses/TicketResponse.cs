namespace ProjectManagementSystem.Models.Responses;

public record TicketResponse(
    Guid     Id,
    Guid     ProjectId,
    Guid?    SprintId,
    string   Subject,
    string?  Description,
    decimal? Estimate,
    Guid?    AssigneeId,
    string?  AssigneeName,
    string   Status,
    int      BoardOrder,
    Guid     CreatedByUserId,
    DateTime CreatedAt,
    DateTime UpdatedAt
);
