namespace S365.Search.Admin.UI.Models
{
    /// <summary>
    /// Strongly-typed settings for Keycloak token expiry and refresh behaviour.
    /// Bound from the <c>KeycloakAuthentication</c> configuration section so that
    /// values can be changed per environment without a code change or redeployment.
    ///
    /// These values MUST align with the corresponding Keycloak realm settings
    /// (Realm → Tokens → Access Token Lifespan / SSO Session Idle):
    ///   AccessTokenExpirySeconds   → Keycloak "Access Token Lifespan"
    ///   RefreshTokenExpirySeconds  → Keycloak "SSO Session Idle" (or client-level refresh TTL)
    ///   SilentRefreshThresholdSeconds → app-level only; no matching Keycloak setting
    /// </summary>
    public class KeycloakTokenSettings
    {
        public const int DefaultAccessTokenExpirySeconds = 300;
        public const int DefaultRefreshTokenExpirySeconds = 1800;
        public const int DefaultSilentRefreshThresholdSeconds = 60;

        /// <summary>
        /// How many seconds an access token is valid for.
        /// The .NET JWT middleware enforces this as a hard upper-bound on token age
        /// (based on the <c>iat</c> claim) so that tokens cannot live longer than this
        /// window even if the Keycloak realm is misconfigured with a longer lifespan.
        /// Default: 300 (5 minutes).
        /// </summary>
        public int AccessTokenExpirySeconds { get; set; } = DefaultAccessTokenExpirySeconds;

        /// <summary>
        /// How many seconds a refresh token is valid for.
        /// Used as the fallback value in token API responses when Keycloak does not
        /// return a <c>refresh_expires_in</c> field.
        /// Default: 1800 (30 minutes).
        /// </summary>
        public int RefreshTokenExpirySeconds { get; set; } = DefaultRefreshTokenExpirySeconds;

        /// <summary>
        /// How many seconds before access-token expiry the React client should
        /// proactively trigger a silent token refresh.
        /// Passed to the frontend via the <c>/api/token</c> and <c>/api/auth/refresh</c>
        /// responses as <c>silent_refresh_threshold_seconds</c>.
        /// Default: 60 (1 minute before expiry).
        /// </summary>
        public int SilentRefreshThresholdSeconds { get; set; } = DefaultSilentRefreshThresholdSeconds;
    }
}
