using System.ComponentModel.DataAnnotations;

namespace ProjectManagementSystem.Models.Requests;

public record CreateTicketRequest(
    [Required, MinLength(1), MaxLength(200)] string Subject,
    string?  Description,
    decimal? Estimate,
    Guid?    AssigneeId,
    Guid?    SprintId,
    [Required] string Status
);
