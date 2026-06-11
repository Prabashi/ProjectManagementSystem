using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectManagementSystem.Models.Requests;
using ProjectManagementSystem.Services;

namespace ProjectManagementSystem.Controllers;

[ApiController]
[Route("api/projects/{projectId:guid}/tickets")]
[Authorize]
public class TicketsController : ControllerBase
{
    private readonly ITicketService _ticketService;

    public TicketsController(ITicketService ticketService) => _ticketService = ticketService;

    [HttpPost]
    public async Task<IActionResult> Create(Guid projectId, [FromBody] CreateTicketRequest request)
    {
        var ticket = await _ticketService.CreateTicketAsync(projectId, GetUserId(), request);
        return CreatedAtAction(nameof(GetById), new { projectId, ticketId = ticket.Id }, ticket);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(Guid projectId, [FromQuery] Guid? sprintId)
    {
        var tickets = await _ticketService.GetTicketsAsync(projectId, GetUserId(), sprintId);
        return Ok(tickets);
    }

    [HttpGet("{ticketId:guid}")]
    public async Task<IActionResult> GetById(Guid projectId, Guid ticketId)
    {
        var ticket = await _ticketService.GetTicketByIdAsync(projectId, ticketId, GetUserId());
        return Ok(ticket);
    }

    [HttpPut("{ticketId:guid}")]
    public async Task<IActionResult> Update(Guid projectId, Guid ticketId, [FromBody] UpdateTicketRequest request)
    {
        var ticket = await _ticketService.UpdateTicketAsync(projectId, ticketId, GetUserId(), request);
        return Ok(ticket);
    }

    [HttpDelete("{ticketId:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid projectId, Guid ticketId)
    {
        await _ticketService.DeleteTicketAsync(projectId, ticketId);
        return NoContent();
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
