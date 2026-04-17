using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using S365.Search.Admin.UI.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace S365.Search.Admin.UI.Services
{
    public class UserContextResolver : IUserContextResolver
    {
        private readonly bool _keycloakEnabled;

        public UserContextResolver(IConfiguration configuration)
        {
            _keycloakEnabled = configuration.GetValue<bool>("KeycloakAuthentication:IsEnabled");
        }

        public async Task<AuthenticatedUserResponse> ResolveAsync(HttpContext httpContext, ClaimsPrincipal user)
        {
            string? email = null;
            string? name = null;
            var roles = new List<string>();
            var groupIds = new List<string>();
            string? groupId = null;
            var isKeycloakToken = false;
            var isAuthenticated = user?.Identity?.IsAuthenticated ?? false;

            var xUserinfo = httpContext?.Request?.Headers["X-Userinfo"].FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(xUserinfo) && TryParseKeycloakUserinfo(xUserinfo, out var userinfoEmail, out var userinfoName, out var userinfoGroups, out var userinfoGroupIds, out var userinfoTenant))
            {
                isKeycloakToken = true;
                email = userinfoEmail;
                name = userinfoName;
                roles = userinfoGroups ?? new List<string>();
                if (userinfoGroupIds != null && userinfoGroupIds.Count > 0) groupIds = userinfoGroupIds;
                groupId = userinfoTenant;
            }

            var authHeader = httpContext?.Request?.Headers["Authorization"].ToString();
            if (string.IsNullOrWhiteSpace(authHeader) || !authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                authHeader = null;
            if (authHeader != null)
            {
                var token = authHeader.Substring("Bearer ".Length).Trim();
                if (TryExtractKeycloakFromJwt(token, out var jwtTenant, out var jwtRoles, out var jwtGroupIds))
                {
                    isKeycloakToken = true;
                    if (groupId == null) groupId = jwtTenant;
                    if (roles.Count == 0 && jwtRoles != null) roles = jwtRoles;
                    if (jwtGroupIds != null && jwtGroupIds.Count > 0) groupIds = jwtGroupIds;
                }
                if (groupIds.Count == 0) GetGroupIdsFromJwt(authHeader.Substring("Bearer ".Length).Trim(), groupIds);
            }

            if ((groupId == null || roles.Count == 0 || groupIds.Count == 0) && user?.Identity?.IsAuthenticated == true)
            {
                var accessToken = await httpContext.GetTokenAsync("access_token");
                var idToken = await httpContext.GetTokenAsync("id_token");
                if (!string.IsNullOrWhiteSpace(accessToken) && TryExtractKeycloakFromJwt(accessToken, out var storedTenant, out var storedRoles, out var storedGroupIds))
                {
                    isKeycloakToken = true;
                    if (groupId == null) groupId = storedTenant;
                    if (roles.Count == 0 && storedRoles != null) roles = storedRoles;
                    if (storedGroupIds != null && storedGroupIds.Count > 0) groupIds = storedGroupIds;
                }
                if (groupIds.Count == 0 && !string.IsNullOrWhiteSpace(accessToken)) GetGroupIdsFromJwt(accessToken, groupIds);
                if (groupId == null || roles.Count == 0)
                {
                    if (!string.IsNullOrWhiteSpace(idToken) && TryExtractKeycloakFromJwt(idToken, out var idTenant, out var idRoles, out var idGroupIds))
                    {
                        isKeycloakToken = true;
                        if (groupId == null) groupId = idTenant;
                        if (roles.Count == 0 && idRoles != null) roles = idRoles;
                        if (idGroupIds != null && idGroupIds.Count > 0) groupIds = idGroupIds;
                    }
                    if (groupIds.Count == 0 && !string.IsNullOrWhiteSpace(idToken)) GetGroupIdsFromJwt(idToken, groupIds);
                }
                if (groupId == null || roles.Count == 0)
                {
                    TryExtractFromJwtGeneric(accessToken, ref groupId, roles);
                    if (groupId == null && roles.Count == 0)
                        TryExtractFromJwtGeneric(idToken, ref groupId, roles);
                }
            }

            if (email == null) email = user?.Identity?.Name ?? user?.FindFirst(ClaimTypes.Name)?.Value ?? user?.FindFirst("preferred_username")?.Value ?? user?.FindFirst("email")?.Value;
            if (name == null) name = user?.FindFirst(ClaimTypes.Name)?.Value ?? user?.FindFirst("name")?.Value ?? user?.FindFirst("preferred_username")?.Value;
            if (roles.Count == 0) roles = user?.FindAll(ClaimTypes.Role)?.Select(c => c.Value).ToList() ?? user?.FindAll("roles")?.Select(c => c.Value).ToList() ?? new List<string>();
            if (groupIds.Count == 0) groupIds = user?.FindAll("group_ids")?.Select(c => c.Value).ToList() ?? new List<string>();
            if (groupId == null) groupId = user?.FindFirst("active_tenant")?.Value ?? user?.FindFirst("tenant")?.Value ?? user?.FindFirst("organization")?.Value ?? user?.FindFirst("org_id")?.Value;

            var tenantNames = user?.FindAll("tenants")?.Select(c => c.Value).Distinct().ToList() ?? new List<string>();
            if (tenantNames.Count == 0 && user?.Identity?.IsAuthenticated == true)
            {
                var accessToken = await httpContext.GetTokenAsync("access_token");
                var idToken = await httpContext.GetTokenAsync("id_token");
                var fromToken = GetOrganizationsFromJwt(accessToken) ?? GetOrganizationsFromJwt(idToken);
                if (fromToken != null && fromToken.Count > 0)
                    tenantNames = fromToken;
            }
            if (tenantNames.Count == 0 && !string.IsNullOrEmpty(groupId))
                tenantNames.Add(groupId);

            var tenants = tenantNames.Select(t => new TenantInfo { Name = t, DisplayName = t }).ToList();

            return new AuthenticatedUserResponse
            {
                IsAuthenticated = isAuthenticated,
                IsAuthenticationEnabled = _keycloakEnabled,
                Email = email,
                Name = name,
                Groups = roles,
                GroupIds = groupIds,
                GroupId = groupId,
                IsKeycloakToken = isKeycloakToken,
                Tenants = tenants,
                CurrentTenant = groupId
            };
        }

        internal static bool TryParseKeycloakUserinfo(string base64Userinfo, out string? email, out string? name, out List<string>? roles, out List<string>? groupIds, out string? tenant)
        {
            email = null;
            name = null;
            roles = new List<string>();
            groupIds = new List<string>();
            tenant = null;
            try
            {
                var bytes = Convert.FromBase64String(base64Userinfo);
                var json = Encoding.UTF8.GetString(bytes);
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;
                if (root.TryGetProperty("email", out var e)) email = e.GetString();
                if (root.TryGetProperty("name", out var n)) name = n.GetString();
                if (string.IsNullOrEmpty(name) && root.TryGetProperty("preferred_username", out var pu)) name = pu.GetString();
                if (root.TryGetProperty("active_tenant", out var at)) tenant = at.GetString();
                if (string.IsNullOrEmpty(tenant) && root.TryGetProperty("tenant", out var t)) tenant = t.GetString();
                if (root.TryGetProperty("group_ids", out var gids) && gids.ValueKind == JsonValueKind.Array)
                    foreach (var el in gids.EnumerateArray()) if (el.ValueKind == JsonValueKind.String) groupIds.Add(el.GetString() ?? "");
                if (root.TryGetProperty("groups", out var g) && g.ValueKind == JsonValueKind.Array)
                    foreach (var el in g.EnumerateArray()) if (el.ValueKind == JsonValueKind.String) roles.Add(el.GetString() ?? "");
                if (root.TryGetProperty("resource_access", out var ra))
                    foreach (var client in ra.EnumerateObject())
                        if (client.Value.TryGetProperty("roles", out var r) && r.ValueKind == JsonValueKind.Array)
                            foreach (var role in r.EnumerateArray()) if (role.ValueKind == JsonValueKind.String) roles.Add(role.GetString() ?? "");
                return true;
            }
            catch { return false; }
        }

        public static bool TryExtractKeycloakFromJwt(string jwt, out string? tenant, out List<string>? roles, out List<string>? groupIds)
        {
            tenant = null;
            roles = new List<string>();
            groupIds = new List<string>();
            try
            {
                var parts = jwt.Split('.');
                if (parts.Length < 2) return false;

                var payloadJson = DecodeBase64UrlToString(parts[1]);
                if (string.IsNullOrWhiteSpace(payloadJson)) return false;

                using var doc = JsonDocument.Parse(payloadJson);
                var root = doc.RootElement;

                var looksLikeKeycloak =
                    root.TryGetProperty("resource_access", out _) ||
                    root.TryGetProperty("realm_access", out _) ||
                    root.TryGetProperty("client_id", out _) ||
                    root.TryGetProperty("tenant", out _) ||
                    root.TryGetProperty("group_ids", out _) ||
                    (root.TryGetProperty("iss", out var issCheck) && (issCheck.GetString() ?? "").Contains("/realms/", StringComparison.OrdinalIgnoreCase));

                if (!looksLikeKeycloak) return false;

                if (root.TryGetProperty("group_ids", out var gidsProp) && gidsProp.ValueKind == JsonValueKind.Array)
                    foreach (var el in gidsProp.EnumerateArray())
                        if (el.ValueKind == JsonValueKind.String) groupIds.Add(el.GetString() ?? "");

                if (root.TryGetProperty("active_tenant", out var atProp) && atProp.ValueKind == JsonValueKind.String)
                    tenant = atProp.GetString();
                if (string.IsNullOrEmpty(tenant) && root.TryGetProperty("tenant", out var tenantProp) && tenantProp.ValueKind == JsonValueKind.String)
                    tenant = tenantProp.GetString();
                if (string.IsNullOrEmpty(tenant) && root.TryGetProperty("organization", out var orgProp) && orgProp.ValueKind == JsonValueKind.String)
                    tenant = orgProp.GetString();
                if (string.IsNullOrEmpty(tenant) && root.TryGetProperty("org_id", out var orgIdProp) && orgIdProp.ValueKind == JsonValueKind.String)
                    tenant = orgIdProp.GetString();
                if (string.IsNullOrEmpty(tenant) && root.TryGetProperty("realm", out var realmProp) && realmProp.ValueKind == JsonValueKind.String)
                    tenant = realmProp.GetString();
                if (string.IsNullOrEmpty(tenant) && root.TryGetProperty("iss", out var issProp))
                {
                    var iss = issProp.GetString();
                    if (!string.IsNullOrEmpty(iss) && iss.Contains("/realms/", StringComparison.OrdinalIgnoreCase))
                    {
                        var realmSegment = iss.Substring(iss.IndexOf("/realms/", StringComparison.OrdinalIgnoreCase) + "/realms/".Length);
                        var slash = realmSegment.IndexOf('/');
                        tenant = slash >= 0 ? realmSegment.Substring(0, slash) : realmSegment;
                    }
                }

                if (root.TryGetProperty("resource_access", out var ra))
                {
                    foreach (var client in ra.EnumerateObject())
                    {
                        if (client.Value.TryGetProperty("roles", out var r) && r.ValueKind == JsonValueKind.Array)
                        {
                            foreach (var role in r.EnumerateArray())
                                if (role.ValueKind == JsonValueKind.String) roles.Add(role.GetString() ?? "");
                        }
                    }
                }
                if (roles.Count == 0 && root.TryGetProperty("realm_access", out var realm) && realm.TryGetProperty("roles", out var realmRoles) && realmRoles.ValueKind == JsonValueKind.Array)
                {
                    foreach (var role in realmRoles.EnumerateArray())
                        if (role.ValueKind == JsonValueKind.String) roles.Add(role.GetString() ?? "");
                }
                if (roles.Count == 0 && root.TryGetProperty("groups", out var groupsProp) && groupsProp.ValueKind == JsonValueKind.Array)
                    foreach (var el in groupsProp.EnumerateArray())
                        if (el.ValueKind == JsonValueKind.String) roles.Add(el.GetString() ?? "");

                return true;
            }
            catch
            {
                return false;
            }
        }

        internal static void GetGroupIdsFromJwt(string? jwt, List<string> groupIds)
        {
            if (string.IsNullOrWhiteSpace(jwt) || groupIds == null) return;
            try
            {
                var parts = jwt.Split('.');
                if (parts.Length < 2) return;
                var payloadJson = DecodeBase64UrlToString(parts[1]);
                if (string.IsNullOrWhiteSpace(payloadJson)) return;
                using var doc = JsonDocument.Parse(payloadJson);
                var root = doc.RootElement;
                if (root.TryGetProperty("group_ids", out var gids) && gids.ValueKind == JsonValueKind.Array)
                    foreach (var el in gids.EnumerateArray())
                        if (el.ValueKind == JsonValueKind.String) groupIds.Add(el.GetString() ?? "");
            }
            catch { }
        }

        internal static void TryExtractFromJwtGeneric(string? jwt, ref string? tenant, List<string> roles)
        {
            if (string.IsNullOrWhiteSpace(jwt)) return;
            try
            {
                var parts = jwt.Split('.');
                if (parts.Length < 2) return;
                var payloadJson = DecodeBase64UrlToString(parts[1]);
                if (string.IsNullOrWhiteSpace(payloadJson)) return;
                using var doc = JsonDocument.Parse(payloadJson);
                var root = doc.RootElement;

                if (string.IsNullOrEmpty(tenant))
                {
                    if (root.TryGetProperty("active_tenant", out var at) && at.ValueKind == JsonValueKind.String) tenant = at.GetString();
                    if (string.IsNullOrEmpty(tenant) && root.TryGetProperty("tenant", out var t) && t.ValueKind == JsonValueKind.String) tenant = t.GetString();
                    if (string.IsNullOrEmpty(tenant) && root.TryGetProperty("organization", out var o) && o.ValueKind == JsonValueKind.String) tenant = o.GetString();
                    if (string.IsNullOrEmpty(tenant) && root.TryGetProperty("org_id", out var oi) && oi.ValueKind == JsonValueKind.String) tenant = oi.GetString();
                    if (string.IsNullOrEmpty(tenant) && root.TryGetProperty("org", out var o2) && o2.ValueKind == JsonValueKind.String) tenant = o2.GetString();
                    if (string.IsNullOrEmpty(tenant) && root.TryGetProperty("tid", out var tid) && tid.ValueKind == JsonValueKind.String) tenant = tid.GetString();
                    if (string.IsNullOrEmpty(tenant) && root.TryGetProperty("realm", out var r) && r.ValueKind == JsonValueKind.String) tenant = r.GetString();
                    if (string.IsNullOrEmpty(tenant) && root.TryGetProperty("iss", out var issProp))
                    {
                        var iss = issProp.GetString();
                        if (!string.IsNullOrEmpty(iss) && iss.Contains("/realms/", StringComparison.OrdinalIgnoreCase))
                        {
                            var realmSegment = iss.Substring(iss.IndexOf("/realms/", StringComparison.OrdinalIgnoreCase) + "/realms/".Length);
                            var slash = realmSegment.IndexOf('/');
                            tenant = slash >= 0 ? realmSegment.Substring(0, slash) : realmSegment;
                        }
                    }
                }

                if (roles.Count == 0 && root.TryGetProperty("roles", out var rolesProp) && rolesProp.ValueKind == JsonValueKind.Array)
                {
                    foreach (var el in rolesProp.EnumerateArray())
                        if (el.ValueKind == JsonValueKind.String) roles.Add(el.GetString() ?? "");
                }
                if (roles.Count == 0 && root.TryGetProperty("group", out var g))
                {
                    if (g.ValueKind == JsonValueKind.String) roles.Add(g.GetString() ?? "");
                    else if (g.ValueKind == JsonValueKind.Array)
                        foreach (var el in g.EnumerateArray())
                            if (el.ValueKind == JsonValueKind.String) roles.Add(el.GetString() ?? "");
                }
                if (roles.Count == 0 && root.TryGetProperty("groups", out var gs) && gs.ValueKind == JsonValueKind.Array)
                {
                    foreach (var el in gs.EnumerateArray())
                        if (el.ValueKind == JsonValueKind.String) roles.Add(el.GetString() ?? "");
                }
                if (roles.Count == 0 && root.TryGetProperty("resource_access", out var ra))
                {
                    foreach (var client in ra.EnumerateObject())
                        if (client.Value.TryGetProperty("roles", out var r) && r.ValueKind == JsonValueKind.Array)
                            foreach (var el in r.EnumerateArray())
                                if (el.ValueKind == JsonValueKind.String) roles.Add(el.GetString() ?? "");
                }
                if (roles.Count == 0 && root.TryGetProperty("realm_access", out var realm) && realm.TryGetProperty("roles", out var rr) && rr.ValueKind == JsonValueKind.Array)
                {
                    foreach (var el in rr.EnumerateArray())
                        if (el.ValueKind == JsonValueKind.String) roles.Add(el.GetString() ?? "");
                }
            }
            catch { }
        }

        internal static List<string>? GetOrganizationsFromJwt(string? jwt)
        {
            if (string.IsNullOrWhiteSpace(jwt)) return null;
            try
            {
                var parts = jwt.Split('.');
                if (parts.Length < 2) return null;
                var payloadJson = DecodeBase64UrlToString(parts[1]);
                if (string.IsNullOrWhiteSpace(payloadJson)) return null;
                using var doc = JsonDocument.Parse(payloadJson);
                var root = doc.RootElement;
                var list = new List<string>();
                if (root.TryGetProperty("organization", out var orgs) && orgs.ValueKind == JsonValueKind.Array)
                {
                    foreach (var el in orgs.EnumerateArray())
                        if (el.ValueKind == JsonValueKind.String)
                        {
                            var s = el.GetString();
                            if (!string.IsNullOrEmpty(s)) list.Add(s);
                        }
                }
                if (list.Count == 0 && root.TryGetProperty("org_ids", out var oids) && oids.ValueKind == JsonValueKind.Array)
                {
                    foreach (var el in oids.EnumerateArray())
                        if (el.ValueKind == JsonValueKind.String)
                        {
                            var s = el.GetString();
                            if (!string.IsNullOrEmpty(s)) list.Add(s);
                        }
                }
                return list.Count > 0 ? list : null;
            }
            catch
            {
                return null;
            }
        }

        internal static string? DecodeBase64UrlToString(string base64Url)
        {
            try
            {
                var s = base64Url.Replace('-', '+').Replace('_', '/');
                switch (s.Length % 4)
                {
                    case 2: s += "=="; break;
                    case 3: s += "="; break;
                }
                var bytes = Convert.FromBase64String(s);
                return Encoding.UTF8.GetString(bytes);
            }
            catch
            {
                return null;
            }
        }
    }
}