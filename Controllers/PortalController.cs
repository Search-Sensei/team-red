using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using S365.Search.Admin.UI.Models;
using S365.Search.Admin.UI.Services;
using System;
using System.Threading.Tasks;

namespace S365.Search.Admin.UI.Controllers
{
    [ApiController]
    [Route("portal/api")]
    public class PortalController : ControllerBase
    {
        private readonly KeycloakService _keycloakService;
        private readonly ILogger<PortalController> _logger;

        public PortalController(KeycloakService keycloakService, ILogger<PortalController> logger)
        {
            _keycloakService = keycloakService;
            _logger = logger;
        }

        [AllowAnonymous]
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] OrganisationRegistrationRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

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

            string orgId = null;
            string userId = null;

            try
            {
                // Step 1: Create organisation
                try
                {
                    orgId = await _keycloakService.CreateOrganizationAsync(
                        adminToken,
                        request.OrganisationName.Trim(),
                        request.Address.Trim(),
                        request.ContactPerson.Trim(),
                        request.ContactPhone.Trim());
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
                        request.OrganisationName.Trim());
                }
                catch (Exception ex) when (ex.Message.Contains("Conflict"))
                {
                    // Rollback: delete the organisation created in Step 1
                    await _keycloakService.DeleteOrganizationAsync(adminToken, orgId);
                    return Conflict(new { field = "email", error = "A user with this email already exists." });
                }

                // Step 3: Add user to organisation
                await _keycloakService.AddUserToOrganizationAsync(adminToken, orgId, userId);
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
