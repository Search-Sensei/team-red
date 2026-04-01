using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Http;
using S365.Search.Admin.UI.Models;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;

namespace S365.Search.Admin.UI.Services
{
    public class TenantContextService : ITenantContextService
    {
        private readonly KeycloakService _keycloakService;

        public TenantContextService(KeycloakService keycloakService)
        {
            _keycloakService = keycloakService;
        }

        public async Task<SwitchContextResponse> SwitchContextAsync(HttpContext httpContext, ClaimsPrincipal user, SwitchContextRequest request)
        {
            var refreshToken = request?.RefreshToken;
            if (string.IsNullOrWhiteSpace(refreshToken) && user?.Identity?.IsAuthenticated == true)
            {
                refreshToken = await httpContext.GetTokenAsync("refresh_token");
            }

            if (string.IsNullOrWhiteSpace(refreshToken))
            {
                throw new ArgumentException("refresh_token is required (or sign in via Keycloak so it is read from cookie).");
            }

            if (string.IsNullOrWhiteSpace(request?.ActiveTenant))
            {
                throw new ArgumentException("active_tenant is required.");
            }

            var switchRequest = new SwitchContextRequest { RefreshToken = refreshToken, ActiveTenant = request.ActiveTenant };
            var response = await _keycloakService.SwitchContextAsync(switchRequest);

            var clonedClaims = new List<Claim>();
            foreach (var claim in user?.Claims ?? new List<Claim>())
            {
                if (claim.Type == "tenant")
                {
                    continue;
                }

                clonedClaims.Add(new Claim(claim.Type, claim.Value, claim.ValueType, claim.Issuer));
            }

            clonedClaims.Add(new Claim("tenant", request.ActiveTenant));

            var newIdentity = new ClaimsIdentity(clonedClaims, user?.Identity?.AuthenticationType);

            var authProperties = new AuthenticationProperties
            {
                IsPersistent = true,
                ExpiresUtc = DateTimeOffset.UtcNow.AddHours(8)
            };

            var tokens = new List<AuthenticationToken>
            {
                new AuthenticationToken { Name = "access_token", Value = response.AccessToken },
                new AuthenticationToken { Name = "token_type", Value = response.TokenType },
                new AuthenticationToken { Name = "expires_in", Value = response.ExpiresIn.ToString() },
                new AuthenticationToken { Name = "refresh_expires_in", Value = response.RefreshExpiresIn.ToString() },
                new AuthenticationToken { Name = "not_before_policy", Value = response.NotBeforePolicy.ToString() }
            };

            if (!string.IsNullOrEmpty(response.RefreshToken))
            {
                tokens.Add(new AuthenticationToken { Name = "refresh_token", Value = response.RefreshToken });
            }

            if (!string.IsNullOrEmpty(response.SessionState))
            {
                tokens.Add(new AuthenticationToken { Name = "session_state", Value = response.SessionState });
            }

            if (!string.IsNullOrEmpty(response.Scope))
            {
                tokens.Add(new AuthenticationToken { Name = "scope", Value = response.Scope });
            }

            authProperties.StoreTokens(tokens);

            await httpContext.SignInAsync(
                CookieAuthenticationDefaults.AuthenticationScheme,
                new ClaimsPrincipal(newIdentity),
                authProperties);

            return response;
        }
    }
}