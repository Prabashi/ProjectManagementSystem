using System.ComponentModel.DataAnnotations;

namespace ProjectManagementSystem.Models.Requests;

public record MoveTicketRequest([Required] string Status);
