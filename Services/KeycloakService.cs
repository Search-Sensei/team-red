using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using S365.Search.Admin.UI.Models;
using Newtonsoft.Json;


namespace S365.Search.Admin.UI.Services
{
    public class KeycloakService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly ILogger<KeycloakService> _logger;
        private readonly bool _isEnabled;

        public KeycloakService(HttpClient httpClient, IConfiguration configuration, ILogger<KeycloakService> logger)
        {
            _httpClient = httpClient;
            _configuration = configuration;
            _logger = logger;

            _isEnabled = _configuration.GetValue<bool>("KeycloakAuthentication:IsEnabled");

            if (!_isEnabled)
            {
                _logger.LogInformation("KeycloakService initialized in bypass mode because KeycloakAuthentication:IsEnabled is false.");
                return;
            }

            var baseUrl = _configuration["KeycloakAuthentication:BaseUrl"];
            if (string.IsNullOrWhiteSpace(baseUrl))
            {
                throw new InvalidOperationException("KeycloakAuthentication:BaseUrl is required when Keycloak authentication is enabled.");
            }

            _httpClient.BaseAddress = new Uri(baseUrl.TrimEnd('/') + "/");

            _httpClient.DefaultRequestHeaders.UserAgent.ParseAdd("insomnia/12.3.0");
            _httpClient.DefaultRequestHeaders.Remove("x-api-key");
            _httpClient.DefaultRequestHeaders.Add("x-api-key", _configuration["KeycloakAuthentication:ApiKey"] ?? "12345-ABCDE-67890");
        }

        private void EnsureEnabled()
        {
            if (!_isEnabled)
            {
                throw new InvalidOperationException("Keycloak integration is disabled.");
            }
        }

        public async Task<string> GetAdminTokenAsync()
        {
            EnsureEnabled();

            var realm = _configuration["KeycloakAuthentication:Realm"];
            if (string.IsNullOrWhiteSpace(realm))
                throw new InvalidOperationException("Cannot find Keycloak realm. Configuration missing.");

            var adminClientId = _configuration["KeycloakAuthentication:AdminClientId"];

            var adminClientSecret = _configuration["KeycloakAuthentication:AdminClientSecret"];

            if (string.IsNullOrWhiteSpace(adminClientId))
                throw new InvalidOperationException("KeycloakAuthentication:AdminClientId is required for admin token flow.");

            if (string.IsNullOrWhiteSpace(adminClientSecret))
                throw new InvalidOperationException("KeycloakAuthentication:AdminClientSecret is required for admin token flow.");

            var content = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("grant_type", "client_credentials"),
                new KeyValuePair<string, string>("client_id", adminClientId),
                new KeyValuePair<string, string>("client_secret", adminClientSecret)
            });

            var response = await _httpClient.PostAsync($"/realms/{realm}/protocol/openid-connect/token", content);
            response.EnsureSuccessStatusCode();
            var json = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();
            var accessToken = json?["access_token"]?.ToString();

            return string.IsNullOrEmpty(accessToken)
                ? throw new Exception("No access_token returned from Keycloak")
                : accessToken;
        }

        public async Task<SwitchContextResponse> RefreshTokenAsync(string refreshToken)
        {
            EnsureEnabled();

            _httpClient.DefaultRequestHeaders.Remove("Authorization");

            var realm = _configuration["KeycloakAuthentication:Realm"];
            if (string.IsNullOrWhiteSpace(realm))
                throw new InvalidOperationException("Cannot find Keycloak realm. Configuration missing.");

            var refreshClientId =
                _configuration["KeycloakAuthentication:RefreshClientId"]
                ?? _configuration["KeycloakAuthentication:ClientId"];

            var refreshClientSecret =
                _configuration["KeycloakAuthentication:RefreshClientSecret"]
                ?? _configuration["KeycloakAuthentication:ClientSecret"];

            if (string.IsNullOrWhiteSpace(refreshClientId))
                throw new InvalidOperationException("KeycloakAuthentication:ClientId is required for refresh token flow.");

            var formData = new List<KeyValuePair<string, string>>
            {
                new KeyValuePair<string, string>("grant_type", "refresh_token"),
                new KeyValuePair<string, string>("client_id", refreshClientId),
                new KeyValuePair<string, string>("refresh_token", refreshToken)
            };

            if (!string.IsNullOrWhiteSpace(refreshClientSecret))
            {
                formData.Add(new KeyValuePair<string, string>("client_secret", refreshClientSecret));
            }

            var content = new FormUrlEncodedContent(formData);
            var requestBodyString = await content.ReadAsStringAsync();

            var requestInfo = new
            {
                Method = "POST",
                Url = _httpClient.BaseAddress + $"/realms/{realm}/protocol/openid-connect/token",
                Headers = _httpClient.DefaultRequestHeaders
                    .ToDictionary(
                        h => h.Key,
                        h => h.Value.ToArray()
                    ),
                ContentType = content.Headers.ContentType?.ToString(),
                ContentLength = content.Headers.ContentLength,
                Body = requestBodyString
            };

            var response = await _httpClient.PostAsync(
                $"/realms/{realm}/protocol/openid-connect/token",
                content
            );
            
            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError("RefreshTokenAsync: Failed to refresh token - Status: {Status}, Error: {Error}", response.StatusCode, errorContent);
                response.EnsureSuccessStatusCode();
            }

            var tokenData = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();

            return new SwitchContextResponse
            {
                AccessToken = tokenData?["access_token"]?.ToString() ?? "",
                ExpiresIn = int.TryParse(tokenData?["expires_in"]?.ToString(), out var ei) ? ei : 300,
                RefreshExpiresIn = int.TryParse(tokenData?["refresh_expires_in"]?.ToString(), out var rei) ? rei : 0,
                RefreshToken = tokenData?["refresh_token"]?.ToString(),
                TokenType = tokenData?["token_type"]?.ToString() ?? "Bearer",
                NotBeforePolicy = int.TryParse(tokenData?["not-before-policy"]?.ToString(), out var nbp) ? nbp : 0,
                SessionState = tokenData?["session_state"]?.ToString(),
                Scope = tokenData?["scope"]?.ToString(),
                IdToken = tokenData?.ContainsKey("id_token") == true ? tokenData["id_token"]?.ToString() : null
            };
        }

        private static string ExtractUserIdFromRefreshToken(string refreshToken)
        {
            var handler = new JwtSecurityTokenHandler();
            var jwtToken = handler.ReadJwtToken(refreshToken);
            var sub = jwtToken.Claims.FirstOrDefault(c => c.Type == "sub")?.Value;

            return string.IsNullOrEmpty(sub)
                ? throw new Exception("Invalid refresh token: missing 'sub' claim")
                : sub;
        }

        public async Task<string> GetUserIdBySubAsync(string adminToken, string userId)
        {
            EnsureEnabled();

            var realm = _configuration["KeycloakAuthentication:Realm"];
            if (string.IsNullOrWhiteSpace(realm))
                throw new InvalidOperationException("Cannot find Keycloak realm. Configuration missing.");
            var url = $"/admin/realms/{realm}/users/{userId}";

            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();

            return await response.Content.ReadAsStringAsync();
        }

        public async Task UpdateActiveTenantAsync(string adminToken, string userId, string activeTenant)
        {
            EnsureEnabled();

            var userJson = await GetUserIdBySubAsync(adminToken, userId);

            var user = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(userJson)
                ?? throw new Exception("Failed to deserialize user");

            var attributes = new Dictionary<string, object>();
            if (user.TryGetValue("attributes", out var attrObj))
            {
                if (attrObj is JsonElement elem && elem.ValueKind == JsonValueKind.Object)
                {
                    attributes = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(elem.GetRawText())
                        ?? new Dictionary<string, object>();
                }
                else if (attrObj is Dictionary<string, object> existing)
                {
                    attributes = existing;
                }
            }

            attributes["active_tenant"] = new[] { activeTenant };

            user["attributes"] = attributes;

            var putContent = new StringContent(
                System.Text.Json.JsonSerializer.Serialize(user),
                Encoding.UTF8,
                "application/json");

            var url = $"/admin/realms/{_configuration["KeycloakAuthentication:Realm"]}/users/{userId}";
            var putResponse = await _httpClient.PutAsync(url, putContent);
            putResponse.EnsureSuccessStatusCode();
        }

        public async Task<string> CreateOrganizationAsync(string adminToken, string name, string displayName, string contactPerson, string contactPhone, string organisationUrl)
        {
            EnsureEnabled();

            var realm = _configuration["KeycloakAuthentication:Realm"];
            if (string.IsNullOrWhiteSpace(realm))
                throw new InvalidOperationException("Cannot find Keycloak realm. Configuration missing.");

            var url = $"/admin/realms/{realm}/organizations";

            // Keycloak 26 requires at least one domain — derive it from the organisation URL
            string domainName = organisationUrl;
            if (Uri.TryCreate(organisationUrl, UriKind.Absolute, out var parsedUri))
                domainName = parsedUri.Host;

            var orgPayload = new
            {
                name = name,
                enabled = true,
                domains = new[]
                {
                    new { name = domainName, verified = false }
                },
                attributes = new Dictionary<string, string[]>
                {
                    { "displayName", new[] { displayName } },
                    { "contactPerson", new[] { contactPerson } },
                    { "contactPhone", new[] { contactPhone } },
                    { "organisationUrl", new[] { organisationUrl } }
                }
            };

            var content = new StringContent(
                System.Text.Json.JsonSerializer.Serialize(orgPayload),
                Encoding.UTF8,
                "application/json");

            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
            var response = await _httpClient.PostAsync(url, content);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Failed to create organization: {Status} {Error}", response.StatusCode, error);
                throw new Exception($"Failed to create organization: {response.StatusCode} - {error}");
            }

            var locationHeader = response.Headers.Location?.ToString();
            if (string.IsNullOrEmpty(locationHeader))
                throw new Exception("Keycloak did not return a Location header for the created organization.");

            var orgId = locationHeader.Split('/').Last();
            return orgId;
        }

        public async Task<string> CreateUserAsync(string adminToken, string email, string password, string firstName, string orgName)
        {
            EnsureEnabled();

            var realm = _configuration["KeycloakAuthentication:Realm"];
            if (string.IsNullOrWhiteSpace(realm))
                throw new InvalidOperationException("Cannot find Keycloak realm. Configuration missing.");

            var url = $"/admin/realms/{realm}/users";

            var userPayload = new
            {
                username = email,
                email = email,
                firstName = firstName,
                enabled = true,
                credentials = new[]
                {
                    new { type = "password", value = password, temporary = false }
                },
                attributes = new Dictionary<string, string[]>
                {
                    { "active_tenant", new[] { orgName } },
                    { "tenants", new[] { orgName } }
                }
            };

            var content = new StringContent(
                System.Text.Json.JsonSerializer.Serialize(userPayload),
                Encoding.UTF8,
                "application/json");

            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
            var response = await _httpClient.PostAsync(url, content);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Failed to create user: {Status} {Error}", response.StatusCode, error);
                throw new Exception($"Failed to create user: {response.StatusCode} - {error}");
            }

            var locationHeader = response.Headers.Location?.ToString();
            if (string.IsNullOrEmpty(locationHeader))
                throw new Exception("Keycloak did not return a Location header for the created user.");

            var userId = locationHeader.Split('/').Last();
            return userId;
        }

        public async Task AddUserToOrganizationAsync(string adminToken, string orgId, string userId)
        {
            EnsureEnabled();

            var realm = _configuration["KeycloakAuthentication:Realm"];
            if (string.IsNullOrWhiteSpace(realm))
                throw new InvalidOperationException("Cannot find Keycloak realm. Configuration missing.");

            var url = $"/admin/realms/{realm}/organizations/{orgId}/members";

            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
            var content = new StringContent(userId, Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync(url, content);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Failed to add user {UserId} to organization {OrgId}: {Status} {Error}", userId, orgId, response.StatusCode, error);
                throw new Exception($"Failed to add user to organization: {response.StatusCode} - {error}");
            }
        }

        public async Task DeleteOrganizationAsync(string adminToken, string orgId)
        {
            EnsureEnabled();

            var realm = _configuration["KeycloakAuthentication:Realm"];
            if (string.IsNullOrWhiteSpace(realm))
                throw new InvalidOperationException("Cannot find Keycloak realm. Configuration missing.");

            var url = $"/admin/realms/{realm}/organizations/{orgId}";
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
            var response = await _httpClient.DeleteAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("Rollback: Failed to delete organization {OrgId}: {Status} {Error}", orgId, response.StatusCode, error);
            }
        }

        public async Task DeleteUserAsync(string adminToken, string userId)
        {
            EnsureEnabled();

            var realm = _configuration["KeycloakAuthentication:Realm"];
            if (string.IsNullOrWhiteSpace(realm))
                throw new InvalidOperationException("Cannot find Keycloak realm. Configuration missing.");

            var url = $"/admin/realms/{realm}/users/{userId}";
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
            var response = await _httpClient.DeleteAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("Rollback: Failed to delete user {UserId}: {Status} {Error}", userId, response.StatusCode, error);
            }
        }

        public async Task<List<TenantInfo>> GetUserOrganizationsAsync(string adminToken, string userId)
        {
            EnsureEnabled();

            var realm = _configuration["KeycloakAuthentication:Realm"];
            if (string.IsNullOrWhiteSpace(realm))
                throw new InvalidOperationException("Cannot find Keycloak realm. Configuration missing.");

            var url = $"/admin/realms/{realm}/organizations/members/{userId}/organizations";
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var result = new List<TenantInfo>();

            foreach (var org in doc.RootElement.EnumerateArray())
            {
                if (!org.TryGetProperty("name", out var nameProp))
                    continue;

                var name = nameProp.GetString();
                if (string.IsNullOrEmpty(name))
                    continue;

                var displayName = TryGetDisplayName(org);

                // Fallback: if list endpoint didn't include attributes (Keycloak <26.0.7),
                // fetch individual org details
                if (displayName == null && org.TryGetProperty("id", out var idProp))
                {
                    var orgId = idProp.GetString();
                    if (!string.IsNullOrEmpty(orgId))
                    {
                        displayName = await GetOrgDisplayNameAsync(adminToken, realm, orgId);
                    }
                }

                result.Add(new TenantInfo { Name = name, DisplayName = displayName ?? name });
            }

            return result;
        }

        private static string? TryGetDisplayName(JsonElement org)
        {
            if (org.TryGetProperty("attributes", out var attrs) &&
                attrs.TryGetProperty("displayName", out var dnProp) &&
                dnProp.ValueKind == JsonValueKind.Array &&
                dnProp.GetArrayLength() > 0)
            {
                return dnProp[0].GetString();
            }
            return null;
        }

        private async Task<string?> GetOrgDisplayNameAsync(string adminToken, string realm, string orgId)
        {
            try
            {
                var url = $"/admin/realms/{realm}/organizations/{orgId}";
                _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
                var response = await _httpClient.GetAsync(url);
                if (!response.IsSuccessStatusCode)
                    return null;

                var json = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                return TryGetDisplayName(doc.RootElement);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to fetch display name for org {OrgId}", orgId);
                return null;
            }
        }

        public async Task<string> GetClientUuidAsync(string adminToken, string clientId)
        {
            EnsureEnabled();

            var realm = _configuration["KeycloakAuthentication:Realm"];
            if (string.IsNullOrWhiteSpace(realm))
                throw new InvalidOperationException("Cannot find Keycloak realm. Configuration missing.");

            var url = $"/admin/realms/{realm}/clients?clientId={clientId}";
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var clients = doc.RootElement;

            if (clients.GetArrayLength() == 0)
                throw new Exception($"Client '{clientId}' not found in Keycloak.");

            var uuid = clients[0].GetProperty("id").GetString();
            return uuid ?? throw new Exception($"Client '{clientId}' has no id.");
        }

        public async Task<(string Id, string Name)> GetClientRoleAsync(string adminToken, string clientUuid, string roleName)
        {
            EnsureEnabled();

            var realm = _configuration["KeycloakAuthentication:Realm"];
            if (string.IsNullOrWhiteSpace(realm))
                throw new InvalidOperationException("Cannot find Keycloak realm. Configuration missing.");

            var url = $"/admin/realms/{realm}/clients/{clientUuid}/roles/{roleName}";
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
            var response = await _httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Failed to get client role '{RoleName}': {Status} {Error}", roleName, response.StatusCode, error);
                throw new Exception($"Failed to get client role '{roleName}': {response.StatusCode} - {error}");
            }

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var id = doc.RootElement.GetProperty("id").GetString()
                ?? throw new Exception($"Client role '{roleName}' has no id.");
            var name = doc.RootElement.GetProperty("name").GetString()
                ?? throw new Exception($"Client role '{roleName}' has no name.");

            return (id, name);
        }

        public async Task AssignClientRoleToUserAsync(string adminToken, string userId, string clientUuid, string roleId, string roleName)
        {
            EnsureEnabled();

            var realm = _configuration["KeycloakAuthentication:Realm"];
            if (string.IsNullOrWhiteSpace(realm))
                throw new InvalidOperationException("Cannot find Keycloak realm. Configuration missing.");

            var url = $"/admin/realms/{realm}/users/{userId}/role-mappings/clients/{clientUuid}";

            var rolePayload = new[]
            {
                new { id = roleId, name = roleName }
            };

            var content = new StringContent(
                System.Text.Json.JsonSerializer.Serialize(rolePayload),
                Encoding.UTF8,
                "application/json");

            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
            var response = await _httpClient.PostAsync(url, content);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Failed to assign client role '{RoleName}' to user {UserId}: {Status} {Error}", roleName, userId, response.StatusCode, error);
                throw new Exception($"Failed to assign client role to user: {response.StatusCode} - {error}");
            }
        }

        public async Task<SwitchContextResponse> SwitchContextAsync(SwitchContextRequest request)
        {
            EnsureEnabled();

            if (string.IsNullOrWhiteSpace(request.RefreshToken) || string.IsNullOrWhiteSpace(request.ActiveTenant))
            {
                throw new ArgumentException("Refresh_token or active_tenant cannot be null or empty");
            }
            var adminToken = await GetAdminTokenAsync();
            var userId = ExtractUserIdFromRefreshToken(request.RefreshToken);
            var usersJson = await GetUserIdBySubAsync(adminToken, userId);
            await UpdateActiveTenantAsync(adminToken, userId, request.ActiveTenant.Trim());

            return await RefreshTokenAsync(request.RefreshToken);
        }

        public async Task<string?> GetOrganizationIdByNameAsync(string adminToken, string orgName)
        {
            EnsureEnabled();

            var realm = _configuration["KeycloakAuthentication:Realm"];
            if (string.IsNullOrWhiteSpace(realm))
                throw new InvalidOperationException("Cannot find Keycloak realm. Configuration missing.");

            var url = $"/admin/realms/{realm}/organizations?search={Uri.EscapeDataString(orgName)}&exact=true";
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadAsStringAsync();
            var orgs = System.Text.Json.JsonSerializer.Deserialize<List<Dictionary<string, object>>>(json)
                ?? new List<Dictionary<string, object>>();

            var org = orgs.FirstOrDefault(o =>
                o.TryGetValue("name", out var name) &&
                string.Equals(name?.ToString(), orgName, StringComparison.OrdinalIgnoreCase));

            return org != null && org.TryGetValue("id", out var id) ? id?.ToString() : null;
        }

        public async Task InviteUserToOrganizationAsync(string adminToken, string orgId, string email, string firstName, string lastName)
        {
            EnsureEnabled();

            var realm = _configuration["KeycloakAuthentication:Realm"];
            if (string.IsNullOrWhiteSpace(realm))
                throw new InvalidOperationException("Cannot find Keycloak realm. Configuration missing.");

            var url = $"/admin/realms/{realm}/organizations/{orgId}/members/invite-user";

            var content = new FormUrlEncodedContent([
                new("email", email),
                new("firstName", firstName),
                new("lastName", lastName)
            ]);

            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
            var response = await _httpClient.PostAsync(url, content);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Failed to invite user {Email} to organisation {OrgId}: {Status} {Error}", email, orgId, response.StatusCode, error);
                if ((int)response.StatusCode == 409)
                    throw new KeycloakConflictException($"User {email} is already a member of the organisation.");
                throw new Exception($"Failed to invite user: {(int)response.StatusCode} - {error}");
            }
        }

        /// <summary>
        /// Creates a disabled user in Keycloak with UPDATE_PASSWORD as a required action.
        /// The user cannot log in until they complete the action via the invite email link.
        /// Sets an invitedAt attribute (UTC ISO-8601) so the cleanup job can identify and
        /// remove users who never accept within the allowed window.
        /// </summary>
        public async Task<string> CreateInvitedUserAsync(
            string adminToken, string email, string firstName, string lastName, string orgName)
        {
            EnsureEnabled();

            var realm = _configuration["KeycloakAuthentication:Realm"];
            if (string.IsNullOrWhiteSpace(realm))
                throw new InvalidOperationException("Cannot find Keycloak realm. Configuration missing.");

            var url = $"/admin/realms/{realm}/users";

            var userPayload = new
            {
                username = email,
                email,
                firstName,
                lastName,
                enabled = true,
                requiredActions = new[] { "UPDATE_PASSWORD" },
                attributes = new Dictionary<string, string[]>
                {
                    { "active_tenant", new[] { orgName } },
                    { "tenants",       new[] { orgName } },
                    { "invitedAt",     new[] { DateTime.UtcNow.ToString("o") } }
                }
            };

            var content = new StringContent(
                System.Text.Json.JsonSerializer.Serialize(userPayload),
                Encoding.UTF8,
                "application/json");

            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
            var response = await _httpClient.PostAsync(url, content);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Failed to create invited user {Email}: {Status} {Error}", email, response.StatusCode, error);
                if ((int)response.StatusCode == 409)
                    throw new KeycloakConflictException($"A user with email {email} already exists.");
                throw new Exception($"Failed to create invited user: {response.StatusCode} - {error}");
            }

            var locationHeader = response.Headers.Location?.ToString();
            if (string.IsNullOrEmpty(locationHeader))
                throw new Exception("Keycloak did not return a Location header for the invited user.");

            return locationHeader.Split('/').Last();
        }

        /// <summary>
        /// Triggers Keycloak to send the UPDATE_PASSWORD action email for the given user.
        /// The link in the email is valid for 24 hours (86400 seconds).
        /// After the user sets their password via the themed Keycloak page, their account
        /// is automatically enabled and the required action is cleared.
        /// </summary>
        public async Task SendExecuteActionsEmailAsync(string adminToken, string userId, string clientId, string redirectUri)
        {
            EnsureEnabled();

            var realm = _configuration["KeycloakAuthentication:Realm"];
            if (string.IsNullOrWhiteSpace(realm))
                throw new InvalidOperationException("Cannot find Keycloak realm. Configuration missing.");

            var lifespan = 86400; // 24 hours in seconds
            var url = $"/admin/realms/{realm}/users/{userId}/execute-actions-email" +
                      $"?lifespan={lifespan}" +
                      $"&client_id={Uri.EscapeDataString(clientId)}" +
                      $"&redirect_uri={Uri.EscapeDataString(redirectUri)}";

            var actionsPayload = new[] { "UPDATE_PASSWORD" };
            var content = new StringContent(
                System.Text.Json.JsonSerializer.Serialize(actionsPayload),
                Encoding.UTF8,
                "application/json");

            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
            var response = await _httpClient.PutAsync(url, content);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Failed to send execute-actions email to user {UserId}: {Status} {Error}", userId, response.StatusCode, error);
                throw new Exception($"Failed to send invite email: {response.StatusCode} - {error}");
            }
        }

        /// <summary>
        /// Returns Keycloak user IDs of disabled users who were invited more than
        /// <paramref name="expiry"/> ago but never accepted (invitedAt attribute present,
        /// account still disabled). Used by the cleanup background service.
        /// </summary>
        public async Task<List<string>> GetExpiredInvitedUserIdsAsync(string adminToken, TimeSpan expiry)
        {
            EnsureEnabled();

            var realm = _configuration["KeycloakAuthentication:Realm"];
            if (string.IsNullOrWhiteSpace(realm))
                throw new InvalidOperationException("Cannot find Keycloak realm. Configuration missing.");

            // Fetch all users that still have UPDATE_PASSWORD as a required action —
            // these are invited users who have not yet accepted. Page size 1000 is
            // sufficient for typical org sizes; increase if needed.
            var url = $"/admin/realms/{realm}/users?max=1000";
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);

            var cutoff = DateTime.UtcNow - expiry;
            var expiredIds = new List<string>();

            foreach (var userEl in doc.RootElement.EnumerateArray())
            {
                if (!userEl.TryGetProperty("id", out var idProp))
                    continue;

                var userId = idProp.GetString();
                if (string.IsNullOrEmpty(userId))
                    continue;

                // Only target users that carry the invitedAt attribute
                if (!userEl.TryGetProperty("attributes", out var attrs))
                    continue;

                if (!attrs.TryGetProperty("invitedAt", out var invitedAtArr) ||
                    invitedAtArr.ValueKind != JsonValueKind.Array ||
                    invitedAtArr.GetArrayLength() == 0)
                    continue;

                var invitedAtStr = invitedAtArr[0].GetString();
                if (!DateTime.TryParse(invitedAtStr, null,
                        System.Globalization.DateTimeStyles.RoundtripKind, out var invitedAt))
                    continue;

                if (invitedAt >= cutoff)
                    continue;

                // Confirm they still have UPDATE_PASSWORD pending — if they accepted,
                // Keycloak removes it from requiredActions automatically
                if (!userEl.TryGetProperty("requiredActions", out var actions) ||
                    actions.ValueKind != JsonValueKind.Array)
                    continue;

                var stillPending = actions.EnumerateArray()
                    .Any(a => a.GetString() == "UPDATE_PASSWORD");

                if (stillPending)
                    expiredIds.Add(userId);
            }

            return expiredIds;
        }
    }
}