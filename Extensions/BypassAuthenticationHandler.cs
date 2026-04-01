using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Threading.Tasks;

namespace S365.Search.Admin.UI.Extensions
{
    /// <summary>
    /// Authentication handler used when KeycloakAuthentication:IsEnabled = false.
    /// Auto-authenticates every request as a local bypass user so that
    /// [Authorize] attributes continue to work without Keycloak being configured.
    /// The frontend receives IsAuthenticationEnabled=false from /account/getuserdetails
    /// and treats the session as a guest admin login.
    /// </summary>
    public class BypassAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        public const string SchemeName = "BypassAuthentication";

        public BypassAuthenticationHandler(
            IOptionsMonitor<AuthenticationSchemeOptions> options,
            ILoggerFactory logger,
            UrlEncoder encoder)
            : base(options, logger, encoder) { }

        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            var claims = new[]
            {
                new Claim(ClaimTypes.Name, "local-admin"),
                new Claim(ClaimTypes.Email, "admin@local"),
                new Claim(ClaimTypes.Role, "admin")
            };
            var identity = new ClaimsIdentity(claims, SchemeName);
            var principal = new ClaimsPrincipal(identity);
            var ticket = new AuthenticationTicket(principal, SchemeName);
            return Task.FromResult(AuthenticateResult.Success(ticket));
        }
    }
}
