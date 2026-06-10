using System.ComponentModel.DataAnnotations;

namespace ProjectManagementSystem.Models.Requests;

public record AddMemberRequest(
    [Required] Guid UserId
);
