using System.ComponentModel.DataAnnotations;

namespace ProjectManagementSystem.Models.Requests;

public record RegisterRequest(
    [Required, MinLength(3), MaxLength(50)] string Username,
    [Required, MinLength(8)]               string Password,
    [Required, AllowedValues("User", "Admin")] string Role
);
