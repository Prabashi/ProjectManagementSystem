using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectManagementSystem.Models.Requests;
using ProjectManagementSystem.Models.Responses;
using ProjectManagementSystem.Services;

namespace ProjectManagementSystem.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IConfiguration _configuration;

    public AuthController(IAuthService authService, IConfiguration configuration)
    {
        _authService = authService;
        _configuration = configuration;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var (user, token) = await _authService.RegisterAsync(request);
        AppendAuthCookie(token);
        return CreatedAtAction(nameof(Register), user);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var (user, token) = await _authService.LoginAsync(request);
        AppendAuthCookie(token);
        return Ok(user);
    }

    [Authorize]
    [HttpGet("me")]
    public IActionResult Me()
    {
        var id       = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var username = User.FindFirstValue(ClaimTypes.Name)!;
        var role     = User.FindFirstValue(ClaimTypes.Role)!;
        return Ok(new UserResponse(id, username, role));
    }

    [Authorize]
    [HttpPost("logout")]
    public IActionResult Logout()
    {
        Response.Cookies.Delete("token");
        return NoContent();
    }

    private void AppendAuthCookie(string token)
    {
        var expiryHours = double.Parse(_configuration["Jwt:ExpiryHours"]!);
        Response.Cookies.Append("token", token, new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Strict,
            Secure   = HttpContext.Request.IsHttps,   // true in production (HTTPS)
            Expires  = DateTimeOffset.UtcNow.AddHours(expiryHours)
        });
    }
}
