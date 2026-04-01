using Microsoft.AspNetCore.Http;
using System.Threading;
using System.Threading.Tasks;

namespace S365.Search.Admin.UI.Services
{
    /// <summary>
    /// Represents the result of a token refresh attempt.
    /// </summary>
    public class TokenRefreshResult
    {
        public bool IsSuccess { get; init; }
        public bool IsRefreshTokenExpired { get; init; }
        public string? AccessToken { get; init; }
        public string? IdToken { get; init; }
        public string? RefreshToken { get; init; }
        public int ExpiresIn { get; init; }
        public int RefreshExpiresIn { get; init; }
        public string? SessionState { get; init; }
        public string? Scope { get; init; }
        public int NotBeforePolicy { get; init; }
        public string? ErrorMessage { get; init; }
    }

    /// <summary>
    /// Reads the refresh token from the current server session, calls Keycloak to
    /// obtain new tokens, and updates the authentication cookie in-place.
    /// </summary>
    public interface ITokenRefreshService
    {
        /// <summary>
        /// Refreshes the access token stored in the session.
        /// On success, updates the authentication cookie and returns the new access token.
        /// On failure, indicates whether the refresh token itself is expired (requires re-login).
        /// </summary>
        /// <param name="httpContext">The current HTTP context containing the session cookie.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>A <see cref="TokenRefreshResult"/> describing the outcome.</returns>
        Task<TokenRefreshResult> RefreshAsync(HttpContext httpContext, CancellationToken cancellationToken = default);
    }
}
