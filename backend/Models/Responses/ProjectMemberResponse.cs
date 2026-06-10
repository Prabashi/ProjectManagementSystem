namespace ProjectManagementSystem.Models.Responses;

public record ProjectMemberResponse(
    Guid UserId,
    string Username,
    string Role,
    DateTime AddedAt
);
