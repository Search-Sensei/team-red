using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json.Linq;
using S365.Search.API.Http;
using S365.Search.Core.Helpers;
using S365.Search.Admin.UI.Models;
using S365.Search.Admin.UI.Services;
using System;
using System.Xml.Linq;
using S365.Startup.Core.Helpers;
using Microsoft.AspNetCore.Authorization;
using System.Net.Http;
using System.Threading.Tasks;
using Swashbuckle.AspNetCore.Annotations;

namespace S365.Search.Admin.UI.Controllers
{

    [ApiController]
    [Route("adminui")]
    [Authorize]
    public class ConfigurationController : Controller
    {
        private readonly IConfigurationService configurationService;
        private readonly KeycloakService _keycloakService;

        public ConfigurationController(IConfigurationService configurationService, KeycloakService keycloakService)
        {
            this.configurationService = configurationService;
            this._keycloakService = keycloakService;
        }

        [SwaggerOperation(Summary = "Get admin settings", 
            Description = "Retrieves all administrative configuration settings including API URLs and service endpoints.")]
        [HttpGet]
        [SkipMyGlobalActionFilter]
        [Route("api/settings"), ShowAPIOnSwagger]
        [ProducesResponseType(typeof(IApiResponse<AdminSettings>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public IActionResult GetSettings()
        {
            try
            {
                var settings = configurationService.GetSettings();

                return Json(settings);
            }
            catch (Exception ex)
            {
                // Log the exception for debugging
                System.Diagnostics.Debug.WriteLine($"Error in GetSettings: {ex.Message}");
                System.Diagnostics.Debug.WriteLine($"Stack Trace: {ex.StackTrace}");
                
                return ResponseHelper.CreateErrorResponse<AdminSettings>(ex);
            }
        }

        [SwaggerOperation(Summary = "Check mutual TLS configuration", 
            Description = "Checks if the application is configured for mutual TLS (mTLS) certificate authentication.")]
        [HttpGet]
        [SkipMyGlobalActionFilter]
        [AllowAnonymous]
        [Route("api/mTLSCheck"), ShowAPIOnSwagger]
        [ProducesResponseType(typeof(IApiResponse<AdminSettings>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public IActionResult mTLSCheck()
        {
            try
            {
                var certificateAuth = configurationService.IsCertificateAuthenticationEnabled();
                return Json(certificateAuth);
            }
            catch (Exception ex)
            {
                // Log the exception for debugging
                System.Diagnostics.Debug.WriteLine($"Error in mTLSCheck: {ex.Message}");
                System.Diagnostics.Debug.WriteLine($"Stack Trace: {ex.StackTrace}");
                
                // Return false as default if there's an error
                return Json(false);
            }
        }

        [SwaggerOperation(Summary = "Initialize database on first run", 
            Description = "Creates and initializes the database with the specified name during initial system setup.")]
        [HttpPost]
        [Route("api/database/init"), ShowAPIOnSwagger]
        [ProducesResponseType(typeof(ResponseCreateDatabase), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> CreateDatabaseFirst([FromBody] RequestDatabaseName request)
        {
            try
            {
                var settings = await configurationService.CreateDatabaseFirst(request);

                if (settings == "Successfully")
                {
                    return Ok(new ResponseCreateDatabase()
                    {
                        IsSuccess = true,
                        Error = string.Empty,
                        Status = StatusCodes.Status200OK,
                        Message = settings.ToString(),
                    });
                }

                return Ok(new ResponseCreateDatabase()
                {
                    IsSuccess = false,
                    Error = string.Empty,
                    Status = StatusCodes.Status500InternalServerError,
                    Message = settings.ToString(),
                });
            }
            catch (Exception ex)
            {
                return ResponseHelper.CreateErrorResponse<ResponseCreateDatabase>(ex);
            }
        }

        [SwaggerOperation(Summary = "Get access token", 
            Description = "Obtains an access token using encrypted access key for secure API communication.")]
        [HttpGet]
        [AllowAnonymous]
        [SkipMyGlobalActionFilter]
        [Route("api/token"), ShowAPIOnSwagger]
        [ProducesResponseType(typeof(IApiResponse<AdminSettings>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> GetAccessToken()
        {
            try
            {
                var token = await configurationService.GetAccessTokenAsync();
                return Ok(new { access_token = token });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (HttpRequestException)
            {
                return StatusCode(StatusCodes.Status502BadGateway, "Error from token API");
            }
            catch (Exception ex)
            {
                return ResponseHelper.CreateErrorResponse<AdminSettings>(ex);
            }
        }

        /// <summary>
        /// Refresh access token using refresh token (Internal use for E2E tests)
        /// </summary>
        /// <param name="request">Contains refreshToken</param>
        /// <returns>New access token and refresh token</returns>
        [SwaggerOperation(Summary = "Refresh access token", 
            Description = "Refreshes an expired access token using the refresh token. Internal endpoint for E2E tests.")]
        [HttpPost]
        [AllowAnonymous]
        [SkipMyGlobalActionFilter]
        [Route("api/token/refresh"), ShowAPIOnSwagger]
        [ProducesResponseType(typeof(JObject), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> RefreshAccessToken([FromBody] RefreshTokenRequest request)
        {
            try
            {
                // Validate input
                if (string.IsNullOrWhiteSpace(request?.RefreshToken))
                {
                    return BadRequest(new { error = "Refresh token is required" });
                }

                // Call Keycloak to refresh token
                var result = await _keycloakService.RefreshTokenAsync(request.RefreshToken);

                if (string.IsNullOrEmpty(result.AccessToken))
                {
                    return Unauthorized(new { error = "Failed to refresh token" });
                }

                // Return refreshed tokens
                return Ok(new
                {
                    access_token = result.AccessToken,
                    refresh_token = result.RefreshToken,
                    expires_in = result.ExpiresIn,
                    refresh_expires_in = result.RefreshExpiresIn,
                    token_type = result.TokenType,
                    not_before_policy = result.NotBeforePolicy
                });
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error in RefreshAccessToken: {ex.Message}");
                return StatusCode(StatusCodes.Status500InternalServerError, 
                    new { error = "Failed to refresh token", message = ex.Message });
            }
        }
    }
}

/// <summary>
/// Request model for token refresh endpoint
/// </summary>
public class RefreshTokenRequest
{
    public string RefreshToken { get; set; }
}
