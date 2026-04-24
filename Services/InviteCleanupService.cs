using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace S365.Search.Admin.UI.Services
{
    /// <summary>
    /// Background service that runs hourly and deletes Keycloak users who were created
    /// via the invite flow (identified by the "invitedAt" user attribute) but never
    /// accepted the invitation within 24 hours. This keeps Keycloak clean — only fully
    /// activated users remain in the system.
    /// </summary>
    public class InviteCleanupService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<InviteCleanupService> _logger;

        private static readonly TimeSpan RunInterval  = TimeSpan.FromHours(1);
        private static readonly TimeSpan InviteExpiry = TimeSpan.FromHours(24);

        public InviteCleanupService(IServiceScopeFactory scopeFactory, ILogger<InviteCleanupService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger       = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("InviteCleanupService started.");

            using var timer = new PeriodicTimer(RunInterval);

            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                await CleanupExpiredInvitesAsync(stoppingToken);
            }
        }

        private async Task CleanupExpiredInvitesAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("InviteCleanupService: scanning for expired unaccepted invites.");

            try
            {
                // KeycloakService is scoped — create a fresh scope for each run
                await using var scope = _scopeFactory.CreateAsyncScope();
                var keycloak = scope.ServiceProvider.GetRequiredService<KeycloakService>();

                var adminToken = await keycloak.GetAdminTokenAsync();
                var expiredIds = await keycloak.GetExpiredInvitedUserIdsAsync(adminToken, InviteExpiry);

                if (expiredIds.Count == 0)
                {
                    _logger.LogInformation("InviteCleanupService: no expired invites found.");
                    return;
                }

                _logger.LogInformation(
                    "InviteCleanupService: deleting {Count} expired invite user(s).", expiredIds.Count);

                foreach (var userId in expiredIds)
                {
                    if (cancellationToken.IsCancellationRequested)
                        break;

                    try
                    {
                        await keycloak.DeleteUserAsync(adminToken, userId);
                        _logger.LogInformation(
                            "InviteCleanupService: deleted expired invited user {UserId}.", userId);
                    }
                    catch (Exception ex)
                    {
                        // Log and continue — a failed delete will be retried next hour
                        _logger.LogWarning(ex,
                            "InviteCleanupService: failed to delete user {UserId}, will retry next cycle.", userId);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "InviteCleanupService: unexpected error during cleanup run.");
            }
        }
    }
}
