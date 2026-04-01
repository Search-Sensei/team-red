
import { HttpMethod } from "../models/httpmethod";
import { QueryRuleType } from "../models/queryruletype";
import { createRequestOptions } from "./adminsettings.actions";
import { Synonym } from "../models/synonym.interface";
import { FastLinks } from "../models/fastlinks";
import { Suggestion } from "../models/suggestion";
import { addNotification } from "./notifications.action";
import fetcher from "../../components/Fetcher"


// GET Synonym Count
export const REQUEST_SUGGESTION_COUNT = 'REQUEST_SUGGESTION_COUNT';
export const RECEIVE_SUGGESTION_COUNT = 'RECEIVE_SUGGESTION_COUNT';
export const RECEIVE_SUGGESTION_COUNT_ERROR = 'RECEIVE_SUGGESTION_COUNT_ERROR';

// GET Synonym - Gets the list of Synonym.
export const REQUEST_SUGGESTION = 'REQUEST_SUGGESTION';
export const RECEIVE_SUGGESTION = 'RECEIVE_SUGGESTION';
export const RECEIVE_SUGGESTION_ERROR = 'RECEIVE_SUGGESTION_ERROR';

// CREATE Synonym - Gets the list of Synonym.
export const CREATE_SUGGESTION = 'CREATE_SUGGESTION';
export const CREATE_SUGGESTION_SUCCESS = 'CREATE_SUGGESTION_SUCCESS';
export const CREATE_SUGGESTION_ERROR = 'CREATE_SUGGESTION_ERROR';


// UPDATE Synonym.
export const GET_SUGGESTION_UPDATE: string = "GET_SUGGESTION_UPDATE";
export const REMOVE_SUGGESTION_UPDATE: string = "REMOVE_SUGGESTION_UPDATE";
export const UPDATE_SUGGESTION: string = "UPDATE_SUGGESTION";
export const UPDATE_SUGGESTION_SUCCESS: string = "UPDATE_SUGGESTION_SUCCESS";
export const UPDATE_SUGGESTION_ERROR: string = "UPDATE_SUGGESTION_ERROR";

// DELETE Synonym.
export const DELETE_SUGGESTION: string = "DELETE_SUGGESTION";
export const DELETE_SUGGESTION_SUCCESS: string = "DELETE_SUGGESTION_SUCCESS";
export const DELETE_SUGGESTION_ERROR: string = "DELETE_SUGGESTION_ERROR";

function getFastLinkPath(baseApiUrl: string): string {
    const queryRulesPath: string = `${baseApiUrl}/suggestions/search`;
    return queryRulesPath;
}

// Used to Get Query Rules.
function getFastLinkApiUrl(baseApiUrl: string, queryRuleType?: QueryRuleType): string {
    const queryRuleTypeText: string = `/${queryRuleType ? QueryRuleType[queryRuleType] : ""}`;
    const fetchQueryRulesApiUrl = `${getFastLinkPath(baseApiUrl)}${queryRuleTypeText}`;
    return fetchQueryRulesApiUrl;
}

// Used by Add, Edit and Delete functions.
// function getQueryRuleApiUrl(baseApiUrl: string, id: string): string {
//     const queryRuleApiUrl: string = `${baseApiUrl}/controlanels/controlpanel/${id}`;
//     return queryRuleApiUrl;
// }

// Action Creators.
export function deleteSuggestion(baseApiUrl: string, id: string): any {
    return function action(dispatch: any) {
        dispatch({ type: DELETE_SUGGESTION });
        const url = `${baseApiUrl}/suggestions/deleteById/${id}`
        // Simple DELETE request using fetch.
        const requestOptions: any = createRequestOptions(HttpMethod.Delete);

        //Internal_Call: Making a DELETE request to endpoint 'url'
        //Sending_Data: Sending `requestOptions`(searchQueryDefiniton) to create the setting body,
        // Receiving_Data: If the request is successful, parse the response to JSON, If there is an error, dispatch an error action
        return fetcher(url, requestOptions)
            .then(response => response.json())
            .then(response => {
                if (response.error) {
                    throw (response.error);
                }

                // Update the app state after deleting the QueryRule.
                dispatch({ type: DELETE_SUGGESTION_SUCCESS, id: id });
            })
            .catch(error => {
                dispatch({ type: DELETE_SUGGESTION_ERROR, error: error })
            });
    }
}

export function createSuggestion(baseApiUrl: string, data: Suggestion): any {
    return function action(dispatch: any) {
        // Used for the Support message to know which API function has failed on error.
        removeSuggestionUpdate()
        dispatch({ type: CREATE_SUGGESTION });

        const url = `${baseApiUrl}/suggestions/create`

        //Internal_Call: Making a POST request to endpoint 'url'
        //Sending_Data : Sending `data` to create the setting body
        //Receiving_Data : If the request is successful, parse the response to JSON, If there is an error, dispatch an error action
        return fetcher(url, {
            method: 'POST', body: JSON.stringify(data), headers: {
                'Content-Type': 'application/json-patch+json'
            },
        })
            .then(response => response.json())
            .then(response => {
                if (response.error) {
                    throw (response.error);
                }
                // Update the app state with the results of the API call.
                dispatch({ type: CREATE_SUGGESTION_SUCCESS, data: response as FastLinks });
            })
            .catch(error => {
                dispatch({ type: CREATE_SUGGESTION_ERROR, error: error });
            })
    }
}

export function getSuggestionUpdate(suggestion: Suggestion): any {
    return function action(dispatch: any) {
        dispatch({ type: GET_SUGGESTION_UPDATE, data: suggestion });
    }
}

export function removeSuggestionUpdate(): any {
    return function action(dispatch: any) {
        dispatch({ type: REMOVE_SUGGESTION_UPDATE });
    }
}

export function updateSuggestion(baseApiUrl: string, suggestion: Suggestion): any {
    return function action(dispatch: any) {
        dispatch({ type: UPDATE_SUGGESTION });
        const url = `${baseApiUrl}/suggestions/update`

        // Simple UPDATE request using fetch.
        //Internal_Call: Making a PUT request to endpoint 'url'
        //Sending_Data : Sending `suggestion` to create the setting body
        //Receiving_Data : If the request is successful, parse the response to JSON, If there is an error, dispatch an error action
        return fetcher(url, {
            method: 'PUT', body: JSON.stringify(suggestion), headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.json())
            .then(response => {
                if (response.error) {
                    throw (response.error);
                }
                const data = {
                    synonym: response,
                    id: suggestion.id,
                }
                // Update the app state after deleting the QueryRule.
                dispatch({ type: UPDATE_SUGGESTION_SUCCESS, data: data });
            })
            .catch(error => {
                dispatch({ type: UPDATE_SUGGESTION_ERROR, error: error })
            });
    }
}

export function getDocumentCountSuggestion(baseApiUrl: string): any {
    return function action(dispatch: any) {
        dispatch({ type: REQUEST_SUGGESTION_COUNT });
        const url = `${baseApiUrl}/suggestions/suggestionCount`
        // const url = getQueryRuleApiUrl(baseApiUrl, id);
        // Simple DELETE request using fetch.
        const requestOptions: any = createRequestOptions(HttpMethod.Get);

        //Internal_Call: Making a GET request to endpoint 'url'
        //Sending_Data: Sending `requestOptions`(searchQueryDefiniton) to create the setting body,
        // Receiving_Data: If the request is successful, parse the response to JSON, If there is an error, dispatch an error action
        return fetcher(url, requestOptions)
            .then(response => response.json())
            .then(response => {
                if (response.error) {
                    throw (response.error);
                }

                // Update the app state after deleting the QueryRule.
                dispatch({ type: RECEIVE_SUGGESTION_COUNT, response });
            })
            .catch(error => {
                dispatch({ type: RECEIVE_SUGGESTION_COUNT_ERROR, error: error })
            });
    }
}


export function retrieveSuggestion(baseApiUrl: string, data: any): any {
    return function action(dispatch: any) {
        dispatch({ type: REQUEST_SUGGESTION });

        let url = getFastLinkApiUrl(baseApiUrl);
        //Internal_Call: Making a POST request to endpoint 'url'
        //Sending_Data : Sending `data` to create the setting body
        //Receiving_Data : If the request is successful, parse the response to JSON, If there is an error, dispatch an error action
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
                if (localStorage !== null) {
                    for (const [key, itemString] of Object.entries(localStorage)) {
                        try {
                            const item = JSON.parse(itemString);
                            for (let a of response.body.result) {
                                if (a.id != null && a.query === item.query && a.suggestion === item.suggestion) {
                                    localStorage.removeItem(key)
                                }
                            }
                            if (localStorage.getItem(key) != null && (data["query"] === "all" || itemString.include(data["query"]))) {
                                response.body.result.push(item);
                            }
                        } catch (e) { }

                    }
                }

                dispatch({ type: RECEIVE_SUGGESTION, data: response as Suggestion[] });
                var isUpdating = localStorage.getItem('isUpdating');
                if (isUpdating != null && isUpdating !== '0') {
                    dispatch(addNotification("Updating suggestion", `Successfully updated suggestion ${isUpdating}`));
                    localStorage.setItem('isUpdating', '0');
                }
            })
            .catch(error => {
                dispatch({ type: RECEIVE_SUGGESTION_ERROR, error: error });
            })
    }
}