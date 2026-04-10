using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using S365.Startup.Core.Helpers;
using Steeltoe.Configuration.ConfigServer;
using System.Collections.Generic;

namespace S365.Search.Admin.UI
{
    public class Program
    {
        public static void Main(string[] args)
        {
            WebHostHelper
                .CreateWebHostBuilder(args, addProfiles: true, addAvailableProfiles: true)
                .ConfigureAppConfiguration((context, config) =>
                {
                    // Get the environment from ASPNETCORE_ENVIRONMENT variable
                    var environment = System.Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development";

                    // Add environment variables first
                    config.AddEnvironmentVariables();

                    // Support conventional SPRING_* environment variables
                    var springProfilesActive = System.Environment.GetEnvironmentVariable("SPRING_PROFILES_ACTIVE");
                    var springApplicationName = System.Environment.GetEnvironmentVariable("SPRING_APPLICATION_NAME");
                    var springCloudConfigUri = System.Environment.GetEnvironmentVariable("SPRING_CLOUD_CONFIG_URI");
                    var springCloudConfigFailFast = System.Environment.GetEnvironmentVariable("SPRING_CLOUD_CONFIG_FAILFAST");

                    var springOverrides = new Dictionary<string, string>
                    {
                        { "Spring:Cloud:Config:Env", environment }
                    };

                    if (!string.IsNullOrWhiteSpace(springProfilesActive))
                    {
                        springOverrides["Spring:Profiles:Active"] = springProfilesActive;
                    }

                    if (!string.IsNullOrWhiteSpace(springApplicationName))
                    {
                        springOverrides["Spring:Application:Name"] = springApplicationName;
                    }

                    if (!string.IsNullOrWhiteSpace(springCloudConfigUri))
                    {
                        springOverrides["Spring:Cloud:Config:Uri"] = springCloudConfigUri;
                    }

                    if (bool.TryParse(springCloudConfigFailFast, out var failFast))
                    {
                        springOverrides["Spring:Cloud:Config:FailFast"] = failFast.ToString();
                    }

                    // Override Spring settings from environment variables when available
                    config.AddInMemoryCollection(springOverrides);

                    // Add Steeltoe ConfigServer for Spring Cloud Config integration
                    config.AddConfigServer();

                    // Re-add environment variables AFTER ConfigServer so Azure App Service
                    // Application Settings can override Spring Cloud Config values.
                    // Azure env var pattern: KeycloakAuthentication__IsEnabled=false
                    config.AddEnvironmentVariables();
                })
                .ConfigureWebHostDefaults(webBuilder =>
                {
                    webBuilder.ConfigureKestrel(options => options.AddServerHeader = false);
                    webBuilder.UseStartup<Startup>();
                })
                .Build()
                .Run();
        }
    }
}
