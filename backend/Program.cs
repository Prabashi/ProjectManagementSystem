using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.IdentityModel.Tokens;
using ProjectManagementSystem.BackgroundServices;
using ProjectManagementSystem.Data;
using ProjectManagementSystem.Hubs;
using ProjectManagementSystem.Middleware;
using ProjectManagementSystem.Repositories;
using ProjectManagementSystem.Services;
using StackExchange.Redis;

var builder = WebApplication.CreateBuilder(args);

// ── Database ──────────────────────────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// ── Authentication — JWT read from HttpOnly cookie ────────────────────────────
var jwtSection = builder.Configuration.GetSection("Jwt");
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = jwtSection["Issuer"],
            ValidAudience            = jwtSection["Audience"],
            IssuerSigningKey         = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtSection["Key"]!))
        };

        // Read the JWT from the HttpOnly cookie instead of the Authorization header.
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                ctx.Token = ctx.Request.Cookies["token"];
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

// ── CORS — must name the origin; wildcard is incompatible with credentials ────
builder.Services.AddCors(options =>
    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins(builder.Configuration["Cors:AllowedOrigin"]!)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials()));

// ── SignalR ───────────────────────────────────────────────────────────────────
builder.Services
    .AddSignalR()
    .AddStackExchangeRedis(
        builder.Configuration.GetConnectionString("Redis")!,
        options => options.Configuration.ChannelPrefix = RedisChannel.Literal("pms"));

// ── MVC + OpenAPI ─────────────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddOpenApi();

// ── Exception handling ────────────────────────────────────────────────────────
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

// ── Application services ──────────────────────────────────────────────────────
builder.Services.AddStackExchangeRedisCache(options =>
    options.Configuration = builder.Configuration.GetConnectionString("Redis"));

builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<ProjectRepository>();
builder.Services.AddScoped<IProjectRepository>(sp => new CachedProjectRepository(
    sp.GetRequiredService<ProjectRepository>(),
    sp.GetRequiredService<IDistributedCache>()));
builder.Services.AddScoped<ITokenService,      TokenService>();
builder.Services.AddScoped<IAuthService,       AuthService>();
builder.Services.AddScoped<IProjectService,    ProjectService>();
builder.Services.AddScoped<IUserService,       UserService>();
builder.Services.AddMemoryCache();
builder.Services.AddScoped<SprintRepository>();
builder.Services.AddScoped<ISprintRepository>(sp => new CachedSprintRepository(
    sp.GetRequiredService<SprintRepository>(),
    sp.GetRequiredService<IMemoryCache>()));
builder.Services.AddScoped<ISprintService,     SprintService>();
builder.Services.AddHostedService<SprintActiveChangeListener>();
builder.Services.AddScoped<ITicketRepository,    TicketRepository>();
builder.Services.AddScoped<ITicketService,       TicketService>();
builder.Services.AddScoped<IDashboardRepository, DashboardRepository>();
builder.Services.AddScoped<IDashboardService,    DashboardService>();
builder.Services.AddScoped<IProjectNotifier,     SignalRProjectNotifier>();

// ─────────────────────────────────────────────────────────────────────────────
var app = builder.Build();

app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

app.UseHttpsRedirection();
app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<ProjectHub>("/hubs/project");

app.Run();

// Expose Program for integration test projects
public partial class Program { }
