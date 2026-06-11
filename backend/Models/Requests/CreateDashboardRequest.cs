using System.ComponentModel.DataAnnotations;

namespace ProjectManagementSystem.Models.Requests;

public record CreateDashboardRequest(
    [Required, MinLength(1), MaxLength(100)] string Name
);
