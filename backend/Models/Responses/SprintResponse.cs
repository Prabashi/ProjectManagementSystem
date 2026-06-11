namespace ProjectManagementSystem.Models.Responses;

public record SprintResponse(
    Guid      Id,
    Guid      ProjectId,
    string    Name,
    DateOnly? StartDate,
    DateOnly? EndDate,
    bool      IsActive,
    DateTime  CreatedAt
);
