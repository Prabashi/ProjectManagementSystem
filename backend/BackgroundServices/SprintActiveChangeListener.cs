using Microsoft.Extensions.Caching.Memory;
using Npgsql;
using ProjectManagementSystem.Repositories;

namespace ProjectManagementSystem.BackgroundServices;

/// <summary>
/// Keeps each API instance's local <see cref="CachedSprintRepository"/> cache consistent
/// across horizontal scaling, without a shared/distributed cache.
///
/// A DB trigger (sql/V6__Add_sprint_active_changed_notify.sql) raises a PostgreSQL
/// <c>NOTIFY sprint_active_changed</c> with the affected project's id whenever a sprint row
/// is inserted, updated, or deleted. Every API instance LISTENs on that channel independently
/// and evicts only its own in-process cache entry for that project — so the cache itself
/// stays purely local while writes from any instance (or any direct DB change) invalidate it
/// everywhere within milliseconds.
///
/// This is a singleton (hosted services live for the app's lifetime), so per
/// docs/dbcontext-lifetimes-and-factory.md it must not depend on the scoped AppDbContext —
/// it opens its own dedicated ADO.NET connection instead, used only for LISTEN/NOTIFY.
/// </summary>
public class SprintActiveChangeListener : BackgroundService
{
    private const string Channel = "sprint_active_changed";
    private static readonly TimeSpan ReconnectDelay = TimeSpan.FromSeconds(5);

    private readonly string _connectionString;
    private readonly IMemoryCache _cache;
    private readonly ILogger<SprintActiveChangeListener> _logger;

    public SprintActiveChangeListener(
        IConfiguration configuration,
        IMemoryCache cache,
        ILogger<SprintActiveChangeListener> logger)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection connection string is not configured.");
        _cache  = cache;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ListenAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                // Normal shutdown.
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "Sprint active-change listener lost its connection; reconnecting in {Delay}s.",
                    ReconnectDelay.TotalSeconds);
                await Task.Delay(ReconnectDelay, stoppingToken);
            }
        }
    }

    private async Task ListenAsync(CancellationToken stoppingToken)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync(stoppingToken);

        connection.Notification += OnNotification;

        await using var listenCommand = new NpgsqlCommand($"LISTEN {Channel};", connection);
        await listenCommand.ExecuteNonQueryAsync(stoppingToken);

        _logger.LogInformation("Listening for sprint active-change notifications on '{Channel}'.", Channel);

        // WaitAsync blocks until a notification arrives (dispatching OnNotification) or the
        // token is cancelled; looping keeps the connection listening for the app's lifetime.
        while (!stoppingToken.IsCancellationRequested)
            await connection.WaitAsync(stoppingToken);
    }

    private void OnNotification(object sender, NpgsqlNotificationEventArgs e)
    {
        if (!Guid.TryParse(e.Payload, out var projectId))
        {
            _logger.LogWarning("Received sprint active-change notification with unparseable payload: {Payload}", e.Payload);
            return;
        }

        _cache.Remove(SprintCacheKeys.ActiveSprint(projectId));
        _logger.LogDebug("Evicted active-sprint cache entry for project {ProjectId}.", projectId);
    }
}
