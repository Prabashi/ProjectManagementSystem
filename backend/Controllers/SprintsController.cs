using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectManagementSystem.Models.Requests;
using ProjectManagementSystem.Services;

namespace ProjectManagementSystem.Controllers;

[ApiController]
[Route("api/projects/{projectId:guid}/sprints")]
[Authorize]
public class SprintsController : ControllerBase
{
    private readonly ISprintService _sprintService;

    public SprintsController(ISprintService sprintService) => _sprintService = sprintService;

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create(Guid projectId, [FromBody] CreateSprintRequest request)
    {
        var sprint = await _sprintService.CreateSprintAsync(projectId, request);
        return CreatedAtAction(nameof(GetById), new { projectId, sprintId = sprint.Id }, sprint);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(Guid projectId)
    {
        var sprints = await _sprintService.GetSprintsAsync(projectId, GetUserId());
        return Ok(sprints);
    }

    [HttpGet("{sprintId:guid}")]
    public async Task<IActionResult> GetById(Guid projectId, Guid sprintId)
    {
        var sprint = await _sprintService.GetSprintByIdAsync(projectId, sprintId, GetUserId());
        return Ok(sprint);
    }

    [HttpPatch("{sprintId:guid}/activate")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Activate(Guid projectId, Guid sprintId)
    {
        var sprint = await _sprintService.SetActiveSprintAsync(projectId, sprintId);
        return Ok(sprint);
    }

    [HttpDelete("{sprintId:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid projectId, Guid sprintId)
    {
        await _sprintService.DeleteSprintAsync(projectId, sprintId);
        return NoContent();
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
