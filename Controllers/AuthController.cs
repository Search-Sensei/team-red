using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using S365.Search.Admin.UI.Services;
using Swashbuckle.AspNetCore.Annotations;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;

namespace S365.Search.Admin.UI.Controllers
{
    public class AuthController : Controller
    {
        private readonly bool _keycloakEnabled;
        private readonly ILogger<AuthController> _logger;

        public AuthController(IConfiguration configuration, ILogger<AuthController> logger)
        {
            _keycloakEnabled = configuration.GetValue<bool>("KeycloakAuthentication:IsEnabled");
            _logger = logger;
        }

        [SwaggerOperation(Summary = "Account login with email prefill", 
            Description = "Initiates authentication flow with optional email prefill and custom return URL.")]
        [Route("account/login")]
        [HttpGet]
        public IActionResult AccountLogin([FromQuery] string email = null, [FromQuery] string returnUrl = null)
        {
            if (!_keycloakEnabled)
                return Redirect(string.IsNullOrEmpty(returnUrl) ? "/adminui" : returnUrl);

            var properties = new AuthenticationProperties
            {
                RedirectUri = string.IsNullOrEmpty(returnUrl) ? "/adminui" : returnUrl
            };

            // If email is provided, add it as login_hint to prefill Keycloak login form
            if (!string.IsNullOrEmpty(email))
            {
                properties.Items.Add("login_hint", email);
            }

            return Challenge(properties, OpenIdConnectDefaults.AuthenticationScheme);
        }

        [SwaggerOperation(Summary = "Account logout", 
            Description = "Signs out the current user and redirects to the admin UI home.")]
        [Route("account/logout")]
        [Route("/adminui/account/logout")]
        [HttpGet]
        [Authorize]
        public async Task<IActionResult> AccountLogout()
        {
            if (!_keycloakEnabled)
                return Redirect("/adminui");

            var properties = new AuthenticationProperties
            {
                RedirectUri = "/account/login?returnUrl=/adminui"
            };

            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return SignOut(properties, OpenIdConnectDefaults.AuthenticationScheme);
        }

        [SwaggerOperation(Summary = "User login with organization support", 
            Description = "Initiates login flow with optional organization context.")]
        [Route("login")]
        [HttpGet]
        public IActionResult Login([FromQuery] string org = null)
        {
            if (!_keycloakEnabled)
                return Redirect("/adminui");

            var properties = new AuthenticationProperties
            {
                RedirectUri = "/adminui"
            };

            // If organization is specified, add it to the authentication flow
            if (!string.IsNullOrEmpty(org))
            {
                properties.Parameters.Add("org", org);
            }

            return Challenge(properties, OpenIdConnectDefaults.AuthenticationScheme);
        }

        [SwaggerOperation(Summary = "User logout", 
            Description = "Signs out the user and ends the session.")]
        [Route("logout")]
        [HttpPost]
        [Authorize]
        public async Task<IActionResult> Logout()
        {
            if (!_keycloakEnabled)
                return Redirect("/adminui");

            var properties = new AuthenticationProperties
            {
                RedirectUri = "/account/login?returnUrl=/adminui"
            };

            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return SignOut(properties, OpenIdConnectDefaults.AuthenticationScheme);
        }

        [SwaggerOperation(Summary = "API login with organization support", 
            Description = "Initiates login flow for API consumers with optional organization context.")]
        [Route("api/auth/login")]
        [HttpGet]
        public IActionResult ApiLogin([FromQuery] string org = null)
        {
            if (!_keycloakEnabled)
                return Redirect("/adminui");

            var properties = new AuthenticationProperties
            {
                RedirectUri = "/adminui"
            };

            // If organization is specified, add it to the authentication flow
            if (!string.IsNullOrEmpty(org))
            {
                properties.Parameters.Add("org", org);
            }

            return Challenge(properties, OpenIdConnectDefaults.AuthenticationScheme);
        }

        [SwaggerOperation(Summary = "API logout", 
            Description = "Logs out the API user and terminates the session.")]
        [HttpPost("api/auth/logout")]
        [Authorize]
        public async Task<IActionResult> ApiLogout()
        {
            if (!_keycloakEnabled)
                return Redirect("/adminui");

            var properties = new AuthenticationProperties
            {
                RedirectUri = "/account/login?returnUrl=/adminui"
            };

            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return SignOut(properties, OpenIdConnectDefaults.AuthenticationScheme);
        }

        // Error route removed - using standard error handling



        [SwaggerOperation(Summary = "Get current authenticated user",
            Description = "Retrieves information about the currently authenticated user including name, email, organization, and roles.")]
        [HttpGet("api/auth/user")]
        [Authorize]
        public IActionResult GetCurrentUser()
        {
            var user = HttpContext.User;
            var userInfo = new
            {
                IsAuthenticated = user.Identity?.IsAuthenticated ?? false,
                Name = user.Identity?.Name ?? "",
                Email = user.FindFirst(ClaimTypes.Email)?.Value ?? "",
                Organization = user.FindFirst("org_id")?.Value ?? "",
                Roles = user.FindAll("roles").Select(c => c.Value).ToArray(),
                Claims = user.Claims.Select(c => new { c.Type, c.Value }).ToArray()
            };

            return Ok(userInfo);
        }

        [SwaggerOperation(Summary = "Get user organizations", 
            Description = "Retrieves list of organizations the user belongs to.")]
        [HttpGet("organizations")]
        [Authorize]
        public IActionResult GetUserOrganizations()
        {
            var user = HttpContext.User;
            var organizations = user.FindAll("organizations").Select(c => c.Value).ToArray();
            
            return Ok(new { organizations });
        }

        [SwaggerOperation(Summary = "Select organization context", 
            Description = "Sets the current organization context for the user session and obtains organization-specific token.")]
        [HttpPost("select-organization")]
        [Authorize]
        public IActionResult SelectOrganization([FromBody] SelectOrgRequest request)
        {
            if (!_keycloakEnabled)
            {
                return Ok(new
                {
                    message = "Keycloak authentication is disabled. Organization selection is not required in local bypass mode."
                });
            }

            if (string.IsNullOrEmpty(request.OrganizationId))
            {
                return BadRequest("Organization ID is required");
            }

            // Redirect to login with organization parameter to get org-specific token
            var properties = new AuthenticationProperties
            {
                RedirectUri = "/adminui"
            };
            properties.Parameters.Add("org", request.OrganizationId);

            return Challenge(properties, OpenIdConnectDefaults.AuthenticationScheme);
        }

        [SwaggerOperation(Summary = "Get authentication tokens", 
            Description = "Retrieves current access token, ID token, refresh token, and token expiration details.")]
        [HttpGet("api/token")]
        [HttpGet("adminui/api/token")]
        [Authorize]
        public async Task<IActionResult> GetToken()
        {
            var accessToken = await HttpContext.GetTokenAsync("access_token");
            var idToken = await HttpContext.GetTokenAsync("id_token");
            var refreshToken = await HttpContext.GetTokenAsync("refresh_token");
            var expiresIn = await HttpContext.GetTokenAsync("expires_in");
            var refreshExpiresIn = await HttpContext.GetTokenAsync("refresh_expires_in");
            var sessionState = await HttpContext.GetTokenAsync("session_state");
            var scope = await HttpContext.GetTokenAsync("scope");
            var notBeforePolicy = await HttpContext.GetTokenAsync("not_before_policy");

            return Ok(new
            {
                access_token = accessToken,
                id_token = idToken,
                refresh_token = refreshToken,
                token_type = "Bearer",
                expires_in = int.TryParse(expiresIn, out var ei) ? ei : 300,
                refresh_expires_in = int.TryParse(refreshExpiresIn, out var rei) ? rei : 1800,
                session_state = sessionState ?? "",
                scope = scope ?? "email profile",
                not_before_policy = int.TryParse(notBeforePolicy, out var nbp) ? nbp : 0
            });
        }

        [SwaggerOperation(
            Summary = "Refresh access token",
            Description = "Exchanges the stored server-side refresh token for a new access token and updates the session cookie.")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        [HttpPost("api/auth/refresh")]
        [HttpPost("adminui/api/auth/refresh")]
        [Authorize]
        public async Task<IActionResult> RefreshToken(
            [FromServices] ITokenRefreshService tokenRefreshService,
            CancellationToken cancellationToken)
        {
            var result = await tokenRefreshService.RefreshAsync(HttpContext, cancellationToken);

            if (result.IsRefreshTokenExpired)
            {
                return Unauthorized(new
                {
                    error = "refresh_token_expired",
                    message = "Session has expired. Please log in again."
                });
            }

            if (!result.IsSuccess)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    error = "token_refresh_failed",
                    message = result.ErrorMessage
                });
            }

            return Ok(new
            {
                access_token = result.AccessToken,
                id_token = result.IdToken,
                refresh_token = result.RefreshToken,
                token_type = "Bearer",
                expires_in = result.ExpiresIn,
                refresh_expires_in = result.RefreshExpiresIn,
                session_state = result.SessionState ?? "",
                scope = result.Scope ?? "email profile",
                not_before_policy = result.NotBeforePolicy
            });
        }
    }

    public class SelectOrgRequest
    {
        public string OrganizationId { get; set; } = "";
    }
}