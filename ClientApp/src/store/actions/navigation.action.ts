
import { HttpMethod } from "../models/httpmethod";
import { QueryRuleType } from "../models/queryruletype";
import { createRequestOptions } from "./adminsettings.actions";
import { Synonym } from "../models/synonym.interface";
import { FastLinks } from "../models/fastlinks";
import { Navigation } from "../models/navigation";
import { addNotification } from "./notifications.action";
import fetcher from "../../components/Fetcher";


// GET Synonym Count
export const REQUEST_NAVIGATION_COUNT = 'REQUEST_NAVIGATION_COUNT';
export const RECEIVE_NAVIGATION_COUNT = 'RECEIVE_NAVIGATION_COUNT';
export const RECEIVE_NAVIGATION_COUNT_ERROR = 'RECEIVE_NAVIGATION_COUNT_ERROR';

// GET Synonym - Gets the list of Synonym.
export const REQUEST_NAVIGATION = 'REQUEST_NAVIGATION';
export const RECEIVE_NAVIGATION = 'RECEIVE_NAVIGATION';
export const RECEIVE_NAVIGATION_ERROR = 'RECEIVE_NAVIGATION_ERROR';

// CREATE Synonym - Gets the list of Synonym.
export const CREATE_NAVIGATION = 'CREATE_NAVIGATION';
export const CREATE_NAVIGATION_SUCCESS = 'CREATE_NAVIGATION_SUCCESS';
export const CREATE_NAVIGATION_ERROR = 'CREATE_NAVIGATION_ERROR';


// UPDATE Synonym.
export const GET_NAVIGATION_UPDATE: string = "GET_NAVIGATION_UPDATE";
export const REMOVE_NAVIGATION_UPDATE: string = "REMOVE_NAVIGATION_UPDATE";
export const UPDATE_NAVIGATION: string = "UPDATE_NAVIGATION";
export const UPDATE_NAVIGATION_SUCCESS: string = "UPDATE_NAVIGATION_SUCCESS";
export const UPDATE_NAVIGATION_ERROR: string = "UPDATE_NAVIGATION_ERROR";

// DELETE Synonym.
export const DELETE_NAVIGATION: string = "DELETE_NAVIGATION";
export const DELETE_NAVIGATION_SUCCESS: string = "DELETE_NAVIGATION_SUCCESS";
export const DELETE_NAVIGATION_ERROR: string = "DELETE_NAVIGATION_ERROR";

function getFastLinkPath(baseApiUrl: string): string {
    // Normalize baseApiUrl - remove trailing slash
    const normalizedBaseUrl = baseApiUrl?.trim().replace(/\/+$/, '') || baseApiUrl;
    const queryRulesPath: string = `${normalizedBaseUrl}/navigations/search`;
    return queryRulesPath;
}

// Used to Get Query Rules.
function getFastLinkApiUrl(baseApiUrl: string, queryRuleType?: QueryRuleType): string {
    // Normalize baseApiUrl - remove trailing slash
    const normalizedBaseUrl = baseApiUrl?.trim().replace(/\/+$/, '') || baseApiUrl;
    const queryRuleTypeText: string = queryRuleType ? `/${QueryRuleType[queryRuleType]}` : "";
    const fetchQueryRulesApiUrl = `${normalizedBaseUrl}/navigations/search${queryRuleTypeText}`;
    return fetchQueryRulesApiUrl;
}

// Used by Add, Edit and Delete functions.
// function getQueryRuleApiUrl(baseApiUrl: string, id: string): string {
//     const queryRuleApiUrl: string = `${baseApiUrl}/controlanels/controlpanel/${id}`;
//     return queryRuleApiUrl;
// }

// Action Creators.
export function deleteNavigation(baseApiUrl: string, id: string, nameNavigation: string): any {
    return function action(dispatch: any) {
        if (!id || id === "undefined" || id.trim() === "") {
            dispatch({ type: DELETE_NAVIGATION_ERROR, error: "Navigation ID is required" });
            return Promise.reject("Navigation ID is required");
        }

        dispatch({ type: DELETE_NAVIGATION });
        const url = `${baseApiUrl}/navigations/deleteById/${id}`;
        const requestOptions: any = createRequestOptions(HttpMethod.Delete);

        return fetcher(url, requestOptions)
            .then(async response => {
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(errorText || `HTTP ${response.status}: ${response.statusText}`);
                }

                const contentType = response.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                    const text = await response.text();
                    if (text && text.trim() !== "") {
                        return JSON.parse(text);
                    }
                }
                return {};
            })
            .then(response => {
                if (response && response.error) {
                    throw (response.error);
                }

                dispatch({ type: DELETE_NAVIGATION_SUCCESS, id: id });
                dispatch(addNotification("Navigation Removed", `'${nameNavigation}' was removed`));
            })
            .catch(error => {
                dispatch({ type: DELETE_NAVIGATION_ERROR, error: error.message || error })
            });
    }
}

export function createNavigation(baseApiUrl: string, data: Navigation): any {
    return function action(dispatch: any) {
        removeNavigationUpdate()
        dispatch({ type: CREATE_NAVIGATION });

        const url = `${baseApiUrl}/navigations/create`

        return fetcher(url, {
            method: 'POST', body: JSON.stringify(data), headers: {
                'Content-Type': 'application/json'
            },
        })
            .then(response => response.json())
            .then(response => {
                if (response.error) {
                    throw (response.error);
                }
                // Update the app state with the results of the API call.
                dispatch({ type: CREATE_NAVIGATION_SUCCESS, data: response as FastLinks });
                dispatch(addNotification("Navigation Saved", `'${data.navName}' was saved`));
            })
            .catch(error => {
                dispatch({ type: CREATE_NAVIGATION_ERROR, error: error });
            })
    }
}

export function getNavigationUpdate(navigation: Navigation): any {
    return function action(dispatch: any) {
        dispatch({ type: GET_NAVIGATION_UPDATE, data: navigation });
    }
}

export function removeNavigationUpdate(): any {
    return function action(dispatch: any) {
        dispatch({ type: REMOVE_NAVIGATION_UPDATE });
    }
}

export function updateNavigation(baseApiUrl: string, navigation: Navigation): any {
    return function action(dispatch: any) {
        dispatch({ type: UPDATE_NAVIGATION });
        const url = `${baseApiUrl}/navigations/update`

        // Simple UPDATE request using fetch.
        return fetcher(url, {
            method: 'PUT', body: JSON.stringify(navigation), headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(async response => {
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
                }
                const contentType = response.headers.get('content-type');
                const text = await response.text();


                if (!text || text.trim() === '') {
                    console.warn('[updateNavigation] Empty response, using navigation data we sent');
                    return navigation;
                }

                if (contentType && contentType.includes('application/json')) {
                    try {
                        const parsed = JSON.parse(text);
                        return parsed;
                    } catch (e) {
                        console.error('[updateNavigation] Failed to parse JSON response:', e, 'Response text:', text);
                        return navigation;
                    }
                } else {
                    try {
                        const parsed = JSON.parse(text);
                        return parsed;
                    } catch (e) {
                        console.warn('[updateNavigation] Not JSON, using navigation data we sent');
                        return navigation;
                    }
                }
            })
            .then(response => {
                if (response.error) {
                    throw (response.error);
                }
                const data = {
                    navigation: response,
                    id: navigation.id,
                }
                dispatch({ type: UPDATE_NAVIGATION_SUCCESS, data: data });
                dispatch(addNotification("Navigation Saved", `'${navigation.navName}' was saved`));
            })
            .catch(error => {
                console.error('Update navigation error:', error);
                dispatch({ type: UPDATE_NAVIGATION_ERROR, error: error })
                dispatch(addNotification("Error", `Failed to update navigation: ${error.message || error}`));
            });
    }
}

export function getDocumentCountNavigation(baseApiUrl: string): any {
    return function action(dispatch: any) {
        dispatch({ type: REQUEST_NAVIGATION_COUNT });
        const url = `${baseApiUrl}/navigations/navigationCount`
        // const url = getQueryRuleApiUrl(baseApiUrl, id);
        // Simple DELETE request using fetch.
        const requestOptions: any = createRequestOptions(HttpMethod.Get);

        return fetcher(url, requestOptions)
            .then(response => response.json())
            .then(response => {
                if (response.error) {
                    throw (response.error);
                }

                // Update the app state after deleting the QueryRule.
                dispatch({ type: RECEIVE_NAVIGATION_COUNT, response });
            })
            .catch(error => {
                dispatch({ type: RECEIVE_NAVIGATION_COUNT_ERROR, error: error })
            });
    }
}


export function retrieveNavigation(baseApiUrl: string, data: any): any {
    return function action(dispatch: any) {
        dispatch({ type: REQUEST_NAVIGATION });

        // Force normalize payload - ensure all required fields are present
        let normalizedData = data;
        if (!normalizedData || typeof normalizedData !== 'object') {
            normalizedData = { query: typeof data === 'string' ? data : "all" };
        }

        const payload = {
            query: normalizedData.query || normalizedData.query === "" ? normalizedData.query : "all",
            profile: normalizedData.profile !== undefined ? normalizedData.profile : "",
            page: normalizedData.page !== undefined ? normalizedData.page : 1
        };

        let url = getFastLinkApiUrl(baseApiUrl);
        url = url.replace(/\/+$/, '');

        return fetcher(url, {
            method: 'POST', body: JSON.stringify(payload), headers: {
                'Content-Type': 'application/json'
            },
        })
            .then(async response => {
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`HTTP ${response.status}: ${errorText}`);
                }
                const contentType = response.headers.get('content-type');
                const text = await response.text();
                if (!text) {
                    return { body: { result: [] } };
                }
                if (contentType && contentType.includes('application/json')) {
                    try {
                        return JSON.parse(text);
                    } catch (e) {
                        return { body: { result: [] } };
                    }
                } else {
                    try {
                        return JSON.parse(text);
                    } catch (e) {
                        return { body: { result: [] } };
                    }
                }
            })
            .then(response => {
                if (response.error) {
                    throw (response.error);
                }

                if (!response.body) {
                    response.body = { result: [], featured: null, resultsCount: 0 };
                }
                if (!response.body.result) {
                    response.body.result = [];
                }

                if (localStorage !== null) {
                    for (const [key, itemString] of Object.entries(localStorage)) {
                        try {
                            const item = JSON.parse(itemString);
                            for (let a of response.body.result) {
                                if (a.id != null && a.navName === item.navName && a.navLink === item.navLink && a.navDescription === item.navDescription) {
                                    localStorage.removeItem(key)
                                }
                            }
                            if (localStorage.getItem(key) != null && (payload["query"] === "all" || itemString.include(payload["query"]))) {
                                response.body.result.push(item);
                            }
                        } catch (e) { }

                    }
                }

                // Include page and profile in the response so reducer can save them
                dispatch({
                    type: RECEIVE_NAVIGATION,
                    data: {
                        ...response,
                        currentPage: payload.page,
                        currentProfile: payload.profile
                    }
                });
                var isUpdating = localStorage.getItem('isUpdating');
                if (isUpdating != null && isUpdating !== '0') {
                    dispatch(addNotification("Updating navigation", `Successfully updated navigation ${isUpdating}`));
                    localStorage.setItem('isUpdating', '0');
                }
            })
            .catch(error => {
                dispatch({ type: RECEIVE_NAVIGATION_ERROR, error: error });
            })
    }
}