using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;

namespace S365.Search.Admin.UI.Services
{
    /// <summary>
    /// Refreshes the server-side session tokens by exchanging the stored refresh token
    /// with Keycloak and updating the authentication cookie in-place.
    /// </summary>
    public class TokenRefreshService : ITokenRefreshService
    {
        private readonly KeycloakService _keycloakService;
        private readonly ILogger<TokenRefreshService> _logger;

        public TokenRefreshService(KeycloakService keycloakService, ILogger<TokenRefreshService> logger)
        {
            _keycloakService = keycloakService;
            _logger = logger;
        }

        /// <inheritdoc />
        public async Task<TokenRefreshResult> RefreshAsync(HttpContext httpContext, CancellationToken cancellationToken = default)
        {
            Console.WriteLine("[TokenRefreshService] RefreshAsync started.");
            
            // Step 1: Read the stored refresh token from the server session
            var refreshToken = await httpContext.GetTokenAsync("refresh_token");

            if (string.IsNullOrWhiteSpace(refreshToken))
            {
                Console.WriteLine("[TokenRefreshService] No refresh token found in session.");
                _logger.LogWarning("Token refresh attempted but no refresh token found in session.");
                return new TokenRefreshResult
                {
                    IsSuccess = false,
                    IsRefreshTokenExpired = true,
                    ErrorMessage = "No refresh token available in session."
                };
            }

            Console.WriteLine("[TokenRefreshService] Refresh token found. Exchanging with Keycloak...");
            try
            {
                // Step 2: Call Keycloak to exchange for new tokens
                var newTokens = await _keycloakService.RefreshTokenAsync(refreshToken);

                Console.WriteLine("[TokenRefreshService] Keycloak exchange successful. Updating session cookie...");
                // Step 3: Update the authentication cookie with the new tokens
                await UpdateSessionTokensAsync(httpContext, newTokens);

                Console.WriteLine($"[TokenRefreshService] Session updated successfully for user {httpContext.User?.Identity?.Name}.");
                _logger.LogInformation("Access token refreshed successfully for user {User}.", httpContext.User?.Identity?.Name);

                var idToken = await httpContext.GetTokenAsync("id_token");
                var scope = await httpContext.GetTokenAsync("scope");

                return new TokenRefreshResult
                {
                    IsSuccess = true,
                    AccessToken = newTokens.AccessToken,
                    IdToken = idToken,
                    RefreshToken = newTokens.RefreshToken,
                    ExpiresIn = newTokens.ExpiresIn,
                    RefreshExpiresIn = newTokens.RefreshExpiresIn,
                    SessionState = newTokens.SessionState,
                    Scope = scope ?? "email profile",
                    NotBeforePolicy = newTokens.NotBeforePolicy
                };
            }
            catch (Exception ex) when (IsRefreshTokenExpiredException(ex))
            {
                Console.WriteLine($"[TokenRefreshService] Refresh token expired or invalid. Error: {ex.Message}");
                // Keycloak returned 400/401, meaning the refresh token is invalid or expired
                _logger.LogWarning("Refresh token is expired or invalid for user {User}. Logout required.", httpContext.User?.Identity?.Name);
                return new TokenRefreshResult
                {
                    IsSuccess = false,
                    IsRefreshTokenExpired = true,
                    ErrorMessage = "Refresh token has expired. Please log in again."
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[TokenRefreshService] Unexpected error during refresh: {ex.Message}");
                _logger.LogError(ex, "Unexpected error occurred while refreshing token for user {User}.", httpContext.User?.Identity?.Name);
                return new TokenRefreshResult
                {
                    IsSuccess = false,
                    IsRefreshTokenExpired = false,
                    ErrorMessage = "An unexpected error occurred while refreshing the token."
                };
            }
        }

        private static async Task UpdateSessionTokensAsync(HttpContext httpContext, Models.SwitchContextResponse newTokens)
        {
            var authenticateResult = await httpContext.AuthenticateAsync(CookieAuthenticationDefaults.AuthenticationScheme);

            if (authenticateResult?.Principal == null)
            {
                throw new InvalidOperationException("Cannot update session: no active cookie authentication found.");
            }

            // Deep-copy the properties dictionary to avoid IndexOutOfRangeException caused by
            // concurrent reads from the shared SessionStore reference. Multiple in-flight requests
            // from the same browser share the same AuthenticationTicket object (and its Items dict),
            // so writing to it while another request reads it corrupts the Dictionary internals.
            var originalItems = authenticateResult.Properties?.Items
                ?? new Dictionary<string, string?>();
            var freshProperties = new AuthenticationProperties(
                originalItems.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));

            var existingTokens = freshProperties.GetTokens().ToList();
            var updatedTokens = new List<AuthenticationToken>(existingTokens);

            SetToken(updatedTokens, "access_token", newTokens.AccessToken ?? "");
            SetToken(updatedTokens, "expires_in", newTokens.ExpiresIn.ToString());
            SetToken(updatedTokens, "refresh_expires_in", newTokens.RefreshExpiresIn.ToString());
            if (!string.IsNullOrEmpty(newTokens.RefreshToken))
                SetToken(updatedTokens, "refresh_token", newTokens.RefreshToken);
            if (!string.IsNullOrEmpty(newTokens.SessionState))
                SetToken(updatedTokens, "session_state", newTokens.SessionState);

            // Deduplicate by name (last value wins) before storing to prevent StoreTokens
            // from writing a semicolon-separated TokenNamesKey with duplicate entries.
            var deduped = new Dictionary<string, string>(StringComparer.Ordinal);
            foreach (var t in updatedTokens)
            {
                if (t.Name != null)
                    deduped[t.Name] = t.Value ?? "";
            }
            var finalTokens = deduped
                .Select(kvp => new AuthenticationToken { Name = kvp.Key, Value = kvp.Value })
                .ToList();

            freshProperties.StoreTokens(finalTokens);

            await httpContext.SignInAsync(
                CookieAuthenticationDefaults.AuthenticationScheme,
                authenticateResult.Principal,
                freshProperties);
        }

        private static void SetToken(List<AuthenticationToken> tokens, string name, string value)
        {
            var existing = tokens.Find(t => t.Name == name);
            if (existing != null)
            {
                existing.Value = value;
            }
            else
            {
                tokens.Add(new AuthenticationToken { Name = name, Value = value });
            }
        }

        // Keycloak returns HttpRequestException with status 400 or 401 when the refresh token is invalid
        private static bool IsRefreshTokenExpiredException(Exception ex)
        {
            if (ex is HttpRequestException httpEx)
            {
                return httpEx.StatusCode == System.Net.HttpStatusCode.BadRequest
                    || httpEx.StatusCode == System.Net.HttpStatusCode.Unauthorized;
            }
            // EnsureSuccessStatusCode throws HttpRequestException, which is caught above,
            // but also can throw InvalidOperationException in edge cases
            return ex.Message.Contains("400") || ex.Message.Contains("401");
        }
    }
}
