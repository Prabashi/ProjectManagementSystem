using System.ComponentModel.DataAnnotations;

namespace ProjectManagementSystem.Models.Requests;

public record LoginRequest(
    [Required] string Username,
    [Required] string Password
);
