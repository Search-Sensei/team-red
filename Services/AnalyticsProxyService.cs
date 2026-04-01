using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json.Linq;
using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Threading.Tasks;

namespace S365.Search.Admin.UI.Services
{
    public class AnalyticsProxyService : IAnalyticsProxyService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfigurationService _configurationService;
        private readonly IProxyAuthenticationService _proxyAuthenticationService;
        private readonly ITokenRefreshService _tokenRefreshService;
        private readonly ILogger<AnalyticsProxyService> _logger;
        private readonly bool _keycloakEnabled;
        private readonly string _activeTenantWhenKeycloakDisabled;

        public AnalyticsProxyService(
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            IConfigurationService configurationService,
            IProxyAuthenticationService proxyAuthenticationService,
            ITokenRefreshService tokenRefreshService,
            ILogger<AnalyticsProxyService> logger)
        {
            _httpClient = httpClientFactory.CreateClient("ExternalBackendClient");
            _keycloakEnabled = configuration.GetValue<bool>("KeycloakAuthentication:IsEnabled");
            _activeTenantWhenKeycloakDisabled = configuration.GetValue<string>("KeycloakAuthentication:ActiveTenantWhenDisabled") ?? "OSP_DEV";
            _configurationService = configurationService;
            _proxyAuthenticationService = proxyAuthenticationService;
            _tokenRefreshService = tokenRefreshService;
            _logger = logger;
        }

        public async Task<IActionResult> GetUsageAsync(HttpContext httpContext, ClaimsPrincipal user)
        {
            try
            {
                string? accessToken = null;
                var authResult = _proxyAuthenticationService.ValidateTokenBeforeProxyIfEnabled(httpContext.Request, user);

                if (authResult is UnauthorizedObjectResult unauthorized && IsTokenExpiredError(unauthorized))
                {
                    var refreshResult = await _tokenRefreshService.RefreshAsync(httpContext);
                    if (!refreshResult.IsSuccess)
                    {
                        return NormalizeErrorContract(httpContext, unauthorized);
                    }

                    accessToken = refreshResult.AccessToken;
                    AttachTokenHeaders(httpContext.Response, refreshResult);
                }
                else if (authResult is ObjectResult objectAuthResult)
                {
                    return NormalizeErrorContract(httpContext, objectAuthResult);
                }

                using var requestMessage = CreateUsageRequest(httpContext, accessToken);
                using var response = await _httpClient.SendAsync(requestMessage);

                if (response.StatusCode == HttpStatusCode.Unauthorized)
                {
                    var refreshResult = await _tokenRefreshService.RefreshAsync(httpContext);
                    if (refreshResult.IsRefreshTokenExpired)
                    {
                        return new UnauthorizedObjectResult(new
                        {
                            code = "REFRESH_TOKEN_EXPIRED",
                            message = "Session has expired. Please log in again.",
                            details = (object?)null,
                            traceId = httpContext.TraceIdentifier
                        });
                    }

                    if (refreshResult.IsSuccess)
                    {
                        AttachTokenHeaders(httpContext.Response, refreshResult);
                        using var retryRequest = CreateUsageRequest(httpContext, refreshResult.AccessToken);
                        using var retryResponse = await _httpClient.SendAsync(retryRequest);
                        return await ConvertResponseAsync(httpContext, retryResponse);
                    }
                }

                return await ConvertResponseAsync(httpContext, response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to proxy analytics usage request.");
                return new ObjectResult(new
                {
                    code = "ANALYTICS_PROXY_ERROR",
                    message = "Failed to proxy analytics usage request.",
                    details = new { ex.Message },
                    traceId = httpContext.TraceIdentifier
                })
                {
                    StatusCode = StatusCodes.Status500InternalServerError
                };
            }
        }

        private HttpRequestMessage CreateUsageRequest(HttpContext httpContext, string? accessToken)
        {
            var settings = _configurationService.GetSettings()
                ?? throw new InvalidOperationException("Configuration settings are not available.");

            var searchApiUrl = settings.SearchApiUrl?.TrimEnd('/')
                ?? throw new InvalidOperationException("SearchApiUrl is not configured.");

            var requestUri = new Uri($"{searchApiUrl}/api/analytics/usage{httpContext.Request.QueryString.Value}");
            var requestMessage = new HttpRequestMessage(HttpMethod.Get, requestUri);

            CopyRelevantHeaders(httpContext.Request, requestMessage);

            if (!string.IsNullOrWhiteSpace(accessToken))
            {
                requestMessage.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            }

            return requestMessage;
        }

        private void CopyRelevantHeaders(HttpRequest source, HttpRequestMessage target)
        {
            if (source.Headers.TryGetValue("Authorization", out var authorizationHeader))
            {
                target.Headers.TryAddWithoutValidation("Authorization", authorizationHeader.ToArray());
            }

            if (source.Headers.TryGetValue("Accept", out var acceptHeader))
            {
                target.Headers.TryAddWithoutValidation("Accept", acceptHeader.ToArray());
            }

            foreach (var header in source.Headers)
            {
                if (header.Key.StartsWith("X-", StringComparison.OrdinalIgnoreCase))
                {
                    target.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
                }
            }

            if (!_keycloakEnabled)
            {
                target.Headers.Remove("active_tenant");
                target.Headers.TryAddWithoutValidation("active_tenant", _activeTenantWhenKeycloakDisabled);
            }
        }

        private async Task<IActionResult> ConvertResponseAsync(HttpContext httpContext, HttpResponseMessage response)
        {
            var content = await response.Content.ReadAsStringAsync();
            var contentType = response.Content.Headers.ContentType?.ToString() ?? "application/json";

            if (response.IsSuccessStatusCode)
            {
                return new ContentResult
                {
                    StatusCode = (int)response.StatusCode,
                    Content = content,
                    ContentType = contentType
                };
            }

            return CreateBackendErrorResult(httpContext, response.StatusCode, content);
        }

        private ObjectResult CreateBackendErrorResult(HttpContext httpContext, HttpStatusCode statusCode, string responseBody)
        {
            JObject payload;

            try
            {
                payload = string.IsNullOrWhiteSpace(responseBody)
                    ? new JObject()
                    : JObject.Parse(responseBody);
            }
            catch
            {
                payload = new JObject
                {
                    ["details"] = responseBody
                };
            }

            return NormalizeErrorContract(httpContext, new ObjectResult(new
            {
                code = payload.Value<string>("code") ?? "ANALYTICS_PROXY_ERROR",
                message = payload.Value<string>("message") ?? $"Analytics request failed with status code {(int)statusCode}.",
                details = payload["details"],
                traceId = payload.Value<string>("traceId") ?? httpContext.TraceIdentifier
            })
            {
                StatusCode = (int)statusCode
            });
        }

        private static bool IsTokenExpiredError(UnauthorizedObjectResult result)
        {
            if (result.Value == null)
            {
                return false;
            }

            var valueAsJObject = JObject.FromObject(result.Value);
            var error = valueAsJObject.Value<string>("error");
            var code = valueAsJObject.Value<string>("code");

            return string.Equals(error, "Token has expired.", StringComparison.OrdinalIgnoreCase)
                || string.Equals(code, "TOKEN_EXPIRED", StringComparison.OrdinalIgnoreCase);
        }

        private static void AttachTokenHeaders(HttpResponse response, TokenRefreshResult result)
        {
            if (!result.IsSuccess || string.IsNullOrEmpty(result.AccessToken))
            {
                return;
            }

            response.Headers["X-Access-Token"] = result.AccessToken;
            response.Headers["Access-Control-Expose-Headers"] = "X-Access-Token";
        }

        private ObjectResult NormalizeErrorContract(HttpContext httpContext, ObjectResult objectResult)
        {
            if (objectResult.StatusCode.HasValue && objectResult.StatusCode.Value < StatusCodes.Status400BadRequest)
            {
                return objectResult;
            }

            var valueAsJObject = objectResult.Value != null ? JObject.FromObject(objectResult.Value) : new JObject();
            var code = valueAsJObject.Value<string>("code") ?? "PROXY_ERROR";
            var message = valueAsJObject.Value<string>("message") ?? "Request failed while proxying analytics usage.";
            var detailsToken = valueAsJObject["details"];
            var traceId = valueAsJObject.Value<string>("traceId") ?? httpContext.TraceIdentifier;

            return new ObjectResult(new
            {
                code,
                message,
                details = detailsToken != null && detailsToken.Type != JTokenType.Null ? detailsToken : null,
                traceId
            })
            {
                StatusCode = objectResult.StatusCode ?? StatusCodes.Status500InternalServerError
            };
        }
    }
}
