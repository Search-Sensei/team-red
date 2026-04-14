using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Swashbuckle.AspNetCore.Annotations;
using S365.Search.Admin.UI.Models;
using S365.Search.Admin.UI.Services;
using System;
using System.Collections.Generic;
using System.IO.Compression;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Net.Http.Headers;

namespace S365.Search.Admin.UI.Controllers
{
    [ApiController]
    [Route("adminui")]
    public class OperationProxyController : ControllerBase
    {
        private readonly HttpClient _httpClient;
        private readonly IConfigurationService _iConfigurationService;
        private readonly IProxyAuthenticationService _proxyAuthenticationService;
        private readonly IUserContextResolver _userContextResolver;
        private readonly ITenantContextService _tenantContextService;
        private readonly ITokenRefreshService _tokenRefreshService;
        private readonly KeycloakService _keycloakService;
        private readonly ILogger<OperationProxyController> _logger;
        private readonly bool _keycloakEnabled;
        private readonly string _activeTenantWhenKeycloakDisabled;

        public OperationProxyController(
            IHttpClientFactory httpClientFactory,
            IConfigurationService configurationService,
            IProxyAuthenticationService proxyAuthenticationService,
            IUserContextResolver userContextResolver,
            ITenantContextService tenantContextService,
            ITokenRefreshService tokenRefreshService,
            KeycloakService keycloakService,
            IConfiguration configuration,
            ILogger<OperationProxyController> logger)
        {
            _httpClient = httpClientFactory.CreateClient("ExternalBackendClient");
            _iConfigurationService = configurationService;
            _proxyAuthenticationService = proxyAuthenticationService;
            _userContextResolver = userContextResolver;
            _tenantContextService = tenantContextService;
            _tokenRefreshService = tokenRefreshService;
            _keycloakService = keycloakService;
            _keycloakEnabled = configuration.GetValue<bool>("KeycloakAuthentication:IsEnabled");
            _activeTenantWhenKeycloakDisabled = configuration.GetValue<string>("KeycloakAuthentication:ActiveTenantWhenDisabled") ?? "OSP_DEV";
            _logger = logger;
        }

        private async Task<string> DecompressContentAsync(HttpContent content)
        {
            var encoding = content.Headers.ContentEncoding.FirstOrDefault();

            if (encoding == "gzip")
            {
                using (var stream = await content.ReadAsStreamAsync())
                using (var decompressedStream = new GZipStream(stream, CompressionMode.Decompress))
                using (var reader = new StreamReader(decompressedStream))
                {
                    return await reader.ReadToEndAsync();
                }
            }
            else if (encoding == "deflate")
            {
                using (var stream = await content.ReadAsStreamAsync())
                using (var decompressedStream = new DeflateStream(stream, CompressionMode.Decompress))
                using (var reader = new StreamReader(decompressedStream))
                {
                    return await reader.ReadToEndAsync();
                }
            }
            else
            {
                return await content.ReadAsStringAsync();
            }
        }

        private string GetApiUrl(string endpoint)
        {
            var settings = _iConfigurationService.GetSettings()
                ?? throw new InvalidOperationException("Configuration settings are not available.");

            var mainApiBase = settings.SearchApiUrl?.TrimEnd('/') 
                ?? throw new InvalidOperationException("SearchApiUrl is not configured.");

            var operationApiBase = settings.DomainOperation?.TrimEnd('/') 
                ?? throw new InvalidOperationException("DomainOperation is not configured.");

            endpoint = endpoint.TrimStart('/');

            if (endpoint.StartsWith("contentEnhance/"))
            {
                var mapped = endpoint.Replace("contentEnhance/", "contentenhancement/");
                return $"{operationApiBase}/{mapped}";
            }

            if (endpoint is "api/Token" or "api/Token/")
            {
                return $"{operationApiBase}/api/Token";
            }

            return $"{mainApiBase}/{endpoint}";
        }

        //----------------  Proxy Get -------------------
        [SwaggerOperation(Summary = "Proxy GET requests to backend APIs", 
            Description = "Routes GET requests to appropriate backend services (main search API or operation API) based on endpoint path.")]
        [HttpGet("contentEnhanceCount")]
        [HttpGet("api/{*path}")]
        [HttpGet("userGroups/{*path}")]
        [HttpGet("suggestions/{*path}")]
        [HttpGet("queryrules")]
        [HttpGet("queryrules/{*path}")]
        [HttpGet("navigations/{*path}")]
        [HttpGet("fastLinks/{*path}")]
        [HttpGet("synonyms/{*path}")]
        [HttpGet("customerBilling/{*path}")]
        [HttpGet("settings/{*path}")]
        [HttpGet("controlPanel/{*path}")]
        [AllowAnonymous]
        public async Task<IActionResult> ProxyApiGet(string? path = null)
        {
            LogProxyRequestContext("GET", path);
            var fullEndpoint = NormalizeEndpointFromRequestPath();
            _logger.LogInformation("ProxyApiGet normalized endpoint: {Endpoint}", fullEndpoint);

            if (fullEndpoint.StartsWith("contentEnhanceCount", StringComparison.OrdinalIgnoreCase)){
                return await ProxyGet("contentEnhance/contentEnhanceCount");
            }
            return await ProxyGet(fullEndpoint);
        }

        //----------------  Proxy Post -------------------
        [SwaggerOperation(Summary = "Proxy POST requests to backend APIs", 
            Description = "Routes POST requests to appropriate backend services with support for search, suggestions, and CRUD operations.")]
        [HttpPost("search")]
        [HttpPost("contentEnhanceSearch")]
        [HttpPost("fastLinksIndexName/search")]
        [HttpPost("suggestions/{*path}")]
        [HttpPost("fastLinks/{*path}")]
        [HttpPost("synonyms/{*path}")]
        [HttpPost("customerBilling/{*path}")]
        [HttpPost("settings/{*path}")]
        [HttpPost("queryrules/{*path}")]
        [HttpPost("controlPanel/{*path}")]
        [HttpPost("navigations/{*path}")]
        [AllowAnonymous]
        public async Task<IActionResult> PostProxy(string? path = null, [FromBody] object? data = null)
        {
            LogProxyRequestContext("POST", path);
            var fullEndpoint = NormalizeEndpointFromRequestPath();
            _logger.LogInformation("PostProxy normalized endpoint: {Endpoint}", fullEndpoint);

            if (fullEndpoint.StartsWith("contentEnhanceSearch", StringComparison.OrdinalIgnoreCase)){
                return await ProxyPost("contentEnhance/contentEnhanceSearch", data: data);
            }

            if(fullEndpoint == "navigations/search" || fullEndpoint == "navigations/create" || fullEndpoint == "fastLinks/search"){
                var (success, body, errorResult) = await ReadRequestBodyAsync();
                if (!success) return errorResult;

                return await ProxyPost(fullEndpoint, rawBody: body);
            }
            return await ProxyPost(fullEndpoint, data: data);
        }

        //----------------  Proxy Put -------------------
        [SwaggerOperation(Summary = "Proxy PUT requests to backend APIs", 
            Description = "Routes PUT requests for updating resources across suggestions, navigations, content enhancement, and other services.")]
        [HttpPut("suggestions/{*path}")]
        [HttpPut("navigations/{*path}")]
        [HttpPut("contentEnhance/{*path}")]
        [HttpPut("fastLinks/{*path}")]
        [HttpPut("synonyms/{*path}")]
        [HttpPut("customerBilling/{*path}")]
        [HttpPut("settings/{*path}")]
        [HttpPut("queryrules/{*path}")]
        [AllowAnonymous]
        public async Task<IActionResult> PutProxy(string? path = null, [FromBody] object? data = null)
        {
            LogProxyRequestContext("PUT", path);
            var fullEndpoint = NormalizeEndpointFromRequestPath();
            _logger.LogInformation("PutProxy normalized endpoint: {Endpoint}", fullEndpoint);

            if(fullEndpoint == "navigations/update"){
                var (success, body, errorResult) = await ReadRequestBodyAsync();
                if (!success) return errorResult;

                return await ProxyPut(fullEndpoint, rawBody: body);
            }
            return await ProxyPut(fullEndpoint, data);
        }

        //----------------  Proxy Delete -------------------
        [SwaggerOperation(Summary = "Proxy DELETE requests to backend APIs", 
            Description = "Routes DELETE requests for removing resources from navigations, control panels, suggestions, and other services.")]
        [HttpDelete("navigations/{*path}")]
        [HttpDelete("controlpanel/{*path}")]
        [HttpDelete("suggestions/{*path}")]
        [HttpDelete("contentEnhance/{*path}")]
        [HttpDelete("fastLinks/{*path}")]
        [HttpDelete("synonyms/{*path}")]
        [HttpDelete("customerBilling/{*path}")]
        [HttpDelete("settings/{*path}")]
        [HttpDelete("queryrules/{*path}")]
        [AllowAnonymous]
        public async Task<IActionResult> DeleteProxy(string? path = null)
        {
            LogProxyRequestContext("DELETE", path);
            var fullEndpoint = NormalizeEndpointFromRequestPath();
            _logger.LogInformation("DeleteProxy normalized endpoint: {Endpoint}", fullEndpoint);
            return await ProxyDelete(fullEndpoint);
        }

        [SwaggerOperation(Summary = "Get current user details",
            Description = "Retrieves detailed information about the authenticated user including email, name, roles, and group assignments from Keycloak or JWT tokens.")]
        [HttpGet("account/getuserdetails")]
        [AllowAnonymous]
        public async Task<IActionResult> GetUserDetails()
        {
            try
            {
                var authenticatedUser = await _userContextResolver.ResolveAsync(HttpContext, User);

                // Enrich tenants list from Keycloak Admin API
                if (_keycloakEnabled && authenticatedUser.IsAuthenticated)
                {
                    try
                    {
                        var userId = ExtractUserIdFromContext();
                        if (!string.IsNullOrEmpty(userId))
                        {
                            var adminToken = await _keycloakService.GetAdminTokenAsync();
                            var orgNames = await _keycloakService.GetUserOrganizationsAsync(adminToken, userId);
                            if (orgNames.Count > 0)
                            {
                                authenticatedUser.Tenants = orgNames;
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to fetch user organizations from Keycloak. Falling back to JWT-based tenants.");
                    }
                }

                return Ok(authenticatedUser);
            }
            catch (Exception ex)
            {
                return CreateInternalServerError(ex, "GetUserDetails");
            }
        }

        private string? ExtractUserIdFromContext()
        {
            // Try to get 'sub' claim from the authenticated user
            var sub = User?.FindFirst("sub")?.Value
                ?? User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

            if (!string.IsNullOrEmpty(sub)) return sub;

            // Fallback: extract from Bearer token
            var authHeader = HttpContext.Request.Headers["Authorization"].ToString();
            if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                var token = authHeader.Substring("Bearer ".Length).Trim();
                return ExtractSubFromJwt(token);
            }

            // Fallback: extract from stored access token
            var accessToken = HttpContext.GetTokenAsync("access_token").GetAwaiter().GetResult();
            if (!string.IsNullOrEmpty(accessToken))
            {
                return ExtractSubFromJwt(accessToken);
            }

            return null;
        }

        private static string? ExtractSubFromJwt(string jwt)
        {
            try
            {
                var handler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
                var token = handler.ReadJwtToken(jwt);
                return token.Claims.FirstOrDefault(c => c.Type == "sub")?.Value;
            }
            catch
            {
                return null;
            }
        }

        [HttpPost("switch-context")]
        [AllowAnonymous]
        public async Task<IActionResult> SwitchContext([FromBody] SwitchContextRequest request)
        {
            try
            {
                var response = await _tenantContextService.SwitchContextAsync(HttpContext, User, request);
                _logger.LogInformation("SwitchContext cookie updated for tenant {Tenant}", request.ActiveTenant);
                
                return Ok(response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "SwitchContext validation failed");
                return CreateErrorResponse(StatusCodes.Status400BadRequest, "INVALID_REQUEST", ex.Message);
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "SwitchContext failed due to Keycloak/network error");
                return CreateErrorResponse(StatusCodes.Status503ServiceUnavailable, "KEYCLOAK_UNAVAILABLE", "Unable to reach identity provider.");
            }
            catch (Exception ex)
            {
                return CreateInternalServerError(ex, "SwitchContext");
            }
        }

        private async Task<(bool success, string body, IActionResult errorResult)> ReadRequestBodyAsync()
        {
            ModelState.Clear();
            try
            {
                if (!Request.Body.CanSeek)
                {
                    Request.EnableBuffering();
                }

                Request.Body.Position = 0;

                string body;
                using (var reader = new StreamReader(Request.Body, Encoding.UTF8, leaveOpen: true, bufferSize: 1024, detectEncodingFromByteOrderMarks: false))
                {
                    body = await reader.ReadToEndAsync();
                }

                Request.Body.Position = 0;

                if (string.IsNullOrWhiteSpace(body))
                {
                    return (false, null, CreateErrorResponse(StatusCodes.Status400BadRequest, "INVALID_REQUEST", "Request body is required."));
                }

                try
                {
                    JsonConvert.DeserializeObject(body);
                }
                catch (Exception)
                {
                    return (false, null, CreateErrorResponse(StatusCodes.Status400BadRequest, "INVALID_JSON", "Invalid JSON format."));
                }

                return (true, body, null);
            }
            catch (Exception)
            {
                return (false, null, CreateErrorResponse(StatusCodes.Status500InternalServerError, "REQUEST_READ_FAILED", "Unable to read request body."));
            }
        }

        private async Task<IActionResult> ProxyGet(string endpoint)
        {
            return await SendProxyRequestAsync(HttpMethod.Get, endpoint);
        }

        private string NormalizeControlPanelSearchBody(string requestBody)
        {
            if (string.IsNullOrWhiteSpace(requestBody))
            {
                return requestBody;
            }

            try
            {
                var jObj = JObject.Parse(requestBody);
                if (jObj["url"] == null && jObj["settings"] != null)
                {
                    jObj["url"] = jObj["settings"];
                    jObj.Remove("settings");
                    return jObj.ToString(Formatting.None);
                }
            }
            catch
            {
                // Ignore normalization errors and fall back to original body
            }

            return requestBody;
        }

        private async Task<IActionResult> ProxyPost(string endpoint, object? data = null, string? rawBody = null)
        {
            endpoint = endpoint?.TrimEnd('/') ?? endpoint;

            var body = rawBody ?? CreateJsonContent(data ?? new { });
            if (endpoint == "controlPanel/search")
            {
                body = NormalizeControlPanelSearchBody(body);
            }

            var contentType = endpoint == "navigations/create"
                ? "application/json-patch+json"
                : "application/json";
            var acceptMediaType = endpoint == "navigations/search" ? "text/plain" : null;

            return await SendProxyRequestAsync(HttpMethod.Post, endpoint, body, contentType, acceptMediaType);
        }

        private async Task<IActionResult> ProxyPut(string endpoint, object? data = null, string? rawBody = null)
        {
            endpoint = endpoint?.TrimEnd('/') ?? endpoint;

            var requestBody = rawBody ?? CreateJsonContent(data ?? new { });
            if (endpoint == "navigations/update" || endpoint == "navigations/create")
            {
                var jObject = JObject.Parse(requestBody);

                var pascalCaseObject = new JObject();
                foreach (var prop in jObject.Properties())
                {
                    string pascalName = char.ToUpperInvariant(prop.Name[0]) + prop.Name.Substring(1);
                    pascalCaseObject[pascalName] = prop.Value;
                }
                requestBody = pascalCaseObject.ToString(Formatting.None);
            }

            return await SendProxyRequestAsync(HttpMethod.Put, endpoint, requestBody);
        }

        private async Task<IActionResult> ProxyDelete(string endpoint)
        {
            return await SendProxyRequestAsync(HttpMethod.Delete, endpoint);
        }

        private async Task<IActionResult> SendProxyRequestAsync(HttpMethod method, string endpoint, string? body = null, string contentType = "application/json", string? acceptMediaType = null)
        {
            try
            {
                var externalUrl = BuildExternalUrl(endpoint);
                var requestMessage = new HttpRequestMessage(method, externalUrl);

                if (body != null && method != HttpMethod.Get && method != HttpMethod.Delete)
                {
                    requestMessage.Content = new StringContent(body, Encoding.UTF8, contentType);
                }

                if (!string.IsNullOrWhiteSpace(acceptMediaType))
                {
                    requestMessage.Headers.Accept.Clear();
                    requestMessage.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue(acceptMediaType));
                }

                return await ForwardAndConvertResponse(requestMessage);
            }
            catch (Exception ex)
            {
                return CreateInternalServerError(ex, $"SendProxyRequestAsync:{method.Method}:{endpoint}");
            }
        }

        private string BuildExternalUrl(string endpoint)
        {
            endpoint = endpoint?.TrimEnd('/') ?? endpoint;
            var externalUrl = GetApiUrl(endpoint);
            var queryString = Request.QueryString.Value;
            if (!string.IsNullOrEmpty(queryString))
            {
                externalUrl += queryString;
            }
            return externalUrl;
        }

        private void CopyRelevantHeaders(HttpRequestMessage requestMessage)
        {
            foreach (var header in Request.Headers)
            {
                var key = header.Key;
                if ((key.StartsWith("X-") || key == "Authorization") 
                    && key != "Content-Type" && key != "Accept")
                {
                    try
                    {
                        requestMessage.Headers.Add(key, header.Value.ToArray());
                    }
                    catch { /* ignore duplicate or invalid headers */ }
                }
            }

            if (!_keycloakEnabled)
            {
                requestMessage.Headers.Remove("active_tenant");
                requestMessage.Headers.TryAddWithoutValidation("active_tenant", _activeTenantWhenKeycloakDisabled);
            }
        }

        private async Task<IActionResult> ForwardAndConvertResponse(HttpRequestMessage requestMessage)
        {
            Console.WriteLine($"[OperationProxyController] ForwardAndConvertResponse started for {requestMessage.Method} {requestMessage.RequestUri}");

            string? proactiveAccessToken = null;
            var authResult = _proxyAuthenticationService.ValidateTokenBeforeProxyIfEnabled(Request, User);
            
            if (authResult != null)
            {
                bool isExpired = false;
                if (authResult is UnauthorizedObjectResult uor && uor.Value != null)
                {
                    // The ProxyAuthenticationService returns: new { error = "Token has expired." }
                    var errorProp = uor.Value.GetType().GetProperty("error");
                    if (errorProp != null && errorProp.GetValue(uor.Value)?.ToString() == "Token has expired.")
                    {
                        isExpired = true;
                    }
                }

                if (isExpired)
                {
                    Console.WriteLine("[OperationProxyController] Proactive 401: Token expired detected locally. Attempting refresh...");
                    var refreshResult = await _tokenRefreshService.RefreshAsync(HttpContext);
                    
                    if (refreshResult.IsSuccess)
                    {
                        Console.WriteLine("[OperationProxyController] Proactive refresh successful. Continuing with new token.");
                        proactiveAccessToken = refreshResult.AccessToken;
                        authResult = null; // Proceed to backend
                        AttachTokenHeaders(Response, refreshResult);
                    }
                    else
                    {
                        Console.WriteLine($"[OperationProxyController] Proactive refresh failed. Status: {(refreshResult.IsRefreshTokenExpired ? "Refresh token expired" : "Unknown error")}");
                        return authResult; // Return the 401 from ProxyAuthenticationService
                    }
                }
                else
                {
                    Console.WriteLine("[OperationProxyController] Proxy token validation failed (Reason other than expiration).");
                    return authResult;
                }
            }

            Console.WriteLine("[OperationProxyController] Proxy token validation passed.");
            CopyRelevantHeaders(requestMessage);
            
            // If we proactively refreshed, overwrite the copied (expired) Authorization header
            if (!string.IsNullOrEmpty(proactiveAccessToken))
            {
                requestMessage.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", proactiveAccessToken);
            }

            Console.WriteLine("[OperationProxyController] Sending request to backend...");
            var response = await _httpClient.SendAsync(requestMessage);
            Console.WriteLine($"[OperationProxyController] Backend response received: {response.StatusCode}");
            
            var content = await DecompressContentAsync(response.Content);

            // On 401 from the backend, attempt a token refresh and retry once (Reactive Refresh)
            if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
            {
                Console.WriteLine("[OperationProxyController] 401 Unauthorized detected from backend. Calling refresh token logic.");
                var refreshResult = await _tokenRefreshService.RefreshAsync(HttpContext);

                if (refreshResult.IsRefreshTokenExpired)
                {
                    Console.WriteLine("[OperationProxyController] Refresh token also expired. Signaling logout.");
                    // Refresh token also expired: signal the frontend to redirect to login
                    return Unauthorized(new
                    {
                        error = "refresh_token_expired",
                        message = "Session has expired. Please log in again."
                    });
                }

                if (refreshResult.IsSuccess)
                {
                    Console.WriteLine("[OperationProxyController] Token refreshed successfully. Retrying backend request...");
                    AttachTokenHeaders(Response, refreshResult);

                    // Rebuild the request (HttpRequestMessage can only be sent once)
                    var retryRequest = CloneRequestMessage(requestMessage, refreshResult.AccessToken);
                    response = await _httpClient.SendAsync(retryRequest);
                    Console.WriteLine($"[OperationProxyController] Backend retry response received: {response.StatusCode}");
                    content = await DecompressContentAsync(response.Content);
                }
                else
                {
                    Console.WriteLine($"[OperationProxyController] Token refresh failed. Error: {refreshResult.ErrorMessage ?? "Unknown"}");
                }
            }

            if (response.IsSuccessStatusCode)
            {
                var contentType = response.Content.Headers.ContentType?.ToString() ?? "application/json";
                Response.Headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
                Response.Headers["Pragma"] = "no-cache";
                Response.Headers["Expires"] = "0";
                return Content(content, contentType ?? "application/json");
            }

            Console.WriteLine($"[OperationProxyController] Final response is an error: {response.StatusCode}");
            return CreateErrorResult(response, content);
        }

        private static void AttachTokenHeaders(HttpResponse response, TokenRefreshResult result)
        {
            if (!result.IsSuccess || string.IsNullOrEmpty(result.AccessToken)) return;

            response.Headers["X-Access-Token"] = result.AccessToken;
            if (!string.IsNullOrEmpty(result.RefreshToken)) response.Headers["X-Refresh-Token"] = result.RefreshToken;
            if (!string.IsNullOrEmpty(result.IdToken)) response.Headers["X-Id-Token"] = result.IdToken;
            response.Headers["X-Expires-In"] = result.ExpiresIn.ToString();
            response.Headers["X-Refresh-Expires-In"] = result.RefreshExpiresIn.ToString();
            if (!string.IsNullOrEmpty(result.SessionState)) response.Headers["X-Session-State"] = result.SessionState;
            if (!string.IsNullOrEmpty(result.Scope)) response.Headers["X-Scope"] = result.Scope;
            response.Headers["X-Not-Before-Policy"] = result.NotBeforePolicy.ToString();
            
            // Expose headers for cross-origin or frontend observation if needed
            response.Headers["Access-Control-Expose-Headers"] = "X-Access-Token, X-Refresh-Token, X-Id-Token, X-Expires-In, X-Refresh-Expires-In, X-Session-State, X-Scope, X-Not-Before-Policy";
        }

        private static HttpRequestMessage CloneRequestMessage(HttpRequestMessage original, string? newAccessToken)
        {
            var clone = new HttpRequestMessage(original.Method, original.RequestUri);

            // Copy headers, replacing Authorization with the refreshed token
            foreach (var header in original.Headers)
            {
                if (header.Key.Equals("Authorization", StringComparison.OrdinalIgnoreCase))
                    continue;
                clone.Headers.TryAddWithoutValidation(header.Key, header.Value);
            }

            if (!string.IsNullOrEmpty(newAccessToken))
                clone.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", newAccessToken);

            // Copy body for non-GET requests
            if (original.Content != null)
            {
                var originalBody = original.Content.ReadAsByteArrayAsync().GetAwaiter().GetResult();
                clone.Content = new ByteArrayContent(originalBody);
                foreach (var header in original.Content.Headers)
                    clone.Content.Headers.TryAddWithoutValidation(header.Key, header.Value);
            }

            return clone;
        }

        private string CreateJsonContent(object? data)
        {
            if (data == null)
                return "{}";

            if (data is System.Text.Json.JsonElement je)
                return je.GetRawText();

            return JsonConvert.SerializeObject(data);
        }

        private IActionResult CreateErrorResult(HttpResponseMessage response, string content)
        {
            object errorResponse;
            try
            {
                if (!string.IsNullOrEmpty(content) && content.TrimStart().StartsWith("{"))
                {
                    errorResponse = JsonConvert.DeserializeObject(content);
                }
                else
                {
                    errorResponse = new 
                    {
                        error = $"External API returned {response.StatusCode}",
                        message = content?.Length > 2000 ? content.Substring(0, 2000) + "..." : content,
                        endpoint = response.RequestMessage?.RequestUri?.ToString()
                    };
                }
            }
            catch
            {
                errorResponse = new 
                {
                    error = $"External API returned {response.StatusCode}",
                    message = content
                };
            }

            return StatusCode((int)response.StatusCode, errorResponse);
        }

        private ObjectResult CreateInternalServerError(Exception ex, string context)
        {
            _logger.LogError(ex, "{Context} failed", context);
            return CreateErrorResponse(StatusCodes.Status500InternalServerError, "INTERNAL_SERVER_ERROR", "An unexpected error occurred.");
        }

        private ObjectResult CreateErrorResponse(int statusCode, string code, string message, object? details = null)
        {
            var errorResponse = new
            {
                code,
                message,
                details,
                traceId = HttpContext?.TraceIdentifier
            };

            return StatusCode(statusCode, errorResponse);
        }

        private string NormalizeEndpointFromRequestPath()
        {
            var endpoint = Request.Path.Value?.TrimStart('/') ?? string.Empty;
            if (endpoint.StartsWith("adminui/", StringComparison.OrdinalIgnoreCase))
            {
                endpoint = endpoint.Substring("adminui/".Length);
            }

            return endpoint;
        }

        private void LogProxyRequestContext(string method, string? actionPath)
        {
            var routePath = RouteData.Values.TryGetValue("path", out var routeValuePath)
                ? routeValuePath?.ToString()
                : null;

            _logger.LogInformation(
                "Proxy request context. Method: {Method}, RequestPath: {RequestPath}, ActionPath: {ActionPath}, RouteDataPath: {RouteDataPath}, QueryString: {QueryString}",
                method,
                Request.Path.Value,
                actionPath,
                routePath,
                Request.QueryString.Value);

            if (!ModelState.IsValid)
            {
                var errors = string.Join(" | ", ModelState
                    .SelectMany(kvp => kvp.Value?.Errors?.Select(e => $"{kvp.Key}: {e.ErrorMessage}") ?? Enumerable.Empty<string>()));

                _logger.LogWarning("Proxy ModelState invalid for {Method} {RequestPath}. Errors: {Errors}", method, Request.Path.Value, errors);
            }
        }
    }

}

