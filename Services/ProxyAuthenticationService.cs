using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace S365.Search.Admin.UI.Services
{
    public class ProxyAuthenticationService : IProxyAuthenticationService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<ProxyAuthenticationService> _logger;

        public ProxyAuthenticationService(IConfiguration configuration, ILogger<ProxyAuthenticationService> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        public IActionResult ValidateTokenBeforeProxyIfEnabled(HttpRequest request, ClaimsPrincipal user)
        {
            if (!_configuration.GetValue<bool>("ProxyAuthentication:ValidateTokenEnabled"))
            {
                return null;
            }

            var authHeader = request.Headers["Authorization"].ToString();
            var isCookieAuthenticated = user?.Identity?.IsAuthenticated == true;

            if (string.IsNullOrWhiteSpace(authHeader))
            {
                if (isCookieAuthenticated)
                {
                    return null;
                }

                return new UnauthorizedObjectResult(new { error = "Missing access token." });
            }

            if (!authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                return new UnauthorizedObjectResult(new { error = "Invalid authorization scheme." });
            }

            var token = authHeader.Substring("Bearer ".Length).Trim();
            if (string.IsNullOrWhiteSpace(token))
            {
                return new UnauthorizedObjectResult(new { error = "Missing bearer token." });
            }

            try
            {
                var tokenHandler = new JwtSecurityTokenHandler();
                var jwt = tokenHandler.ReadJwtToken(token);
                var expiresAt = jwt.ValidTo;

                _logger.LogDebug("Validated proxy token for subject {Subject}. Expires at {ExpiresAtUtc}.", jwt.Subject, expiresAt);

                if (expiresAt != DateTime.MinValue && expiresAt < DateTime.UtcNow)
                {
                    _logger.LogInformation("Token detected as expired. ValidTo: {ValidTo}", jwt.ValidTo);
                    return new UnauthorizedObjectResult(new { error = "Token has expired." });
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Proxy token format is invalid.");
                return new UnauthorizedObjectResult(new { error = "Token format is invalid." });
            }

            _logger.LogDebug("Proxy token validation succeeded.");
            return null;
        }
    }
}