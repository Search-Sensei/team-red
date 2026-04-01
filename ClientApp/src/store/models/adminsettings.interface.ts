import { IAvailableProfile } from "./availableprofile.interface";
import { ISupportMessage } from "./supportmessage.interface";
import { SearchQueryDefinition } from "./Search/SearchQueryDefinition";

/**
 * Settings for the UI project. These settings are retrieved from appsettings in the project so they can
 * easily be configured when released or during the deployment process for different customers.
 */
export interface IAdminSettings {
    /**
     * The URL of the Search Admin API that will provide the QueryRules for example for FeaturedContent and Boosts and Blocks.
     * <example>https://ds365api.search365.ai/admin</example>
     */
    searchAdminApiUrl: string;

    /**
     * The URL of the Search API that will be used to provide search results for Boosting and Blocking.
     * <example>https://ds365api.search365.ai/</example>
     */
    searchApiUrl: string;

    /**
     * The title to display in the UI application.
        * <example>OSP Search Admin</example>
     */
    applicationTitle: string;

    /**
    * Gets the list of profiles that will be used to select which profiles the Featured Content, Boosts
    * and Blocks should apply to.
    */
    availableProfiles: IAvailableProfile[];

    /**
     * Contains details of how to specify an error message in the UI with details of who to contact.
     */
    supportMessage: ISupportMessage;

    /**
     * The SearchQueryDefinition parameters used to define parameters for calling the Search API to retrieve results
     * that can be boosted and blocked in the Admin UI. This is the initial definition as the query for example will
     * be overriden by the search term specified by the user in the Wizard control.
     */
    boostsBlocksSearchQueryDefinition: SearchQueryDefinition;

    /**
     * The number of years to add to the current date for the default for the end date of a QueryRule. By default we expect
     * a date into the future to ensure that the rule is applied indefinitely. This is the more likely type of rule to be
     * created rather than a short lived feature, boost or block.
     */
    defaultEndDateYearIncrement: number;

    navNameMaxLength: number;

    navDescriptionMaxLength: number;

    showAdminSidebar: any;

    mobileNavigationEnabled: any;

    oidcAuthentication: string;

    userPermissionEnabled: any;

    suggestionSettingEnable: any;

    privateKey: string;

    publicKey: string;

    thumbPrint: string;

    navigationSettingEnabled: any;

    accessibilityNavigationEnabled: any;

    searchSettings: SearchSetting;
}

export interface SearchSetting {
    defaultPageSize: number;
    defaultControlPanelsPageSize: number;
    defaultFastLinksPageSize: number;
    defaultNavigationPageSize: number;
    defaultContentEnhancementPageSize: number;
    defaultSearchSuggestionPageSize: number;
}