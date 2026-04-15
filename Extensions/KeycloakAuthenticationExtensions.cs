using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using System.Security.Claims;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using S365.Search.Admin.UI.Services;
using System.Threading.Tasks;

namespace S365.Search.Admin.UI.Extensions
{
    public static class KeycloakAuthenticationExtensions
    {
        public static IServiceCollection AddKeycloakAuthentication(this IServiceCollection services, IConfiguration configuration)
        {
            var keycloakConfig = configuration.GetSection("KeycloakAuthentication");
            var isEnabled = keycloakConfig.GetValue<bool>("IsEnabled");

            if (!isEnabled)
            {
                // Keycloak is disabled: register a bypass handler so [Authorize] attributes
                // continue to work and the app is accessible without an identity provider.
                services.AddAuthentication(BypassAuthenticationHandler.SchemeName)
                    .AddScheme<AuthenticationSchemeOptions, BypassAuthenticationHandler>(
                        BypassAuthenticationHandler.SchemeName, null);

                services.AddAuthorization(options =>
                {
                    options.AddPolicy("RequireAuthentication", policy => policy.RequireAuthenticatedUser());
                    options.AddPolicy("AdminOnly", policy => policy.RequireAuthenticatedUser());
                });

                return services;
            }

            services.AddAuthentication(options =>
            {
                options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = OpenIdConnectDefaults.AuthenticationScheme;
            })
            .AddCookie(CookieAuthenticationDefaults.AuthenticationScheme, options =>
            {
                options.LoginPath = "/login";
                options.LogoutPath = "/logout";
                options.ExpireTimeSpan = TimeSpan.FromHours(8);
                options.SlidingExpiration = true;
            })
            .AddOpenIdConnect(OpenIdConnectDefaults.AuthenticationScheme, options =>
            {
                options.Authority = keycloakConfig["Authority"];
                options.MetadataAddress = keycloakConfig["MetadataAddress"];
                options.ClientId = keycloakConfig["ClientId"];
                options.ClientSecret = keycloakConfig["ClientSecret"];
                options.ResponseType = keycloakConfig["ResponseType"] ?? "code";
                options.Scope.Add("openid");
                options.Scope.Add("profile");
                options.Scope.Add("email");
                options.Scope.Add("organization");
                options.SaveTokens = keycloakConfig.GetValue<bool>("SaveTokens");
                options.CallbackPath = keycloakConfig["CallbackPath"] ?? "/signin-oidc";
                options.SignedOutCallbackPath = "/signout-callback-oidc";
                options.RequireHttpsMetadata = keycloakConfig.GetValue<bool>("RequireHttpsMetadata");
                options.UsePkce = keycloakConfig.GetValue<bool>("UsePkce");
                
                // Allow HTTP Keycloak in production temporarily
                options.BackchannelHttpHandler = new HttpClientHandler()
                {
                    ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => true
                };

                // Handle organization context and map Keycloak tenant/groups from tokens to claims
                options.Events = new OpenIdConnectEvents
                {
                    OnTokenValidated = async context =>
                    {
                        if (context.TokenEndpointResponse != null)
                        {
                            var tokens = context.Properties.GetTokens()?.ToList() ?? new List<AuthenticationToken>();
                            var p = context.TokenEndpointResponse.Parameters;
                            if (p.TryGetValue("expires_in", out var expiresIn) && !string.IsNullOrEmpty(expiresIn))
                                tokens.Add(new AuthenticationToken { Name = "expires_in", Value = expiresIn });
                            if (p.TryGetValue("refresh_expires_in", out var refreshExpiresIn) && !string.IsNullOrEmpty(refreshExpiresIn))
                                tokens.Add(new AuthenticationToken { Name = "refresh_expires_in", Value = refreshExpiresIn });
                            if (p.TryGetValue("session_state", out var sessionState) && !string.IsNullOrEmpty(sessionState))
                                tokens.Add(new AuthenticationToken { Name = "session_state", Value = sessionState });
                            if (p.TryGetValue("scope", out var scope) && !string.IsNullOrEmpty(scope))
                                tokens.Add(new AuthenticationToken { Name = "scope", Value = scope });
                            if (p.TryGetValue("not-before-policy", out var notBeforePolicy))
                                tokens.Add(new AuthenticationToken { Name = "not_before_policy", Value = notBeforePolicy ?? "0" });
                            if (tokens.Count > (context.Properties.GetTokens()?.Count() ?? 0))
                                context.Properties.StoreTokens(tokens);
                        }

                        var identity = context.Principal?.Identity as ClaimsIdentity;
                        if (identity != null)
                        {
                            // Copy organization to org_id for backward compatibility
                            var organizationClaim = context.Principal?.FindFirst("organization");
                            if (organizationClaim != null)
                                identity.AddClaim(new Claim("org_id", organizationClaim.Value));

                            // Map tenant and groups from access_token (or id_token) so GetUserDetails finds them in User.Claims
                            string? tenant = null;
                            var roles = new List<string>();
                            var accessToken = context.TokenEndpointResponse?.AccessToken;
                            var idToken = context.TokenEndpointResponse?.IdToken;
                            if (UserContextResolver.TryExtractKeycloakFromJwt(accessToken, out var jwtTenant, out var jwtRoles, out _))
                            {
                                tenant = jwtTenant;
                                if (jwtRoles != null) roles.AddRange(jwtRoles);
                            }
                            if ((string.IsNullOrEmpty(tenant) || roles.Count == 0) && UserContextResolver.TryExtractKeycloakFromJwt(idToken, out var idTenant, out var idRoles, out _))
                            {
                                if (string.IsNullOrEmpty(tenant)) tenant = idTenant;
                                if (idRoles != null) roles.AddRange(idRoles);
                            }
                            if (!string.IsNullOrEmpty(tenant))
                                identity.AddClaim(new Claim("tenant", tenant));
                            foreach (var role in roles.Where(r => !string.IsNullOrEmpty(r)).Distinct())
                                identity.AddClaim(new Claim(ClaimTypes.Role, role));
                        }

                        await Task.CompletedTask;
                    },
                    OnRedirectToIdentityProvider = async context =>
                    {
                        // Check if username hint is provided
                        if (context.Properties.Items.ContainsKey("login_hint"))
                        {
                            var loginHint = context.Properties.Items["login_hint"];
                            context.ProtocolMessage.LoginHint = loginHint;
                        }

                        // Check if organization parameter is provided
                        if (context.HttpContext.Request.Query.ContainsKey("org"))
                        {
                            var org = context.HttpContext.Request.Query["org"];
                            context.ProtocolMessage.SetParameter("kc_idp_hint", $"organization:{org}");
                        }

                        await Task.CompletedTask;
                    },
                    OnAccessDenied = async context =>
                    {
                        context.Response.Redirect("/error?message=access_denied");
                        await Task.CompletedTask;
                    },
                    OnAuthenticationFailed = async context =>
                    {
                        context.Response.Redirect("/error?message=auth_failed");
                        await Task.CompletedTask;
                    }
                };
            });

            services.AddAuthorization(options =>
            {
                options.AddPolicy("RequireAuthentication", policy =>
                {
                    policy.RequireAuthenticatedUser();
                });

                options.AddPolicy("AdminOnly", policy =>
                {
                    policy.RequireAuthenticatedUser();
                    policy.RequireClaim("roles", "admin", "manager");
                });
            });

            return services;
        }

    }
}