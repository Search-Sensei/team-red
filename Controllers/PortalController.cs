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

            // Step 1: Create organisation
            string orgId;
            try
            {
                orgId = await _keycloakService.CreateOrganizationAsync(
                    adminToken,
                    request.OrganisationName.Trim(),
                    request.Address.Trim(),
                    request.ContactPerson.Trim(),
                    request.ContactPhone.Trim());
            }
            catch (Exception ex) when (ex.Message.Contains("409"))
            {
                return Conflict(new { field = "organisationName", error = "An organisation with this name already exists." });
            }

            // Step 2: Create user
            string userId;
            try
            {
                userId = await _keycloakService.CreateUserAsync(
                    adminToken,
                    request.Email.Trim(),
                    request.Password,
                    request.ContactPerson.Trim(),
                    request.OrganisationName.Trim());
            }
            catch (Exception ex) when (ex.Message.Contains("409"))
            {
                return Conflict(new { field = "email", error = "A user with this email already exists." });
            }

            // Step 3: Add user to organisation
            await _keycloakService.AddUserToOrganizationAsync(adminToken, orgId, userId);

            // Step 4: Assign admin role to user within the organisation
            await _keycloakService.AssignOrganizationAdminRoleAsync(adminToken, orgId, userId);

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
