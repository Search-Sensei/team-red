using System;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Security.Claims;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Newtonsoft.Json;
using S365.Search.Admin.UI.Extensions;
using S365.Search.Admin.UI.Middleware;
using S365.Search.Admin.UI.Services;
using S365.Search.Core.Service;
using S365.Startup.Core.Helpers;

namespace S365.Search.Admin.UI
{
    public class Startup
    {
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }

        public void ConfigureServices(IServiceCollection services)
        {
            Console.WriteLine("KeycloakAuthentication:IsEnabled = " + Configuration["KeycloakAuthentication:IsEnabled"]);

            services
            .AddControllersWithViews()
            .AddNewtonsoftJson(options =>
            {
                options.SerializerSettings.StringEscapeHandling = Newtonsoft.Json.StringEscapeHandling.EscapeHtml;
                options.SerializerSettings.Formatting = Newtonsoft.Json.Formatting.Indented;
            });
            services.AddSwaggerGen(options =>
            {
                options.ResolveConflictingActions(apiDescriptions => apiDescriptions.First());
                options.EnableAnnotations();
            });

            // Add Keycloak Authentication
            services.AddKeycloakAuthentication(Configuration);

            // Register all default search services (including IUserPermissionsService)
            services.RegisterDefaultSearchServices();
            services.AddSingleton<IUserService, UserService>();

            // Register ConfigurationService
            services.AddScoped<IConfigurationService>(serviceProvider =>
            {
                var configuration = serviceProvider.GetRequiredService<IConfiguration>();
                var applicationConfiguration = serviceProvider.GetService<S365.Search.Core.Service.IApplicationConfiguration>();
                var documentClient = serviceProvider.GetService<S365.Search.Core.Service.Database.IDatabaseDocumentClient>();
                var databaseServices = serviceProvider.GetService<S365.Search.Core.Service.Database.IDatabaseServices>();

                return new ConfigurationService(configuration, applicationConfiguration, documentClient, databaseServices);
            });


            services.AddHttpClient<KeycloakService>();
            services.AddScoped<KeycloakService>();
            services.AddScoped<IProxyAuthenticationService, ProxyAuthenticationService>();
            services.AddScoped<IAnalyticsProxyService, AnalyticsProxyService>();
            services.AddScoped<IUserContextResolver, UserContextResolver>();
            services.AddScoped<ITenantContextService, TenantContextService>();
            services.AddScoped<ITokenRefreshService, TokenRefreshService>();

            // Register HttpClient for proxy controllers
            services.AddHttpClient("ExternalBackendClient", client =>
            {
                client.Timeout = System.TimeSpan.FromSeconds(120);
            });

            // Register HttpClient for URL validation during registration
            services.AddHttpClient("UrlValidation");

            services.AddControllers().ConfigureApiBehaviorOptions(options =>
            {
                options.InvalidModelStateResponseFactory = context =>
                {
                    var problemDetails = new ValidationProblemDetails(context.ModelState)
                    {
                        Type = "https://tools.ietf.org/html/rfc7231#section-6.5.1",
                        Title = "Invalid Request",
                        Status = StatusCodes.Status400BadRequest,
                        Detail = "The request contains invalid or missing data. Please check and try again.",
                        Instance = context.HttpContext.Request.Path
                    };

                    problemDetails.Extensions["traceId"] = context.HttpContext.TraceIdentifier;
                    return new BadRequestObjectResult(problemDetails);
                };
            });

            services.AddRateLimiter(options =>
            {
                options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
                {
                    string partitionKey = "anonymous";
                    if (httpContext.User.Identity?.IsAuthenticated == true)
                    {
                        var userId = httpContext.User.FindFirst("sub")?.Value
                            ?? httpContext.User.FindFirst(ClaimTypes.Email)?.Value
                            ?? httpContext.User.Identity.Name;

                        if (!string.IsNullOrEmpty(userId))
                        {
                            partitionKey = $"user:{userId}";
                        }
                    }
                    else
                    {
                        partitionKey = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown-ip";
                    }
                    var endpoint = httpContext.Request.Path.Value?.TrimEnd('/') ?? "/unknown";
                    partitionKey = $"{partitionKey}:{endpoint}";

                    return RateLimitPartition.GetFixedWindowLimiter(
                        partitionKey: partitionKey,
                        factory: partition => new FixedWindowRateLimiterOptions
                        {
                            PermitLimit = 500,
                            Window = TimeSpan.FromMinutes(1),
                            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                            QueueLimit = 0
                        });

                });

                options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
                options.OnRejected = async (context, token) =>
                {
                    context.HttpContext.Response.Headers.Append("Retry-After", "60");
                    context.HttpContext.Response.Headers.Append("X-RateLimit-Remaining", "0");
                    context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                    context.HttpContext.Response.ContentType = "application/json";

                    var error = new
                    {
                        status = 429,
                        title = "Too Many Requests",
                        detail = "Rate limit exceeded. Please try again later."
                    };

                    await context.HttpContext.Response.WriteAsJsonAsync(error, cancellationToken: token);
                };
            });
        }

        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            app.Use(async (context, next) =>
            {
                context.Response.Headers["Server"] = "";
                context.Response.Headers["X-Powered-By"] = "";
                context.Response.Headers["X-AspNet-Version"] = "";
                context.Response.Headers["X-AspNetMvc-Version"] = "";
                context.Response.Headers.Append("Content-Security-Policy", "frame-ancestors none;");
                if (!env.IsDevelopment())
                {
                    context.Response.Headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload";
                }
                await next();
            });

            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }
            else
            {
                app.UseExceptionHandler(errorApp =>
                {
                    errorApp.Run(async context =>
                    {
                        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                        context.Response.ContentType = "application/json; charset=utf-8";

                        var exceptionFeature = context.Features.Get<IExceptionHandlerFeature>();
                        var exception = exceptionFeature?.Error;

                        var errorResponse = new
                        {
                            status = 500,
                            title = "Internal Server Error",
                            detail = "An unexpected error occurred on the server. Our team has been notified. Please try again later."
                        };

                        await context.Response.WriteAsJsonAsync(errorResponse);
                    });
                });
                app.UseHsts();
            }

            app.UseRouting();

            // Add Authentication and Authorization middleware
            app.UseAuthentication();
            app.UseAuthorization();

            // OWASP REQUEST-932-APPLICATION-ATTACK-RCE (rules 932115, 932150): reject requests containing RCE-like patterns
            app.UseMiddleware<OwaspRceRequestValidationMiddleware>();

            // Configure static files with proper path mapping
            app.UseStaticFiles(new StaticFileOptions
            {
                RequestPath = "",
                FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(
                    Path.Combine(env.ContentRootPath, "wwwroot")
                )
            });

            // Also serve files from /adminui path to handle the base href correctly
            app.UseStaticFiles(new StaticFileOptions
            {
                RequestPath = "/adminui",
                FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(
                    Path.Combine(env.ContentRootPath, "wwwroot", "adminui")
                )
            });

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
                endpoints.MapFallback(async context =>
                {
                    var path = context.Request.Path.Value ?? "";
                    if (path.StartsWith("/adminui/", StringComparison.OrdinalIgnoreCase) ||
                        path.StartsWith("/api/", StringComparison.OrdinalIgnoreCase))
                    {
                        context.Response.StatusCode = 404;
                        context.Response.ContentType = "application/json";
                        await context.Response.WriteAsync(
                            "{\"error\":\"Not Found\",\"message\":\"API endpoint not found. Check route and method.\"}"
                        );
                        return;
                    }
                    var indexPath = Path.Combine(env.WebRootPath, "adminui/index.html");
                    if (File.Exists(indexPath))
                    {
                        context.Response.ContentType = "text/html";
                        await context.Response.SendFileAsync(indexPath);
                    }
                    else
                    {
                        context.Response.StatusCode = 404;
                        await context.Response.WriteAsync("SPA index.html not found");
                    }
                });
            });

            app.UseSwagger();
            app.UseSwaggerUI(c =>
            {
                c.SwaggerEndpoint("/swagger/v1/swagger.json", "API V1");
            });
        }
    }
}
