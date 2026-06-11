using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectManagementSystem.Models.Requests;
using ProjectManagementSystem.Services;

namespace ProjectManagementSystem.Controllers;

[ApiController]
[Route("api/projects/{projectId:guid}/dashboard")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;

    public DashboardController(IDashboardService dashboardService) => _dashboardService = dashboardService;

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create(Guid projectId, [FromBody] CreateDashboardRequest request)
    {
        var dashboard = await _dashboardService.CreateDashboardAsync(projectId, GetUserId(), request);
        return CreatedAtAction(nameof(Get), new { projectId }, dashboard);
    }

    [HttpGet]
    public async Task<IActionResult> Get(Guid projectId)
    {
        var dashboard = await _dashboardService.GetDashboardAsync(projectId, GetUserId());
        return Ok(dashboard);
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
