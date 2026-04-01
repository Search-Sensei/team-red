import { IAdminSettings } from "../models/adminsettings.interface";
import { IAdminSettingsState } from "../models/adminsettingsstate.interface";
import { ContentType } from "../models/contenttype";
import { HttpMethod } from "../models/httpmethod";
import fetcher from "../../components/Fetcher"

// GET AdminSettings.
export const REQUEST_ADMIN_SETTINGS = 'REQUEST_ADMIN_SETTINGS';
export const RECEIVE_ADMIN_SETTINGS = 'RECEIVE_ADMIN_SETTINGS';
export const RECEIVE_ADMIN_SETTINGS_ERROR = 'RECEIVE_ADMIN_SETTINGS_ERROR';

export const appVirtualPath = "/adminui";

/**
 * Gets the base application URL given the application can be hosted in a virtual path "/adminui"
 * or it can be running locally where the API will be from the root of the site.
 */
export function getBaseUrl(): string {
    let baseUrl: string = window.location.href.indexOf("localhost") >= 0 ? "" : appVirtualPath;
    return baseUrl;
}

/**
 * Normalizes the admin API base URL - ensures it always has /adminui prefix
 * @param searchAdminApiUrl The searchAdminApiUrl from admin settings
 * @returns Normalized base URL with /adminui prefix
 */
export function normalizeAdminApiUrl(searchAdminApiUrl?: string): string {
    if (!searchAdminApiUrl || searchAdminApiUrl.trim().length === 0) {
        return "/adminui";
    }
    // If it's already an absolute URL or starts with /adminui, return as is
    if (searchAdminApiUrl.startsWith("http://") || searchAdminApiUrl.startsWith("https://")) {
        // For absolute URLs, ensure they end with /adminui if needed
        const url = new URL(searchAdminApiUrl);
        if (!url.pathname.startsWith("/adminui")) {
            return `${url.origin}/adminui`;
        }
        return searchAdminApiUrl;
    }
    // For relative URLs, ensure they start with /adminui
    if (!searchAdminApiUrl.startsWith("/adminui")) {
        return `/adminui${searchAdminApiUrl.startsWith("/") ? "" : "/"}${searchAdminApiUrl}`;
    }
    return searchAdminApiUrl;
}

// Gets the API base URL from configuration.
function getBaseApiUrl(): string {
    // Always use /adminui prefix for API calls
    const baseApiUrl: string = `${appVirtualPath}/api/`;
    return baseApiUrl;
}

// Used to Get AdminSettings.
function getAdminSettingsApiUrl(): string {
    const fetchApiUrl = `${getBaseApiUrl()}settings`;
    return fetchApiUrl;
}

export function createRequestOptions(httpMethod: HttpMethod, body?: string): any {
    const requestOptions: RequestInit = {
        method: httpMethod,
        headers: { "Content-Type": ContentType.JSON }
    };

    // Only add body if required.
    if (body) {
        requestOptions.body = body;
    }

    return requestOptions;
}

// Action Creators.
function retrieveAdminSettings(): any {
    return function action(dispatch: any) {
        dispatch({ type: REQUEST_ADMIN_SETTINGS });

        const url = getAdminSettingsApiUrl();

        //Internal_Call: Making a GET request to endpoint 'url'
        //Receiving_Data : If the request is successful, parse the response to JSON, If there is an error, dispatch an error action
        return fetcher(url)
            .then(
                response => response.json(),
                err => dispatch({ type: RECEIVE_ADMIN_SETTINGS_ERROR, error: err })
            )
            .then((data: IAdminSettings) => {
                // Update the app state with the results of the API call.
                dispatch({ type: RECEIVE_ADMIN_SETTINGS, adminSettings: data });
            });
    }
}

function shouldGetAdminSettings(adminSettingsState: IAdminSettingsState): boolean {
    if (adminSettingsState.isLoading) {
        return false
    }

    if (!adminSettingsState.adminSettings || adminSettingsState.adminSettings.searchAdminApiUrl.length === 0) {
        return true
    }

    return false;
}

export function getAdminSettings(): any {
    return (dispatch: any, getState: any) => {
        if (shouldGetAdminSettings(getState().adminSettingsState)) {
            // Dispatch a thunk from thunk!
            return dispatch(retrieveAdminSettings());
        } else {
            // Let the calling code know there's nothing to wait for.
            return Promise.resolve();
        }
    }
}

// Actions

// Get AdminSettings actions.
export function requestAdminSettings(): IRequestAdminSettingsActionType {
    return {
        type: REQUEST_ADMIN_SETTINGS
    };
}

export function receiveAdminSettings(adminSettings: IAdminSettings): IReceiveAdminSettingsActionType {
    return {
        type: RECEIVE_ADMIN_SETTINGS,
        adminSettings: adminSettings
    };
}

export function receiveAdminSettingsError(error: any): IReceiveAdminSettingsErrorActionType {
    return {
        type: RECEIVE_ADMIN_SETTINGS_ERROR,
        error: error
    };
}

// Action Types.
// Get AdminSettings.
interface IRequestAdminSettingsActionType { type: string }
interface IReceiveAdminSettingsActionType { type: string, adminSettings: IAdminSettings }
interface IReceiveAdminSettingsErrorActionType { type: string, error: any }