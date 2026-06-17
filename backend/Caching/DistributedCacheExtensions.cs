using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;

namespace ProjectManagementSystem.Caching;

public static class DistributedCacheExtensions
{
    // For entity/reference-type results. A null return from the factory is a valid cacheable value
    // (e.g. "no active sprint") and is stored as JSON null so subsequent reads skip the DB.
    // For value-type results (bool, int, etc.) use GetStringAsync/SetStringAsync directly.
    public static async Task<T?> GetOrSetAsync<T>(
        this IDistributedCache cache,
        string key,
        Func<Task<T?>> factory,
        DistributedCacheEntryOptions options,
        CancellationToken cancellationToken = default)
        where T : class
    {
        var json = await cache.GetStringAsync(key, cancellationToken);
        if (json is not null)
            return JsonSerializer.Deserialize<T>(json);

        var value = await factory();
        await cache.SetStringAsync(key, JsonSerializer.Serialize(value), options, cancellationToken);
        return value;
    }
}
