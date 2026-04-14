using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
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

        public JwtValidationMiddleware(
            RequestDelegate next,
            IConfiguration configuration,
            ILogger<JwtValidationMiddleware> logger)
        {
            _next = next;
            _logger = logger;
            _issuer = configuration["KeycloakAuthentication:Authority"] ?? string.Empty;
            _clientId = configuration["KeycloakAuthentication:ClientId"] ?? string.Empty;
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

                var validationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = _issuer,
                    ValidateAudience = true,
                    ValidAudiences = new[] { _clientId, "account" },
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKeys = oidcConfig.SigningKeys,
                    ClockSkew = TimeSpan.FromSeconds(30)
                };

                var tokenHandler = new JwtSecurityTokenHandler();
                var principal = tokenHandler.ValidateToken(token, validationParameters, out var validatedToken);

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
                    var validationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidIssuer = _issuer,
                        ValidateAudience = true,
                        ValidAudiences = new[] { _clientId, "account" },
                        ValidateLifetime = true,
                        ValidateIssuerSigningKey = true,
                        IssuerSigningKeys = refreshedConfig.SigningKeys,
                        ClockSkew = TimeSpan.FromSeconds(30)
                    };

                    var tokenHandler = new JwtSecurityTokenHandler();
                    var principal = tokenHandler.ValidateToken(token, validationParameters, out _);
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

        private static Task WriteUnauthorized(HttpContext context, string message)
        {
            context.Response.StatusCode = (int)HttpStatusCode.Unauthorized;
            context.Response.ContentType = "application/json";
            var body = JsonSerializer.Serialize(new { error = "Unauthorized", message });
            return context.Response.WriteAsync(body);
        }
    }
}
