using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using S365.Search.Admin.UI.Models;
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Security.Claims;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace S365.Search.Admin.UI.Middleware
{
    public class JwtValidationMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<JwtValidationMiddleware> _logger;
        private readonly string _issuer;
        private readonly string _clientId;
        private readonly KeycloakTokenSettings _tokenSettings;

        public JwtValidationMiddleware(
            RequestDelegate next,
            IConfiguration configuration,
            IOptions<KeycloakTokenSettings> tokenSettings,
            ILogger<JwtValidationMiddleware> logger)
        {
            _next = next;
            _logger = logger;
            _issuer = configuration["KeycloakAuthentication:Authority"] ?? string.Empty;
            _clientId = configuration["KeycloakAuthentication:ClientId"] ?? string.Empty;
            _tokenSettings = tokenSettings.Value;

            // Warn when expiry settings are absent so operators know defaults are in effect.
            if (configuration["KeycloakAuthentication:AccessTokenExpirySeconds"] == null)
                _logger.LogWarning(
                    "KeycloakAuthentication:AccessTokenExpirySeconds is not configured. " +
                    "Falling back to default of {Default}s. " +
                    "Ensure this matches your Keycloak realm's 'Access Token Lifespan'.",
                    KeycloakTokenSettings.DefaultAccessTokenExpirySeconds);

            if (configuration["KeycloakAuthentication:RefreshTokenExpirySeconds"] == null)
                _logger.LogWarning(
                    "KeycloakAuthentication:RefreshTokenExpirySeconds is not configured. " +
                    "Falling back to default of {Default}s.",
                    KeycloakTokenSettings.DefaultRefreshTokenExpirySeconds);

            if (configuration["KeycloakAuthentication:SilentRefreshThresholdSeconds"] == null)
                _logger.LogWarning(
                    "KeycloakAuthentication:SilentRefreshThresholdSeconds is not configured. " +
                    "Falling back to default of {Default}s.",
                    KeycloakTokenSettings.DefaultSilentRefreshThresholdSeconds);

            _logger.LogInformation(
                "JwtValidationMiddleware initialised: " +
                "AccessTokenExpiry={AccessExpiry}s, RefreshTokenExpiry={RefreshExpiry}s, " +
                "SilentRefreshThreshold={Threshold}s.",
                _tokenSettings.AccessTokenExpirySeconds,
                _tokenSettings.RefreshTokenExpirySeconds,
                _tokenSettings.SilentRefreshThresholdSeconds);
        }

        public async Task InvokeAsync(
            HttpContext context,
            IConfigurationManager<OpenIdConnectConfiguration> configManager)
        {
            // Allow anonymous endpoints through without any auth check
            var endpoint = context.GetEndpoint();
            if (endpoint?.Metadata.GetMetadata<IAllowAnonymous>() != null)
            {
                await _next(context);
                return;
            }

            // Cookie-authenticated users (browser session) pass through
            if (context.User?.Identity?.IsAuthenticated == true)
            {
                await _next(context);
                return;
            }

            var authHeader = context.Request.Headers["Authorization"].ToString();

            // No Authorization header on a protected endpoint → 401
            if (string.IsNullOrWhiteSpace(authHeader))
            {
                await WriteUnauthorized(context, "Missing Authorization header.");
                return;
            }

            if (!authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                await WriteUnauthorized(context, "Invalid authorization scheme. Expected Bearer.");
                return;
            }

            var token = authHeader.Substring("Bearer ".Length).Trim();
            if (string.IsNullOrWhiteSpace(token))
            {
                await WriteUnauthorized(context, "Missing bearer token.");
                return;
            }

            try
            {
                // Fetch signing keys from Keycloak's JWKS endpoint.
                // ConfigurationManager caches the keys and automatically re-fetches
                // when a token references an unknown key ID (handles key rotation).
                var oidcConfig = await configManager.GetConfigurationAsync(CancellationToken.None);

                var validationParameters = BuildValidationParameters(oidcConfig.SigningKeys);

                var tokenHandler = new JwtSecurityTokenHandler();
                var principal = tokenHandler.ValidateToken(token, validationParameters, out var validatedToken);

                // Enforce the app-configured expiry window on top of standard lifetime validation.
                // This rejects tokens whose age exceeds AccessTokenExpirySeconds even when the
                // Keycloak realm is misconfigured with a longer access-token lifespan.
                if (!IsWithinConfiguredExpiryWindow(validatedToken, out var ageReason))
                {
                    _logger.LogInformation("JWT rejected: {Reason}", ageReason);
                    await WriteUnauthorized(context, "Token has exceeded the configured expiry window.");
                    return;
                }

                _logger.LogDebug(
                    "JWT validated for subject {Subject}, expires {Expiry}.",
                    (validatedToken as JwtSecurityToken)?.Subject,
                    validatedToken.ValidTo);

                // Populate HttpContext.User with claims from the validated token
                context.User = principal;

                await _next(context);
            }
            catch (SecurityTokenExpiredException)
            {
                _logger.LogInformation("JWT rejected: token has expired.");
                await WriteUnauthorized(context, "Token has expired.");
            }
            catch (SecurityTokenSignatureKeyNotFoundException)
            {
                // The token was signed with a key we don't have yet — force a JWKS refresh and retry once
                _logger.LogInformation("JWT signing key not found locally. Refreshing JWKS and retrying.");
                configManager.RequestRefresh();

                try
                {
                    var refreshedConfig = await configManager.GetConfigurationAsync(CancellationToken.None);
                    var validationParameters = BuildValidationParameters(refreshedConfig.SigningKeys);

                    var tokenHandler = new JwtSecurityTokenHandler();
                    var principal = tokenHandler.ValidateToken(token, validationParameters, out var validatedToken);

                    if (!IsWithinConfiguredExpiryWindow(validatedToken, out var ageReason))
                    {
                        _logger.LogInformation("JWT rejected after JWKS refresh: {Reason}", ageReason);
                        await WriteUnauthorized(context, "Token has exceeded the configured expiry window.");
                        return;
                    }

                    context.User = principal;
                    await _next(context);
                }
                catch (SecurityTokenException ex)
                {
                    _logger.LogWarning("JWT validation failed after JWKS refresh: {Message}", ex.Message);
                    await WriteUnauthorized(context, "Token is invalid.");
                }
            }
            catch (SecurityTokenException ex)
            {
                _logger.LogWarning("JWT validation failed: {Message}", ex.Message);
                await WriteUnauthorized(context, "Token is invalid.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during JWT validation.");
                await WriteUnauthorized(context, "Authentication error.");
            }
        }

        /// <summary>
        /// Checks whether the token's age (now − iat) is within the configured
        /// <see cref="KeycloakTokenSettings.AccessTokenExpirySeconds"/> window.
        /// A 30-second clock-skew allowance is applied.
        /// Returns <c>true</c> if the token is still within the window.
        /// </summary>
        private bool IsWithinConfiguredExpiryWindow(SecurityToken validatedToken, out string reason)
        {
            reason = string.Empty;

            if (validatedToken is not JwtSecurityToken jwt)
                return true; // Cannot inspect — defer to standard lifetime validation

            var issuedAt = jwt.IssuedAt; // UTC DateTime; DateTime.MinValue when claim is absent
            if (issuedAt == DateTime.MinValue)
                return true; // No iat claim — defer to exp-based validation

            var clockSkew = TimeSpan.FromSeconds(30);
            var configuredExpiry = issuedAt.AddSeconds(_tokenSettings.AccessTokenExpirySeconds);

            if (DateTime.UtcNow > configuredExpiry.Add(clockSkew))
            {
                reason = $"Token age exceeds configured AccessTokenExpirySeconds " +
                         $"({_tokenSettings.AccessTokenExpirySeconds}s). " +
                         $"Issued at {issuedAt:O}, checked at {DateTime.UtcNow:O}.";
                return false;
            }

            return true;
        }

        private TokenValidationParameters BuildValidationParameters(
            System.Collections.Generic.IEnumerable<SecurityKey> signingKeys)
        {
            return new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = _issuer,
                ValidateAudience = true,
                ValidAudiences = new[] { _clientId, "account" },
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                IssuerSigningKeys = signingKeys,
                ClockSkew = TimeSpan.FromSeconds(30)
            };
        }

        private static Task WriteUnauthorized(HttpContext context, string message)
        {
            context.Response.StatusCode = (int)HttpStatusCode.Unauthorized;
            context.Response.ContentType = "application/json";
            var body = JsonSerializer.Serialize(new { error = "Unauthorized", message });
            return context.Response.WriteAsync(body);
        }
    }
}
