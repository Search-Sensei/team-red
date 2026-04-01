import { RECEIVE_ADMIN_SETTINGS, RECEIVE_ADMIN_SETTINGS_ERROR, REQUEST_ADMIN_SETTINGS } from "../actions/adminsettings.actions";
import { IAdminSettingsState } from "../models/adminsettingsstate.interface";
import { IActionBase } from "../models/root.interface";

const initialState: IAdminSettingsState = {
    adminSettings: {
        mobileNavigationEnabled: false,
        accessibilityNavigationEnabled: true,
        suggestionSettingEnable: false,
        applicationTitle: "",
        availableProfiles: [],
        searchAdminApiUrl: "",
        searchApiUrl: "",
        supportMessage: {
            detail: "",
            emailAddress: "",
            emailBody: "",
            emailSubject: "",
            title: ""
        },
        oidcAuthentication: "",
        userPermissionEnabled: "",
        navigationSettingEnabled: "",
        boostsBlocksSearchQueryDefinition: {
            advancedQuery: "",
            didYouMean: "",
            filterData: "",
            page: 0,
            pageSize: 0,
            profile: "",
            query: "",
            sort: ""
        },
        defaultEndDateYearIncrement: 0,
        navNameMaxLength: 25,
        navDescriptionMaxLength: 45,
        showAdminSidebar: {},
        privateKey: "",
        publicKey: "",
        thumbPrint: "",
        searchSettings: {
            defaultPageSize: 50,
            defaultControlPanelsPageSize: 50,
            defaultFastLinksPageSize: 50,
            defaultNavigationPageSize: 50,
            defaultContentEnhancementPageSize: 50,
            defaultSearchSuggestionPageSize: 50
        }
    },
    isLoading: false,
    receivedAt: Date.now(),
    error: null
};

function adminSettingsReducer(state: IAdminSettingsState = initialState, action: IActionBase): IAdminSettingsState {
    switch (action.type) {
        case REQUEST_ADMIN_SETTINGS: {
            return {
                ...state,
                isLoading: true
            };
        }
        case RECEIVE_ADMIN_SETTINGS: {
            return {
                ...state,
                adminSettings: action.adminSettings,
                isLoading: false,
                receivedAt: Date.now()
            };
        }
        case RECEIVE_ADMIN_SETTINGS_ERROR: {
            return {
                ...state,
                isLoading: false,
                error: action.error
            };
        }
        default:
            // Redux will call our reducer with an undefined state for the first time: https://redux.js.org/basics/reducers#handling-actions
            return state;
    }
}

export default adminSettingsReducer;