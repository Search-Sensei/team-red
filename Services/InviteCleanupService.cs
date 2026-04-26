using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace S365.Search.Admin.UI.Services
{
    /// <summary>
    /// Background service that runs hourly and:
    /// 1. Deletes Keycloak users invited via the invite flow who never accepted within 24 hours.
    /// 2. Deletes Keycloak users and orgs created during registration who never completed payment within 24 hours.
    /// </summary>
    public class InviteCleanupService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<InviteCleanupService> _logger;

        private static readonly TimeSpan RunInterval   = TimeSpan.FromHours(1);
        private static readonly TimeSpan InviteExpiry  = TimeSpan.FromHours(24);
        private static readonly TimeSpan PaymentExpiry = TimeSpan.FromHours(24);

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
                await CleanupExpiredPendingPaymentsAsync(stoppingToken);
            }
        }

        private async Task CleanupExpiredInvitesAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("InviteCleanupService: scanning for expired unaccepted invites.");

            try
            {
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
                    if (cancellationToken.IsCancellationRequested) break;

                    try
                    {
                        await keycloak.DeleteUserAsync(adminToken, userId);
                        _logger.LogInformation(
                            "InviteCleanupService: deleted expired invited user {UserId}.", userId);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex,
                            "InviteCleanupService: failed to delete user {UserId}, will retry next cycle.", userId);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "InviteCleanupService: unexpected error during invite cleanup.");
            }
        }

        private async Task CleanupExpiredPendingPaymentsAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("InviteCleanupService: scanning for expired pending-payment registrations.");

            try
            {
                await using var scope = _scopeFactory.CreateAsyncScope();
                var keycloak = scope.ServiceProvider.GetRequiredService<KeycloakService>();

                var adminToken = await keycloak.GetAdminTokenAsync();
                var expired    = await keycloak.GetExpiredPendingPaymentUsersAsync(adminToken, PaymentExpiry);

                if (expired.Count == 0)
                {
                    _logger.LogInformation("InviteCleanupService: no expired pending-payment registrations found.");
                    return;
                }

                _logger.LogInformation(
                    "InviteCleanupService: cleaning up {Count} expired pending-payment registration(s).", expired.Count);

                foreach (var (userId, orgId) in expired)
                {
                    if (cancellationToken.IsCancellationRequested) break;

                    try
                    {
                        await keycloak.DeleteUserAsync(adminToken, userId);
                        _logger.LogInformation(
                            "InviteCleanupService: deleted pending-payment user {UserId}.", userId);

                        if (!string.IsNullOrEmpty(orgId))
                        {
                            await keycloak.DeleteOrganizationAsync(adminToken, orgId);
                            _logger.LogInformation(
                                "InviteCleanupService: deleted pending-payment org {OrgId}.", orgId);
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex,
                            "InviteCleanupService: failed to delete pending-payment user {UserId} / org {OrgId}, will retry.",
                            userId, orgId);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "InviteCleanupService: unexpected error during pending-payment cleanup.");
            }
        }
    }
}
