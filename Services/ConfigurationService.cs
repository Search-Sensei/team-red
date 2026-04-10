using Microsoft.Extensions.Configuration;
using S365.Search.Core.Service;
using S365.Search.Admin.UI.Models;
using Constants = S365.Search.Core.Utils.Constants;
using S365.Search.Core.Service.Database;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using S365.Search.Core.Domain;
using S365.Search.Core.Domain.Configuration;
using S365.Search.Core.Domain.UserGroup;
using S365.Search.Core.Domain.QueryRule;
using S365.Search.Core.Domain.Synonym;
using S365.Search.Core.Domain.FastLinks;
using S365.Search.Core.Domain.Categories;
using S365.Search.Core.Domain.CategoryFastLink;
using S365.Search.Core.Domain.UserPermission;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using Newtonsoft.Json;

namespace S365.Search.Admin.UI.Services
{
    
    public class ConfigurationService : IConfigurationService
    {
        private readonly IConfiguration configuration;
        private readonly IApplicationConfiguration applicationConfiguration;
        private readonly IDatabaseDocumentClient documentClient;
        private readonly IDatabaseServices databaseServices;

        private readonly string defaultDatabaseCollectionQueryRulesName = "QueryRules";
        private readonly string defaultDatabaseCollectionSynonymsName = "Synonyms";
        private readonly string defaultDatabaseCollectionFastLinkName = "FastLinks";
        private readonly string defaultDatabaseCollectionCategoryName = "Category";
        private readonly string defaultDatabaseCollectionCategoryFastLinkName = "CategoryFastLink";
        private readonly string defaultDatabaseCollectionUserPermissionName = "UserPermission";
        private readonly string defaultDatabaseCollectionUserGroupsName = "UserGroups";

        private readonly string databaseCollectionQueryRulesName;
        private readonly string databaseCollectionSynonymsName;
        private readonly string databaseCollectionFastLinkName;
        private readonly string databaseCollectionCategoryName;
        private readonly string databaseCollectionCategoryFastLinkName;
        private readonly string databaseCollectionUserPermissionName;
        private readonly string databaseCollectionUserGroupsName;

        public ConfigurationService(IConfiguration configuration, IApplicationConfiguration applicationConfiguration = null, IDatabaseDocumentClient documentClient = null, IDatabaseServices databaseServices = null)
        {
            this.configuration = configuration;
            this.applicationConfiguration = applicationConfiguration;
            this.documentClient = documentClient;
            this.databaseServices = databaseServices;

            databaseCollectionQueryRulesName = configuration.GetValue<string>(Constants.ConfigKeys.AdminDatabaseCollectionNameKey);
            databaseCollectionSynonymsName = configuration.GetValue<string>(Constants.ConfigKeys.AdminDatabaseCollectionSynonymNameKey);
            databaseCollectionFastLinkName = configuration.GetValue<string>(Constants.ConfigKeys.AdminDatabaseCollectionFastLinkNameKey);
            databaseCollectionCategoryName = configuration.GetValue<string>(Constants.ConfigKeys.AdminDatabaseCollectioCategoryNameKey);
            databaseCollectionCategoryFastLinkName = configuration.GetValue<string>(Constants.ConfigKeys.AdminDatabaseCollectioCategoryFastLinkNameKey);
            databaseCollectionUserPermissionName = configuration.GetValue<string>(Constants.ConfigKeys.AdminDatabaseCollectionUserPermissonNameKey);
            databaseCollectionUserGroupsName = configuration.GetValue<string>(Constants.ConfigKeys.AdminDatabaseCollectionUserGroupsNameKey);

            if (string.IsNullOrEmpty(databaseCollectionQueryRulesName))
            {
                databaseCollectionQueryRulesName = defaultDatabaseCollectionQueryRulesName;
            }

            if (string.IsNullOrEmpty(databaseCollectionSynonymsName))
            {
                databaseCollectionSynonymsName = defaultDatabaseCollectionSynonymsName;
            }

            if (string.IsNullOrEmpty(databaseCollectionFastLinkName))
            {
                databaseCollectionFastLinkName = defaultDatabaseCollectionFastLinkName;
            }

            if (string.IsNullOrEmpty(databaseCollectionCategoryName))
            {
                databaseCollectionCategoryName = defaultDatabaseCollectionCategoryName;
            }

            if (string.IsNullOrEmpty(databaseCollectionCategoryFastLinkName))
            {
                databaseCollectionCategoryFastLinkName = defaultDatabaseCollectionCategoryFastLinkName;
            }

            if (string.IsNullOrEmpty(databaseCollectionUserPermissionName))
            {
                databaseCollectionUserPermissionName = defaultDatabaseCollectionUserPermissionName;
            }

            if (string.IsNullOrEmpty(databaseCollectionUserGroupsName))
            {
                databaseCollectionUserGroupsName = defaultDatabaseCollectionUserGroupsName;
            }
        }

        public async Task<string> CreateDatabaseFirst(RequestDatabaseName request)
        {
            if (documentClient == null || databaseServices == null)
            {
                return "Database services are not configured";
            }

            // if (await documentClient.DatabaseExistsAsync(request.DatabaseName))
            // {
            //     return "Database name already exists";
            // }

            // await documentClient.CreateDatabaseIfNotExistsAsync(request.DatabaseName);

            await databaseServices.RetrieveDocumentsAsync<QueryRule>(databaseCollectionQueryRulesName);
            await databaseServices.RetrieveDocumentsAsync<Synonym>(databaseCollectionSynonymsName);
            await databaseServices.RetrieveDocumentsAsync<FastLinkTable>(databaseCollectionFastLinkName);
            await databaseServices.RetrieveDocumentsAsync<CategoryTable>(databaseCollectionCategoryName);
            await databaseServices.RetrieveDocumentsAsync<CategoryFastLink>(databaseCollectionCategoryFastLinkName);
            await databaseServices.RetrieveDocumentsAsync<UserPermission>(databaseCollectionUserPermissionName);
            await databaseServices.RetrieveDocumentsAsync<UserGroup>(databaseCollectionUserGroupsName);

            return "Successfully";
        }

        public async Task<string> GetAccessTokenAsync()
        {
            var accessKeyEnvVariableName = configuration.GetValue<string>("AccessKeySettings:AccessKeyEnvironmentVariable");
            var encryptionKeyEnvVariableName = configuration.GetValue<string>("AccessKeySettings:EncryptionKeyEnvironmentVariable");

            var accessKey = Environment.GetEnvironmentVariable(accessKeyEnvVariableName);
            var encryptionKey = Environment.GetEnvironmentVariable(encryptionKeyEnvVariableName);
            var domainTokenUrl = GetSettings().DomainToken;

            if (string.IsNullOrWhiteSpace(accessKey) || string.IsNullOrWhiteSpace(encryptionKey))
            {
                throw new InvalidOperationException("Access key or encryption key is missing");
            }

            if (string.IsNullOrWhiteSpace(domainTokenUrl))
            {
                throw new InvalidOperationException("Domain token endpoint is not configured");
            }

            var encryptedKey = Convert.ToBase64String(Encoding.UTF8.GetBytes(accessKey + encryptionKey));

            using var client = new HttpClient();
            var postBody = new { encryptedAccessKey = encryptedKey };
            var response = await client.PostAsJsonAsync(domainTokenUrl, postBody);
            if (!response.IsSuccessStatusCode)
            {
                throw new HttpRequestException($"Token endpoint returned {(int)response.StatusCode}");
            }

            var tokenResult = await response.Content.ReadAsStringAsync();
            var token = JsonConvert.DeserializeObject<dynamic>(tokenResult)?.access_token?.ToString();
            if (string.IsNullOrWhiteSpace(token))
            {
                throw new InvalidOperationException("Failed to retrieve access token");
            }

            return token;
        }

        public bool IsCertificateAuthenticationEnabled()
        {
            return configuration.GetValue<bool>("CertificateAuthentication");
        }



        public AdminSettings GetSettings()
        {
            try
            {
                var settings = new AdminSettings();

                configuration.GetSection(Constants.ConfigKeys.AdminSettingsKey).Bind(settings);
                configuration.GetSection(Constants.ConfigKeys.SearchKey).Bind(settings.SearchSettings);
                
                // Safely get available profiles and sidebar settings
                try
                {
                    if (applicationConfiguration != null)
                    {
                        var profiles = applicationConfiguration.GetAvailableProfileItems();
                        settings.AvailableProfiles = profiles ?? new List<AvailableProfile>();
                    }
                    else
                    {
                        settings.AvailableProfiles = new List<AvailableProfile>();
                    }
                }
                catch (Exception ex)
                {
                    System.Diagnostics.Debug.WriteLine($"Error getting available profiles: {ex.Message}");
                    settings.AvailableProfiles = new List<AvailableProfile>();
                }
                
                try
                {
                    if (applicationConfiguration != null)
                    {
                        var sidebar = applicationConfiguration.GetSettingShowAdminUISidebarItem();
                        settings.ShowAdminSidebar = sidebar;
                    }
                    // If applicationConfiguration is null, ShowAdminSidebar will remain as default from constructor
                }
                catch (Exception ex)
                {
                    System.Diagnostics.Debug.WriteLine($"Error getting admin sidebar settings: {ex.Message}");
                    // ShowAdminSidebar already initialized in AdminSettings constructor, so no need to set it again
                }

                return settings;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error in GetSettings: {ex.Message}");
                System.Diagnostics.Debug.WriteLine($"Stack Trace: {ex.StackTrace}");
                throw;
            }
        }
    }
}
