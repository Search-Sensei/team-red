
import { HttpMethod } from "../models/httpmethod";
import { QueryRuleType } from "../models/queryruletype";
import { createRequestOptions } from "./adminsettings.actions";
import { Content } from "../models/content.interface";
import fetcher from "../../components/Fetcher"
import { addNotification } from "./notifications.action";


// GET Content Count
export const REQUEST_CONTENT_COUNT = 'REQUEST_CONTENT_COUNT';
export const RECEIVE_CONTENT_COUNT = 'RECEIVE_CONTENT_COUNT';
export const RECEIVE_CONTENT_COUNT_ERROR = 'RECEIVE_CONTENT_COUNT_ERROR';

// GET Content - Gets the list of Content.
export const REQUEST_CONTENT = 'REQUEST_CONTENT';
export const RECEIVE_CONTENT = 'RECEIVE_CONTENT';
export const RECEIVE_CONTENT_ERROR = 'RECEIVE_CONTENT_ERROR';

// CREATE Content - Gets the list of Content.
export const CREATE_CONTENT = 'CREATE_CONTENT';
export const CREATE_CONTENT_SUCCESS = 'CREATE_CONTENT_SUCCESS';
export const CREATE_CONTENT_ERROR = 'CREATE_CONTENT_ERROR';


// UPDATE Content.
export const GET_CONTENT_UPDATE: string = "GET_CONTENT_UPDATE";
export const REMOVE_CONTENT_UPDATE: string = "REMOVE_CONTENT_UPDATE";
export const UPDATE_CONTENT: string = "UPDATE_CONTENT";
export const UPDATE_CONTENT_SUCCESS: string = "UPDATE_CONTENT_SUCCESS";
export const UPDATE_CONTENT_ERROR: string = "UPDATE_CONTENT_ERROR";

// DELETE Content.
export const DELETE_CONTENT: string = "DELETE_CONTENT";
export const DELETE_CONTENT_SUCCESS: string = "DELETE_CONTENT_SUCCESS";
export const DELETE_CONTENT_ERROR: string = "DELETE_CONTENT_ERROR";

function getContentPath(baseApiUrl: string): string {
    const queryRulesPath: string = `${baseApiUrl}/contentEnhanceSearch`;
    return queryRulesPath;
}

// Used to Get Query Rules.
function getContentApiUrl(baseApiUrl: string, queryRuleType?: QueryRuleType): string {
    const queryRuleTypeText: string = `/${queryRuleType ? QueryRuleType[queryRuleType] : ""}`;
    const fetchQueryRulesApiUrl = `${getContentPath(baseApiUrl)}${queryRuleTypeText}`;
    return fetchQueryRulesApiUrl;
}

// Used by Add, Edit and Delete functions.
// function getQueryRuleApiUrl(baseApiUrl: string, id: string): string {
//     const queryRuleApiUrl: string = `${baseApiUrl}/controlanels/controlpanel/${id}`;
//     return queryRuleApiUrl;
// }

// Action Creators.
export function deleteContent(baseApiUrl: string, id: string): any {
    return function action(dispatch: any) {
        dispatch({ type: DELETE_CONTENT });
        const url = `${baseApiUrl}/contentEnhance/deleteById/${id}`
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
                dispatch({ type: DELETE_CONTENT_SUCCESS, id: id });
            })
            .catch(error => {
                dispatch({ type: DELETE_CONTENT_ERROR, error: error })
            });
    }
}

export function createContent(baseApiUrl: string, data: Content): any {
    return function action(dispatch: any) {
        // Used for the Support message to know which API function has failed on error.
        removeContentUpdate()
        dispatch({ type: CREATE_CONTENT });

        const url = `${baseApiUrl}/contents/create`
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
                // Update the app state with the results of the API call.
                dispatch({ type: CREATE_CONTENT_SUCCESS, data: response as Content });
            })
            .catch(error => {
                dispatch({ type: CREATE_CONTENT_ERROR, error: error });
            })
    }
}

export function getContentUpdate(content: Content): any {
    return function action(dispatch: any) {
        dispatch({ type: GET_CONTENT_UPDATE, data: content });
    }
}

export function removeContentUpdate(): any {
    return function action(dispatch: any) {
        dispatch({ type: REMOVE_CONTENT_UPDATE });
    }
}

export function updateContent(baseApiUrl: string, content: Content): any {
    return function action(dispatch: any) {
        dispatch({ type: UPDATE_CONTENT });
        const url = `${baseApiUrl}/contentEnhance/update`

        // Simple UPDATE request using fetch.

        //Internal_Call: Making a PUT request to endpoint 'url'
        //Sending_Data : Sending `content` to create the setting body
        //Receiving_Data : If the request is successful, parse the response to JSON, If there is an error, dispatch an error action
        return fetcher(url, {
            method: 'PUT', body: JSON.stringify(content), headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.json())
            .then(response => {
                if (response.error) {
                    throw (response.error);
                }
                const data = {
                    content: response,
                    id: content.id,
                }
                // Update the app state after deleting the QueryRule.
                dispatch({ type: UPDATE_CONTENT_SUCCESS, data: data });
                dispatch(addNotification("Content Saved", `'${content.title}' was saved`));
            })
            .catch(error => {
                dispatch({ type: UPDATE_CONTENT_ERROR, error: error })
            });
    }
}

export function getDocumentCountContent(baseApiUrl: string): any {
    return function action(dispatch: any) {
        dispatch({ type: REQUEST_CONTENT_COUNT });
        const url = `${baseApiUrl}/contentEnhanceCount`
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
                dispatch({ type: RECEIVE_CONTENT_COUNT, response });
            })
            .catch(error => {
                dispatch({ type: RECEIVE_CONTENT_COUNT_ERROR, error: error })
            });
    }
}


export function retrieveContent(baseApiUrl: string, data: any): any {
    return function action(dispatch: any) {
        // Used for the Support message to know which API function has failed on error.
        dispatch({ type: REQUEST_CONTENT });
        const url = getContentApiUrl(baseApiUrl);
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
                // Update the app state with the results of the API call.
                dispatch({ type: RECEIVE_CONTENT, data: response as Content[] });
            })
            .catch(error => {
                dispatch({ type: RECEIVE_CONTENT_ERROR, error: error });
            })
    }
}



