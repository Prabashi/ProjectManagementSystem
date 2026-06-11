using System.ComponentModel.DataAnnotations;

namespace ProjectManagementSystem.Models.Requests;

public record CreateSprintRequest(
    [Required, MinLength(1), MaxLength(100)] string Name,
    DateOnly? StartDate,
    DateOnly? EndDate
);
