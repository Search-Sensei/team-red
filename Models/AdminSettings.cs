using S365.Search.Core.Domain;
using S365.Search.Core.Dto;
using System.Collections.Generic;
using S365.Search.Core.Domain.Configuration;

namespace S365.Search.Admin.UI.Models
{

    public class AdminSettings
    {
        public AdminSettings()
        {
            AvailableProfiles = new List<AvailableProfile>();
            SupportMessage = new SupportMessage();
            ShowAdminSidebar = new ShowAdminSidebar();
            SearchSettings = new SearchSettings();
        }



        public string SearchAdminApiUrl { get; set; }



        public string SearchApiUrl { get; set; }



        public string ApplicationTitle { get; set; }


        public List<AvailableProfile> AvailableProfiles { get; set; }


        public SupportMessage SupportMessage { get; set; }


        public SearchQueryDefinition BoostsBlocksSearchQueryDefinition { get; set; }


        public int DefaultEndDateYearIncrement { get; set; }

        public string DomainDisplay { get; set; }

        public string DomainS365Delete { get; set; }

        public string DomainNavigation { get; set; }
        public string DomainSuggestion { get; set; }
        public string DomainOperation { get; set; }
        public string DomainToken { get; set; }

        public int NavNameMaxLength { get; set; }

        public int NavDescriptionMaxLength { get; set; }
        public bool MobileNavigationEnabled { get; set; }
        public bool AccessibilityNavigationEnabled { get; set; }
        public ShowAdminSidebar ShowAdminSidebar { get; set; }
        public OIDCAuthenticationConfiguration OIDCAuthentication { get; set; }

        public bool UserPermissionEnabled { get; set; }

        public bool NavigationSettingEnabled { get; set; }
        public string BookStackUrl { get; set; }
        public string PublicKey { get; set; }
        public string PrivateKey { get; set; }
        public string ThumbPrint { get; set; }
        public SearchSettings SearchSettings { get; set; }
    }

    public class SearchSettings
    {
        public int DefaultPageSize { get; set; }

        public int DefaultControlPanelsPageSize { get; set; }

        public int DefaultFastLinksPageSize { get; set; }

        public int DefaultNavigationPageSize { get; set; }

        public int DefaultContentEnhancementPageSize { get; set; }

        public int DefaultSearchSuggestionPageSize { get; set; }
    }
}
