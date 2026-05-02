using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using S365.Search.Admin.UI.Services;

namespace S365.Search.Admin.UI.Controllers
{
    [ApiController]
    [Route("portal/api/subscription")]
    [Authorize]
    public class SubscriptionController : ControllerBase
    {
        private readonly StripeService _stripeService;
        private readonly KeycloakService _keycloakService;
        private readonly IUserContextResolver _userContextResolver;
        private readonly ILogger<SubscriptionController> _logger;
        private readonly Dictionary<string, string> _priceIdToLabel;

        public SubscriptionController(
            StripeService stripeService,
            KeycloakService keycloakService,
            IUserContextResolver userContextResolver,
            IConfiguration configuration,
            ILogger<SubscriptionController> logger)
        {
            _stripeService       = stripeService;
            _keycloakService     = keycloakService;
            _userContextResolver = userContextResolver;
            _logger              = logger;

            // Build a reverse map: Stripe price ID → human-readable label
            _priceIdToLabel = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                { configuration["Stripe:Prices:EssentialsMonthly"] ?? "", "Essentials – Monthly" },
                { configuration["Stripe:Prices:EssentialsAnnual"]  ?? "", "Essentials – Annual"  },
                { configuration["Stripe:Prices:AiSearchMonthly"]   ?? "", "AI Search – Monthly"  },
                { configuration["Stripe:Prices:AiSearchAnnual"]    ?? "", "AI Search – Annual"   },
            };
            _priceIdToLabel.Remove(""); // remove any unmapped entries
        }

        /// <summary>
        /// Returns the active subscription status and plan for the authenticated user's organisation.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetSubscription()
        {
            var (orgId, errorResult) = await ResolveOrgIdAsync();
            if (errorResult != null) return errorResult;

            var (_, subscriptionId) = await GetStripeIdsAsync(orgId!);
            if (string.IsNullOrEmpty(subscriptionId))
                return NotFound(new { error = "No active subscription found for this organisation." });

            var subscription = await _stripeService.GetSubscriptionAsync(subscriptionId);
            if (subscription == null)
                return NotFound(new { error = "Subscription not found in Stripe." });

            var firstItem = subscription.Items?.Data?.FirstOrDefault();
            var planName  = ResolvePlanName(firstItem?.Price?.Id, firstItem?.Price?.Product?.Name, firstItem?.Price?.Nickname);

            return Ok(new
            {
                status            = MapStatus(subscription.Status),
                planName,
                currentPeriodEnd  = firstItem?.CurrentPeriodEnd,
                cancelAtPeriodEnd = subscription.CancelAtPeriodEnd
            });
        }

        /// <summary>
        /// Returns all subscriptions (active and historical) for the authenticated user's organisation.
        /// </summary>
        [HttpGet("list")]
        public async Task<IActionResult> GetSubscriptions()
        {
            var (orgId, errorResult) = await ResolveOrgIdAsync();
            if (errorResult != null) return errorResult;

            var (customerId, _) = await GetStripeIdsAsync(orgId!);
            if (string.IsNullOrEmpty(customerId))
                return Ok(Array.Empty<object>());

            var subscriptions = await _stripeService.ListSubscriptionsAsync(customerId);

            var result = subscriptions.Select(sub =>
            {
                var item     = sub.Items?.Data?.FirstOrDefault();
                var planName = ResolvePlanName(item?.Price?.Id, item?.Price?.Product?.Name, item?.Price?.Nickname);

                return new
                {
                    id                = sub.Id,
                    status            = MapStatus(sub.Status),
                    planName,
                    planId            = item?.Price?.Id,
                    currentPeriodEnd  = item?.CurrentPeriodEnd,
                    cancelAtPeriodEnd = sub.CancelAtPeriodEnd,
                    startDate         = sub.StartDate,
                };
            });

            return Ok(result);
        }

        /// <summary>
        /// Changes the current subscription to a new plan.
        /// </summary>
        [HttpPost("change")]
        public async Task<IActionResult> ChangePlan([FromBody] ChangePlanRequest request)
        {
            if (string.IsNullOrWhiteSpace(request?.PlanId))
                return BadRequest(new { error = "planId is required." });

            var newPriceId = _stripeService.ResolvePriceId(request.PlanId);
            if (string.IsNullOrEmpty(newPriceId))
                return BadRequest(new { error = "Invalid plan selected." });

            var (orgId, errorResult) = await ResolveOrgIdAsync();
            if (errorResult != null) return errorResult;

            var (_, subscriptionId) = await GetStripeIdsAsync(orgId!);
            if (string.IsNullOrEmpty(subscriptionId))
                return NotFound(new { error = "No active subscription found for this organisation." });

            var updated   = await _stripeService.ChangeSubscriptionPlanAsync(subscriptionId, newPriceId);
            var firstItem = updated.Items?.Data?.FirstOrDefault();
            var planName  = ResolvePlanName(firstItem?.Price?.Id, firstItem?.Price?.Product?.Name, firstItem?.Price?.Nickname);

            return Ok(new
            {
                status            = MapStatus(updated.Status),
                planName,
                currentPeriodEnd  = firstItem?.CurrentPeriodEnd,
                cancelAtPeriodEnd = updated.CancelAtPeriodEnd
            });
        }

        /// <summary>
        /// Returns the invoice history for the authenticated user's organisation.
        /// </summary>
        [HttpGet("invoices")]
        public async Task<IActionResult> GetInvoices()
        {
            var (orgId, errorResult) = await ResolveOrgIdAsync();
            if (errorResult != null) return errorResult;

            var (customerId, _) = await GetStripeIdsAsync(orgId!);
            if (string.IsNullOrEmpty(customerId))
                return Ok(Array.Empty<object>());

            var invoices = await _stripeService.ListInvoicesAsync(customerId);

            var result = invoices.Select(inv => new
            {
                id            = inv.Id,
                amountDue     = inv.AmountDue,
                amountPaid    = inv.AmountPaid,
                currency      = inv.Currency,
                status        = inv.Status,
                date          = inv.Created,
                invoicePdfUrl = inv.InvoicePdf
            });

            return Ok(result);
        }

        // ── Helpers ─────────────────────────────────────────────────────────────

        private async Task<(string? orgId, IActionResult? error)> ResolveOrgIdAsync()
        {
            var context = await _userContextResolver.ResolveAsync(HttpContext, User);
            if (string.IsNullOrEmpty(context.GroupId))
                return (null, BadRequest(new { error = "Unable to determine organisation from user context." }));
            return (context.GroupId, null);
        }

        private async Task<(string? customerId, string? subscriptionId)> GetStripeIdsAsync(string orgId)
        {
            try
            {
                var adminToken = await _keycloakService.GetAdminTokenAsync();

                var userId = User.FindFirst("sub")?.Value
                          ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

                string? orgUuid = null;
                if (!string.IsNullOrEmpty(userId))
                    orgUuid = await _keycloakService.GetUserOrgUuidAsync(adminToken, userId);

                if (string.IsNullOrEmpty(orgUuid))
                {
                    _logger.LogWarning("GetStripeIdsAsync: could not resolve org UUID for user '{UserId}'.", userId);
                    return (null, null);
                }

                return await _keycloakService.GetOrgStripeAttributesAsync(adminToken, orgUuid);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to retrieve Stripe IDs for org {OrgId}.", orgId);
                return (null, null);
            }
        }

        private string ResolvePlanName(string? priceId, string? productName, string? nickname) =>
            (!string.IsNullOrEmpty(priceId) && _priceIdToLabel.TryGetValue(priceId, out var label))
                ? label
                : productName ?? nickname ?? priceId ?? "Unknown Plan";

        private static string MapStatus(string stripeStatus) => stripeStatus switch
        {
            "active"   => "Active",
            "canceled" => "Cancelled",
            "past_due" => "Past Due",
            "trialing" => "Trialing",
            "unpaid"   => "Unpaid",
            _          => stripeStatus
        };
    }

    public class ChangePlanRequest
    {
        public string? PlanId { get; set; }
    }
}
