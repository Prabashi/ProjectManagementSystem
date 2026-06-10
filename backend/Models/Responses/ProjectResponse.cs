namespace ProjectManagementSystem.Models.Responses;

public record ProjectResponse(
    Guid Id,
    string Name,
    string? Description,
    Guid CreatedByUserId,
    DateTime CreatedAt,
    DateTime UpdatedAt
);
