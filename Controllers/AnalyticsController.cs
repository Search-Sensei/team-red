using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;
using S365.Search.Admin.UI.Services;
using System;
using System.Threading.Tasks;

namespace S365.Search.Admin.UI.Controllers
{
    [ApiController]
    [Route("adminui/api/analytics")]
    public class AnalyticsController : ControllerBase
    {
        private readonly IAnalyticsProxyService _analyticsProxyService;

        public AnalyticsController(IAnalyticsProxyService analyticsProxyService)
        {
            _analyticsProxyService = analyticsProxyService;
        }

        [SwaggerOperation(
            Summary = "Get usage analytics",
            Description = "Proxies usage analytics request to backend API endpoint /api/analytics/usage.")]
        [HttpGet("usage")]
        [AllowAnonymous]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> GetUsageAsync([FromQuery] string start, [FromQuery] string end)
        {
            if (!DateTimeOffset.TryParse(start, out var startDate))
            {
                return CreateErrorResponse(
                    StatusCodes.Status400BadRequest,
                    "INVALID_START_DATE",
                    "Query parameter 'start' must be a valid date.");
            }

            if (!DateTimeOffset.TryParse(end, out var endDate))
            {
                return CreateErrorResponse(
                    StatusCodes.Status400BadRequest,
                    "INVALID_END_DATE",
                    "Query parameter 'end' must be a valid date.");
            }

            if (startDate > endDate)
            {
                return CreateErrorResponse(
                    StatusCodes.Status400BadRequest,
                    "INVALID_DATE_RANGE",
                    "Query parameter 'start' must be less than or equal to 'end'.");
            }

            try
            {
                return await _analyticsProxyService.GetUsageAsync(HttpContext, User);
            }
            catch (Exception ex)
            {
                return CreateErrorResponse(
                    StatusCodes.Status500InternalServerError,
                    "INTERNAL_SERVER_ERROR",
                    "Failed to proxy analytics usage request.",
                    new { ex.Message });
            }
        }

        private ObjectResult CreateErrorResponse(int statusCode, string code, string message, object details = null)
        {
            return StatusCode(statusCode, new
            {
                code,
                message,
                details,
                traceId = HttpContext.TraceIdentifier
            });
        }
    }
}
