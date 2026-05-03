using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Stripe;
using Stripe.Checkout;

namespace S365.Search.Admin.UI.Services
{
    public class StripeService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<StripeService> _logger;

        // Maps plan identifiers (sent from frontend) to config keys
        private static readonly Dictionary<string, string> PlanConfigKeys = new()
        {
            { "essentials_monthly", "EssentialsMonthly" },
            { "essentials_annual", "EssentialsAnnual" },
            { "ai_search_monthly", "AiSearchMonthly" },
            { "ai_search_annual", "AiSearchAnnual" },
        };

        public StripeService(IConfiguration configuration, ILogger<StripeService> logger)
        {
            _configuration = configuration;
            _logger = logger;
            // ApiKey is set once at startup in Startup.ConfigureServices — not here,
            // because StripeService is Scoped and would re-assign the process-global on every request.
        }

        /// <summary>
        /// Resolves a plan identifier (e.g. "essentials_monthly") to its Stripe Price ID from config.
        /// Returns null if the plan identifier is not recognised.
        /// </summary>
        public string? ResolvePriceId(string planId)
        {
            if (!PlanConfigKeys.TryGetValue(planId, out var configKey))
                return null;

            var priceId = _configuration[$"Stripe:Prices:{configKey}"];

            // Treat blank config values the same as missing — caller gets null and returns 400,
            // rather than a cryptic Stripe API error for an empty Price ID.
            return string.IsNullOrWhiteSpace(priceId) ? null : priceId;
        }

        /// <summary>
        /// Creates a Stripe Customer for an organisation.
        /// </summary>
        public async Task<string> CreateCustomerAsync(string orgId, string orgName, string email)
        {
            var options = new CustomerCreateOptions
            {
                Email = email,
                Name = orgName,
                Metadata = new Dictionary<string, string>
                {
                    { "organisationId", orgId },
                    { "organisationName", orgName },
                },
            };

            var service = new CustomerService();
            var customer = await service.CreateAsync(options);

            _logger.LogInformation(
                "Created Stripe customer {CustomerId} for organisation '{OrgName}'.",
                customer.Id,
                orgName
            );

            return customer.Id;
        }

        /// <summary>
        /// Creates a Stripe Checkout Session for a subscription.
        /// Embeds organisationId and userId in metadata so the webhook can identify them.
        /// </summary>
        public async Task<string> CreateCheckoutSessionAsync(
            string customerId,
            string priceId,
            Dictionary<string, string> metadata
        )
        {
            var baseUrl = _configuration["Application:BaseUrl"]?.TrimEnd('/') ?? "";

            var successUrl =
                _configuration["Stripe:SuccessUrl"]
                ?? $"{baseUrl}/portal/billing/success?session_id={{CHECKOUT_SESSION_ID}}";

            var cancelUrl =
                _configuration["Stripe:CancelUrl"] ?? $"{baseUrl}/portal/register?cancelled=true";

            var options = new SessionCreateOptions
            {
                Customer = customerId,
                Mode = "subscription",
                PaymentMethodTypes = new List<string> { "card" },
                LineItems = new List<SessionLineItemOptions>
                {
                    new SessionLineItemOptions { Price = priceId, Quantity = 1 },
                },
                SuccessUrl = successUrl,
                CancelUrl = cancelUrl,
                SubscriptionData = new SessionSubscriptionDataOptions { Metadata = metadata },
            };

            var service = new SessionService();
            var session = await service.CreateAsync(options);

            _logger.LogInformation(
                "Created Stripe Checkout session {SessionId} for organisation '{OrgId}'.",
                session.Id,
                metadata.GetValueOrDefault("orgInternalName")
            );

            return session.Url;
        }

        /// <summary>
        /// Deletes a Stripe Customer. Used during registration rollback to avoid orphaned customers.
        /// </summary>
        public async Task DeleteCustomerAsync(string customerId)
        {
            var service = new CustomerService();
            await service.DeleteAsync(customerId);
            _logger.LogInformation(
                "Deleted Stripe customer {CustomerId} during rollback.",
                customerId
            );
        }

        /// <summary>
        /// Parses and validates an incoming Stripe webhook event.
        /// Throws StripeException if the signature is invalid.
        /// </summary>
        public Event ConstructWebhookEvent(string json, string signature)
        {
            var webhookSecret = _configuration["Stripe:WebhookSecret"];
            return EventUtility.ConstructEvent(json, signature, webhookSecret);
        }
    }
}
