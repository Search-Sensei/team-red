import { HttpMethod } from "../models/httpmethod";
import { IQueryRule } from "../models/queryrule.interface";
import { QueryRuleType } from "../models/queryruletype";
import { ControlPane } from "../models/controlPanel"
import { createRequestOptions } from "./adminsettings.actions";
import fetcher from "../../components/Fetcher";
import { addNotification } from "./notifications.action";

// GET Document COunt
export const REQUEST_DOCUMENT_COUNT = 'REQUEST_DOCUMENT_COUNT';
export const RECEIVE_DOCUMENT_COUNT = 'RECEIVE_DOCUMENT_COUNT';
export const RECEIVE_DOCUMENT_COUNT_ERROR = 'RECEIVE_DOCUMENT_COUNT_ERROR';

// POST Control-pain - Gets the list of Control-pain.
export const REQUEST_CONTROL_PAIN = 'REQUEST_CONTROL_PAIN';
export const RECEIVE_CONTROL_PAIN = 'RECEIVE_CONTROL_PAIN';
export const RECEIVE_CONTROL_PAIN_ERROR = 'RECEIVE_CONTROL_PAIN_ERROR';

// DELETE Control-pain.
export const DELETE_CONTROL_PAIN: string = "DELETE_CONTROL_PAIN";
export const DELETE_CONTROL_PAIN_SUCCESS: string = "DELETE_CONTROL_PAIN_SUCCESS";
export const DELETE_CONTROL_PAIN_ERROR: string = "DELETE_CONTROL_PAIN_ERROR";

function getControlPainPath(baseApiUrl: string): string {
    const queryRulesPath: string = `${baseApiUrl}/controlPanel`;
    return queryRulesPath;
}

// Used to Get Query Rules.
function getControlPainApiUrl(baseApiUrl: string, queryRuleType?: QueryRuleType): string {
    const queryRuleTypeText: string = `/${queryRuleType ? QueryRuleType[queryRuleType] : ""}`;
    const fetchQueryRulesApiUrl = `${getControlPainPath(baseApiUrl)}${queryRuleTypeText}`;
    return fetchQueryRulesApiUrl;
}

// Used by Add, Edit and Delete functions.
// function getQueryRuleApiUrl(baseApiUrl: string, id: string): string {
//     const queryRuleApiUrl: string = `${baseApiUrl}/controlanels/controlpanel/${id}`;
//     return queryRuleApiUrl;
// }

// Action Creators.
export function deleteControlPain(baseApiUrl: string, param: any): any {
    return function action(dispatch: any) {
        dispatch({ type: DELETE_CONTROL_PAIN });
        const url = `${baseApiUrl}/controlpanel/deleteById/${param.id}?indexName=${param.indexName}`
        // const url = getQueryRuleApiUrl(baseApiUrl, id);
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
                dispatch({ type: DELETE_CONTROL_PAIN_SUCCESS, id: param.id });
                dispatch(addNotification("Delete Url Removed", `'${param.id}' was removed`));
            })
            .catch(error => {
                dispatch({ type: DELETE_CONTROL_PAIN_ERROR, error: error })
            });
    }
}

export function getDocumentCount(baseApiUrl: string): any {
    return function action(dispatch: any) {
        dispatch({ type: RECEIVE_DOCUMENT_COUNT });
        const url = `${baseApiUrl}/controlPanel/docCount`
        // const url = getQueryRuleApiUrl(baseApiUrl, id);
        // Simple DELETE request using fetch.
        const requestOptions: any = createRequestOptions(HttpMethod.Get);

        //Internal_Call: Making a GET request to endpoint 'url'
        //Sending_Data: Sending `requestOptions`(searchQueryDefiniton) to create the setting body,
        // Receiving_Data: If the request is successful, parse the response to JSON, If there is an error, dispatch an error action
        return fetcher(url, requestOptions)
            .then(async response => {
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`HTTP ${response.status}: ${errorText}`);
                }
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    return response.json();
                } else {
                    const text = await response.text();
                    try {
                        return JSON.parse(text);
                    } catch {
                        return { error: 'Invalid response format' };
                    }
                }
            })
            .then(response => {
                if (response.error) {
                    throw (response.error);
                }

                // Update the app state after deleting the QueryRule.
                dispatch({ type: RECEIVE_DOCUMENT_COUNT, response });
            })
            .catch(error => {
                console.error('Error in getDocumentCount:', error);
                dispatch({ type: RECEIVE_DOCUMENT_COUNT_ERROR, error: error })
            });
    }
}


export function retrieveControlPain(baseApiUrl: string, data: any): any {
    return function action(dispatch: any) {
        // Used for the Support message to know which API function has failed on error.
        dispatch({ type: REQUEST_CONTROL_PAIN });

        const url = `${baseApiUrl}/controlPanel/search`

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
                dispatch({ type: RECEIVE_CONTROL_PAIN, data: response as ControlPane[] });
            })
            .catch(error => {
                dispatch({ type: RECEIVE_CONTROL_PAIN_ERROR, error: error });
            })
    }
}


// Actions

// Get QueryRules actions.
export function requestQueryRules(): IRequestQueryRulesActionType {
    return {
        type: REQUEST_CONTROL_PAIN
    };
}

export function receiveQueryRules(queryRules: IQueryRule[]): IReceiveQueryRulesActionType {
    return {
        type: RECEIVE_CONTROL_PAIN,
        queryRules: queryRules
    };
}

export function receiveQueryRulesError(error: any): IReceiveQueryRulesErrorActionType {
    return {
        type: RECEIVE_CONTROL_PAIN_ERROR,
        error: error
    };
}

// Get Document count.
export function requestDocumentCount(): IGetDocumentCountActionType {
    return {
        type: REQUEST_DOCUMENT_COUNT
    };
}

export function receiveDocumentCount(count: number): IGetDocumentCountSuccessActionType {
    return {
        type: RECEIVE_DOCUMENT_COUNT,
        count: count
    };
}

export function receiveDocumentCountError(error: any): IGetDocumentCountErrorActionType {
    return {
        type: RECEIVE_DOCUMENT_COUNT_ERROR,
        error: error
    };
}


// Delete actions.
export function deleteQueryRuleSubmitted(): IDeleteQueryRuleSubmittedActionType {
    return { type: DELETE_CONTROL_PAIN };
}

export function deleteQueryRuleSuccess(id: string): IDeleteQueryRuleSuccessActionType {
    return { type: DELETE_CONTROL_PAIN_SUCCESS, id: id };
}

export function deleteQueryRuleError(error: any): IDeleteQueryRuleErrorActionType {
    return { type: DELETE_CONTROL_PAIN_ERROR, error: error };
}

export function getDocumentCountSuccess(): IDeleteQueryRuleSubmittedActionType {
    return { type: DELETE_CONTROL_PAIN };
}




// Action Types.
// Get QueryRules.
interface IRequestQueryRulesActionType { type: string }
interface IReceiveQueryRulesActionType { type: string, queryRules: IQueryRule[] }
interface IReceiveQueryRulesErrorActionType { type: string, error: any }


// Delete QueryRule.
interface IDeleteQueryRuleSubmittedActionType { type: string };
interface IDeleteQueryRuleSuccessActionType { type: string, id: string };
interface IDeleteQueryRuleErrorActionType { type: string, error: any };

// Get Document Count.
interface IGetDocumentCountActionType { type: string };
interface IGetDocumentCountSuccessActionType { type: string, count: number };
interface IGetDocumentCountErrorActionType { type: string, error: any };

