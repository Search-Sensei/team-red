using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using S365.Search.Admin.UI.Models;
using S365.Search.Admin.UI.Services;
using System;
using System.Net.Http;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace S365.Search.Admin.UI.Controllers
{
    [ApiController]
    [Route("portal/api")]
    public class PortalController : ControllerBase
    {
        private readonly KeycloakService _keycloakService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<PortalController> _logger;
        private readonly IHttpClientFactory _httpClientFactory;

        public PortalController(KeycloakService keycloakService, IConfiguration configuration, ILogger<PortalController> logger, IHttpClientFactory httpClientFactory)
        {
            _keycloakService = keycloakService;
            _configuration = configuration;
            _logger = logger;
            _httpClientFactory = httpClientFactory;
        }

        [HttpPost("invite")]
        [Authorize(Roles = "org-admin,admin")]
        public async Task<IActionResult> InviteUser([FromBody] InviteUserRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var orgName = User.FindFirst("organization")?.Value
                ?? User.FindFirst("org_id")?.Value
                ?? User.FindFirst("active_tenant")?.Value;

            if (string.IsNullOrWhiteSpace(orgName))
                return BadRequest(new { error = "Unable to determine your organisation. Please ensure you are logged in to an organisation." });

            string adminToken;
            try
            {
                adminToken = await _keycloakService.GetAdminTokenAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to obtain admin token during user invitation.");
                return StatusCode(500, new { error = "Invitation service is temporarily unavailable." });
            }

            string? orgId;
            try
            {
                orgId = await _keycloakService.GetOrganizationIdByNameAsync(adminToken, orgName);
                if (orgId == null)
                {
                    _logger.LogWarning("Organisation '{OrgName}' not found in Keycloak.", orgName);
                    return NotFound(new { error = $"Organisation '{orgName}' not found." });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to look up organisation '{OrgName}'.", orgName);
                return StatusCode(500, new { error = "Failed to locate your organisation." });
            }

            try
            {
                await _keycloakService.InviteUserToOrganizationAsync(
                    adminToken,
                    orgId,
                    request.Email.Trim(),
                    request.FirstName.Trim(),
                    request.LastName.Trim());
            }
            catch (KeycloakConflictException)
            {
                return Conflict(new { field = "email", error = $"{request.Email} is already a member of the organisation." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to invite user '{Email}' to organisation '{OrgName}'.", request.Email, orgName);
                return StatusCode(500, new { error = "Failed to send invitation. Please try again." });
            }

            _logger.LogInformation("User '{Email}' invited to organisation '{OrgName}'.", request.Email, orgName);

            return Ok(new
            {
                message = $"Invitation sent successfully to {request.Email}.",
                email = request.Email,
                organisationName = orgName
            });
        }

        [AllowAnonymous]
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] OrganisationRegistrationRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // Validate that the organisation URL is reachable
            try
            {
                var urlClient = _httpClientFactory.CreateClient("UrlValidation");
                urlClient.Timeout = TimeSpan.FromSeconds(5);
                var urlRequest = new HttpRequestMessage(HttpMethod.Head, request.OrganisationUrl.Trim());
                urlRequest.Headers.UserAgent.ParseAdd("Mozilla/5.0 (compatible; RegistrationValidator/1.0)");
                var urlResponse = await urlClient.SendAsync(urlRequest);

                // Some servers block HEAD, fall back to GET
                if (urlResponse.StatusCode == System.Net.HttpStatusCode.MethodNotAllowed ||
                    urlResponse.StatusCode == System.Net.HttpStatusCode.Forbidden)
                {
                    urlRequest = new HttpRequestMessage(HttpMethod.Get, request.OrganisationUrl.Trim());
                    urlRequest.Headers.UserAgent.ParseAdd("Mozilla/5.0 (compatible; RegistrationValidator/1.0)");
                    urlResponse = await urlClient.SendAsync(urlRequest);
                }

                // Accept 2xx and 3xx (redirects) as valid
                var statusCode = (int)urlResponse.StatusCode;
                if (statusCode >= 400)
                {
                    return BadRequest(new { errors = new { organisationUrl = new[] { "Invalid URL. Please provide a valid and accessible website address." } } });
                }
            }
            catch (Exception ex) when (ex is HttpRequestException || ex is TaskCanceledException)
            {
                _logger.LogWarning(ex, "Organisation URL validation failed for {Url}", request.OrganisationUrl);
                return BadRequest(new { errors = new { organisationUrl = new[] { "Invalid URL. Please provide a valid and accessible website address." } } });
            }

            string adminToken;
            try
            {
                adminToken = await _keycloakService.GetAdminTokenAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to obtain admin token during registration.");
                return StatusCode(500, new { error = "Registration service is temporarily unavailable." });
            }

            var displayName = request.OrganisationName.Trim();
            var internalName = Regex.Replace(displayName, @"\s+", "-");

            string orgId = null;
            string userId = null;

            try
            {
                // Step 1: Create organisation
                try
                {
                    orgId = await _keycloakService.CreateOrganizationAsync(
                        adminToken,
                        internalName,
                        displayName,
                        request.ContactPerson.Trim(),
                        request.ContactPhone.Trim(),
                        request.OrganisationUrl.Trim());
                }
                catch (Exception ex) when (ex.Message.Contains("Conflict"))
                {
                    return Conflict(new { field = "organisationName", error = "An organisation with this name already exists." });
                }

                // Step 2: Create user
                try
                {
                    userId = await _keycloakService.CreateUserAsync(
                        adminToken,
                        request.Email.Trim(),
                        request.Password,
                        request.ContactPerson.Trim(),
                        internalName);
                }
                catch (Exception ex) when (ex.Message.Contains("Conflict"))
                {
                    // Rollback: delete the organisation created in Step 1
                    await _keycloakService.DeleteOrganizationAsync(adminToken, orgId);
                    return Conflict(new { field = "email", error = "A user with this email already exists." });
                }

                // Step 3: Add user to organisation
                await _keycloakService.AddUserToOrganizationAsync(adminToken, orgId, userId);

                // Step 4: Assign org-admin client role to the user
                var clientId = _configuration["KeycloakAuthentication:ClientId"] ?? "osp-adminui";
                var clientUuid = await _keycloakService.GetClientUuidAsync(adminToken, clientId);
                var (roleId, roleName) = await _keycloakService.GetClientRoleAsync(adminToken, clientUuid, "org-admin");
                await _keycloakService.AssignClientRoleToUserAsync(adminToken, userId, clientUuid, roleId, roleName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Registration failed, rolling back created resources.");

                // Rollback: delete user first, then organisation
                if (userId != null)
                {
                    await _keycloakService.DeleteUserAsync(adminToken, userId);
                }
                if (orgId != null)
                {
                    await _keycloakService.DeleteOrganizationAsync(adminToken, orgId);
                }

                var reason = ex.Message switch
                {
                    var m when m.Contains("add user to organization") =>
                        "Failed to add user to the organisation.",
                    var m when m.Contains("create admin role") =>
                        "Failed to create admin role for the organisation.",
                    var m when m.Contains("assign admin role") =>
                        "Failed to assign admin role to the user.",
                    _ => "An unexpected error occurred during registration."
                };

                return StatusCode(500, new { error = reason });
            }

            _logger.LogInformation("Organisation '{OrgName}' registered successfully with admin user '{Email}'.",
                request.OrganisationName, request.Email);

            return Ok(new
            {
                message = "Organisation registered successfully.",
                organisationId = orgId,
                userId = userId
            });
        }
    }
}
