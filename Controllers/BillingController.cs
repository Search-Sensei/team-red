using System;
using System.IO;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using S365.Search.Admin.UI.Services;
using Stripe;
using Stripe.Checkout;

namespace S365.Search.Admin.UI.Controllers
{
    [ApiController]
    [Route("portal/api/billing")]
    public class BillingController : ControllerBase
    {
        private readonly StripeService _stripeService;
        private readonly KeycloakService _keycloakService;
        private readonly ILogger<BillingController> _logger;
        private readonly IConfiguration _configuration;

        public BillingController(
            StripeService stripeService,
            KeycloakService keycloakService,
            ILogger<BillingController> logger,
            IConfiguration configuration
        )
        {
            _stripeService = stripeService;
            _keycloakService = keycloakService;
            _logger = logger;
            _configuration = configuration;
        }

        /// <summary>
        /// Stripe webhook endpoint. Receives and processes Stripe events.
        /// Must read raw body for signature verification — no [FromBody] parameter.
        /// </summary>
        [AllowAnonymous]
        [HttpPost("webhook")]
        public async Task<IActionResult> Webhook()
        {
            var json = await new StreamReader(HttpContext.Request.Body).ReadToEndAsync();
            var signature = Request.Headers["Stripe-Signature"].ToString();

            Event stripeEvent;
            try
            {
                stripeEvent = _stripeService.ConstructWebhookEvent(json, signature);
            }
            catch (StripeException ex)
            {
                _logger.LogWarning(
                    "Stripe webhook signature validation failed: {Message}",
                    ex.Message
                );
                return BadRequest(new { error = "Invalid webhook signature." });
            }

            _logger.LogInformation(
                "Stripe webhook received: {EventType} {EventId}",
                stripeEvent.Type,
                stripeEvent.Id
            );

            try
            {
                switch (stripeEvent.Type)
                {
                    case EventTypes.CheckoutSessionCompleted:
                        await HandleCheckoutSessionCompletedAsync(stripeEvent);
                        break;

                    case EventTypes.CustomerSubscriptionDeleted:
                        await HandleSubscriptionDeletedAsync(stripeEvent);
                        break;

                    default:
                        _logger.LogInformation(
                            "Unhandled Stripe event type: {EventType}",
                            stripeEvent.Type
                        );
                        break;
                }
            }
            catch (HttpRequestException ex)
            {
                // Transient infrastructure failure (Keycloak unreachable, timeout, etc.).
                // Return 5xx so Stripe retries — the payment succeeded and the user must be enabled.
                _logger.LogError(
                    ex,
                    "Transient error processing Stripe webhook event {EventId}. Returning 500 for Stripe retry.",
                    stripeEvent.Id
                );
                return StatusCode(
                    500,
                    new { error = "Upstream service temporarily unavailable. Stripe should retry." }
                );
            }
            catch (Exception ex)
            {
                // Non-retryable business logic error (bad metadata, etc.).
                // Return 200 so Stripe does not retry endlessly; the error is logged for manual investigation.
                _logger.LogError(
                    ex,
                    "Non-retryable error processing Stripe webhook event {EventId}. Manual intervention may be required.",
                    stripeEvent.Id
                );
            }

            return Ok();
        }

        /// <summary>
        /// Called by the frontend success page to confirm the session is complete.
        /// Returns plan and subscription info to display in the confirmation UI.
        /// </summary>
        [AllowAnonymous]
        [HttpGet("checkout-result")]
        public async Task<IActionResult> CheckoutResult([FromQuery] string session_id)
        {
            if (string.IsNullOrWhiteSpace(session_id))
                return BadRequest(new { error = "session_id is required." });

            try
            {
                var service = new SessionService();
                var session = await service.GetAsync(
                    session_id,
                    new SessionGetOptions
                    {
                        Expand = new System.Collections.Generic.List<string>
                        {
                            "line_items",
                            "subscription",
                        },
                    }
                );

                if (session.PaymentStatus != "paid" && session.Status != "complete")
                    return BadRequest(new { error = "Payment not completed." });

                var planName =
                    session.LineItems?.Data?.Count > 0
                        ? session.LineItems.Data[0].Description
                        : "your subscription";

                // Omit PII (customerEmail) and internal IDs (subscriptionId) from the anonymous
                // response — session IDs appear in browser history and referrer headers, so any
                // captured ID should not leak customer data or billing identifiers.
                return Ok(new { status = "success", planName });
            }
            catch (StripeException ex)
            {
                _logger.LogWarning(
                    "Failed to retrieve checkout session {SessionId}: {Message}",
                    session_id,
                    ex.Message
                );
                return BadRequest(new { error = "Unable to retrieve checkout session." });
            }
        }

        // ── Private handlers ────────────────────────────────────────────────────

        private async Task HandleCheckoutSessionCompletedAsync(Event stripeEvent)
        {
            if (stripeEvent.Data.Object is not Session session)
                return;

            var subscription = await new SubscriptionService().GetAsync(session.SubscriptionId);
            var meta = subscription.Metadata;

            var adminToken = await _keycloakService.GetAdminTokenAsync();

            string orgId,
                userId;

            try
            {
                orgId = await _keycloakService.CreateOrganizationAsync(
                    adminToken,
                    meta["orgInternalName"],
                    meta["orgDisplayName"],
                    meta["contactPerson"],
                    meta["contactPhone"],
                    meta["orgUrl"]
                );
            }
            catch (Exception ex) when (ex.Message.Contains("Conflict"))
            {
                _logger.LogWarning(
                    "Duplicate webhook for subscription {SubId}.",
                    session.SubscriptionId
                );

                return;
            }

            try
            {
                userId = await _keycloakService.CreateUserAsync(
                    adminToken,
                    meta["email"],
                    meta["contactPerson"],
                    meta["orgInternalName"],
                    enabled: true,
                    pendingOrgId: orgId
                );
            }
            catch (Exception)
            {
                await _keycloakService.DeleteOrganizationAsync(adminToken, orgId);
                _logger.LogError(
                    "User {Email} already exists on subscription {SubId}.",
                    meta["email"],
                    session.SubscriptionId
                );

                throw;
            }

            await _keycloakService.AddUserToOrganizationAsync(adminToken, orgId, userId);

            var clientId = _configuration["KeycloakAuthentication:ClientId"] ?? "osp-adminui";
            var clientUuid = await _keycloakService.GetClientUuidAsync(adminToken, clientId);

            var (roleId, roleName) = await _keycloakService.GetClientRoleAsync(
                adminToken,
                clientUuid,
                "org-admin"
            );

            await _keycloakService.AssignClientRoleToUserAsync(
                adminToken,
                userId,
                clientUuid,
                roleId,
                roleName
            );

            var appBaseUrl =
                _configuration["Application:BaseUrl"] ?? $"{Request.Scheme}://{Request.Host}";
            var redirectUri = appBaseUrl.TrimEnd('/') + "/";
            await _keycloakService.SendExecuteActionsEmailAsync(
                adminToken,
                userId,
                clientId,
                redirectUri
            );

            _logger.LogInformation("Organisation '{OrgName}' provisioned.", meta["orgDisplayName"]);
            return;
        }

        private Task HandleSubscriptionDeletedAsync(Event stripeEvent)
        {
            if (stripeEvent.Data.Object is not Subscription subscription)
                return Task.CompletedTask;

            subscription.Metadata.TryGetValue("organisationId", out var organisationId);
            if (string.IsNullOrEmpty(organisationId))
            {
                _logger.LogWarning(
                    "customer.subscription.deleted missing organisationId in metadata."
                );
                return Task.CompletedTask;
            }

            _logger.LogInformation(
                "Subscription cancelled for org={OrgId}. Sub={SubId}.",
                organisationId,
                subscription.Id
            );

            // Future: mark org subscription status as Cancelled in Keycloak attributes
            // For now we log — the dashboard subscription status story can extend this
            return Task.CompletedTask;
        }
    }
}
