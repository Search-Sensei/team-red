import { HttpMethod } from "../models/httpmethod";
import { IQueryRule } from "../models/queryrule.interface";
import { QueryRuleModificationStatus } from "../models/queryrulemodificationstatus";
import { IQueryRulesState } from "../models/queryrulesstate.interface";
import { QueryRuleType } from "../models/queryruletype";
import { createRequestOptions } from "./adminsettings.actions";
import { addNotification } from "./notifications.action";
import fetcher from "../../components/Fetcher";
import * as uuid from "uuid";

// POST QueryRules - Gets the list of QueryRules.
export const REQUEST_QUERY_RULES = 'REQUEST_QUERY_RULES';
export const RECEIVE_QUERY_RULES = 'RECEIVE_QUERY_RULES';
export const RECEIVE_QUERY_RULES_ERROR = 'RECEIVE_QUERY_RULES_ERROR';
export const RECEIVE_QUERY_RULES_SUCCESS = 'RECEIVE_QUERY_RULES_SUCCESS';

// PUT QueryRule.
export const PUT_QUERY_RULE_SUBMITTED: string = "PUT_QUERY_RULE_SUBMITTED";
export const PUT_QUERY_RULE_SUCCESS: string = "PUT_QUERY_RULE_SUCCESS";
export const PUT_QUERY_RULE_ERROR: string = "PUT_QUERY_RULE_ERROR";

// DELETE QueryRule.
export const DELETE_QUERY_RULE_SUBMITTED: string = "DELETE_QUERY_RULE_SUBMITTED";
export const DELETE_QUERY_RULE_SUCCESS: string = "DELETE_QUERY_RULE_SUCCESS";
export const DELETE_QUERY_RULE_ERROR: string = "DELETE_QUERY_RULE_ERROR";

// Update the store with the currently selected QueryRule for adding/updating.
export const CHANGE_SELECTED_QUERY_RULE: string = "CHANGE_SELECTED_QUERY_RULE";
export const CLEAR_SELECTED_QUERY_RULE: string = "CLEAR_SELECTED_QUERY_RULE";
export const SET_QUERY_RULE_MODIFICATION_STATE: string = "SET_QUERY_RULE_MODIFICATION_STATE"

function getQueryRulesPath(baseApiUrl: string): string {
    const queryRulesPath: string = `${baseApiUrl}/queryrules`;
    return queryRulesPath;
}

// Used to Get Query Rules.
function getFetchQueryRulesApiUrl(baseApiUrl: string, queryRuleType?: QueryRuleType): string {
    const queryRuleTypeText: string = queryRuleType !== undefined ? `/${QueryRuleType[queryRuleType]}` : "";
    const fetchQueryRulesApiUrl = `${getQueryRulesPath(baseApiUrl)}${queryRuleTypeText}`;
    return fetchQueryRulesApiUrl;
}

// Used by Add, Edit and Delete functions.
function getQueryRuleApiUrl(baseApiUrl: string, id: string): string {
    const queryRuleApiUrl: string = `${getQueryRulesPath(baseApiUrl)}/queryrule/${id}`;
    return queryRuleApiUrl;
}

function getQueryRulesApiUrl(baseApiUrl: string): string {
    const queryRuleApiUrl: string = `${getQueryRulesPath(baseApiUrl)}/queryrules`;
    return queryRuleApiUrl;
}

export function searchQueryRules(baseApiUrl: string, data: any): any {
    return function action(dispatch: any) {
        dispatch(setQueryRuleModificationState(QueryRuleModificationStatus.Get));
        dispatch({ type: REQUEST_QUERY_RULES });

        const searchQueryRuleUrl: string = `${getQueryRulesPath(baseApiUrl)}/search`;
        const requestOptions: any = createRequestOptions(HttpMethod.Post, JSON.stringify(data));
        return fetcher(searchQueryRuleUrl, requestOptions)
            .then(async response => {
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`HTTP ${response.status}: ${errorText}`);
                }

                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const json = await response.json();
                    return json;
                } else {
                    const text = await response.text();
                    try {
                        const parsed = JSON.parse(text);
                        return parsed;
                    } catch (e) {
                        return [];
                    }
                }
            })
            .then(response => {
                if (Array.isArray(response)) {
                    dispatch({ type: RECEIVE_QUERY_RULES, queryRules: response as IQueryRule[] });
                    dispatch({ type: RECEIVE_QUERY_RULES_SUCCESS, data: true });
                } else if (response && response.error) {
                    throw (response.error);
                } else {
                    dispatch({ type: RECEIVE_QUERY_RULES, queryRules: [] });
                    dispatch({ type: RECEIVE_QUERY_RULES_SUCCESS, data: true });
                }
            })
            .catch(error => {
                dispatch({ type: RECEIVE_QUERY_RULES_ERROR, error: error?.message || String(error) });
                dispatch({ type: RECEIVE_QUERY_RULES_SUCCESS, data: false });
            })
    }
}

// Action Creators.
export function deleteQueryRule(baseApiUrl: string, queryRule: IQueryRule): any {
    return function action(dispatch: any) {
        dispatch({ type: DELETE_QUERY_RULE_SUBMITTED });

        const url = getQueryRuleApiUrl(baseApiUrl, queryRule.id);

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
                dispatch({ type: DELETE_QUERY_RULE_SUCCESS, id: queryRule.id });
                dispatch(clearSelectedQueryRule());
                dispatch(setQueryRuleModificationState(QueryRuleModificationStatus.None));
                dispatch(addNotification(`${getQueryRuleTitle(queryRule.type)} Removed`, `'${queryRule.name}' was removed`));
            })
            .catch(error => {
                dispatch({ type: DELETE_QUERY_RULE_ERROR, error: error })
            });
    }
}

export function deleteQueryRule2Silent(baseApiUrl: string, queryRule: IQueryRule): any {
    return function action(dispatch: any) {
        dispatch({ type: DELETE_QUERY_RULE_SUBMITTED });

        const url = getQueryRuleApiUrl(baseApiUrl, queryRule.id2);

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
                dispatch({ type: DELETE_QUERY_RULE_SUCCESS, id: queryRule.id2 });
                dispatch(clearSelectedQueryRule());
                dispatch(setQueryRuleModificationState(QueryRuleModificationStatus.None));
            })
            .catch(error => {
                dispatch({ type: DELETE_QUERY_RULE_ERROR, error: error })
            });
    }
}

export function saveQueryRule(baseApiUrl: string, queryRule: IQueryRule, queryRuleModificationStatus: QueryRuleModificationStatus): any {
    return function action(dispatch: any) {
        // Allows us to generate an error support message in the event of an API Error.
        dispatch(changeSelectedQueryRule(queryRule));
        dispatch({ type: PUT_QUERY_RULE_SUBMITTED });

        if (queryRule?.type === QueryRuleType.Boost && queryRule?.payload2 !== '' && queryRule?.profiles.length > 1) {
            let extraQueryRule = { ...queryRule, profiles: [queryRule.profiles[1]], id: queryRule.id2 === '' ? uuid.v4() : queryRule.id2, payload: queryRule.payload2, payload2: queryRule.payload2 };
            queryRule.profiles = [queryRule.profiles[0]];
            const url = getQueryRulesApiUrl(baseApiUrl);
            const requestOptions: any = createRequestOptions(HttpMethod.Put, JSON.stringify([queryRule, extraQueryRule]));
            //Internal_Call: Making a PUT request to endpoint 'url'
            //Sending_Data: Sending `requestOptions`(searchQueryDefiniton) to create the setting body,
            // Receiving_Data: If the request is successful, parse the response to JSON, If there is an error, dispatch an error action
            return fetcher(url, requestOptions)
                .then(response => response.json())
                .then(response => {
                    if (response.error) {
                        throw (response.error);
                    }

                    // Update the app state after adding/editing the QueryRule.
                    dispatch({ type: PUT_QUERY_RULE_SUCCESS, queryRule: queryRule, queryRuleModificationStatus: queryRuleModificationStatus });
                    dispatch(addNotification(`${getQueryRuleTitle(queryRule.type)} Saved`, `'${queryRule.name}' was saved`));
                    dispatch(clearSelectedQueryRule());
                    dispatch(setQueryRuleModificationState(QueryRuleModificationStatus.None));
                })
                .catch(error => {
                    dispatch({ type: PUT_QUERY_RULE_ERROR, error: error })
                });

        }
        const url = getQueryRuleApiUrl(baseApiUrl, queryRule.id);

        // Simple PUT request using fetch.
        const requestOptions: any = createRequestOptions(HttpMethod.Put, JSON.stringify(queryRule));
        //Internal_Call: Making a PUT request to endpoint 'url'
        //Sending_Data: Sending `requestOptions`(searchQueryDefiniton) to create the setting body,
        // Receiving_Data: If the request is successful, parse the response to JSON, If there is an error, dispatch an error action
        return fetcher(url, requestOptions)
            .then(response => response.json())
            .then(response => {
                if (response.error) {
                    throw (response.error);
                }

                // Update the app state after adding/editing the QueryRule.
                dispatch({ type: PUT_QUERY_RULE_SUCCESS, queryRule: queryRule, queryRuleModificationStatus: queryRuleModificationStatus });
                dispatch(addNotification(`${getQueryRuleTitle(queryRule.type)} Saved`, `'${queryRule.name}' was saved`));
                dispatch(clearSelectedQueryRule());
                dispatch(setQueryRuleModificationState(QueryRuleModificationStatus.None));
            })
            .catch(error => {
                dispatch({ type: PUT_QUERY_RULE_ERROR, error: error })
            });
    }
}

export function getQueryRuleTitle(queryRuleType: QueryRuleType): string {
    let queryRuleTypeTitle: string
    if (queryRuleType === QueryRuleType.Feature) {
        queryRuleTypeTitle = "Featured Content"
    } else if (queryRuleType === QueryRuleType.Boost) {
        if (window.location.pathname.split("/").pop() === "boost-navigation") queryRuleTypeTitle = "Boosts and Blocks Navigation"
        else queryRuleTypeTitle = "Boosts and Blocks"
    } else if (queryRuleType == QueryRuleType.Synonym) {
        queryRuleTypeTitle = "Synonym"
    }
    else if (queryRuleType == QueryRuleType.ControlPanel) {
        queryRuleTypeTitle = "Control Panel - Delete URL"
    }
    else if (queryRuleType == QueryRuleType.FastLinks) {
        queryRuleTypeTitle = "Fast Links"
    }
    else if (queryRuleType == QueryRuleType.Navigation) {
        queryRuleTypeTitle = "Navigation"
    }
    else if (queryRuleType == QueryRuleType.UserPermission) {
        queryRuleTypeTitle = "Group Permission"
    }
    else if (queryRuleType == QueryRuleType.UserGroup) {
        queryRuleTypeTitle = "User Groups"
    }
    else if (queryRuleType == QueryRuleType.Suggestion) {
        queryRuleTypeTitle = "Suggestion"
    }
    else {
        queryRuleTypeTitle = "Content Enhancement"
    }
    return queryRuleTypeTitle
}

function retrieveQueryRules(baseApiUrl: string, queryRuleType?: QueryRuleType): any {
    return function action(dispatch: any) {
        // Used for the Support message to know which API function has failed on error.
        dispatch(setQueryRuleModificationState(QueryRuleModificationStatus.Get));
        dispatch({ type: REQUEST_QUERY_RULES });

        const url = getFetchQueryRulesApiUrl(baseApiUrl, queryRuleType);
        return fetcher(url)
            .then(async response => {
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`HTTP ${response.status}: ${errorText}`);
                }
                
                const contentType = response.headers.get('content-type');
                
                if (contentType && contentType.includes('application/json')) {
                    const json = await response.json();
                    return json;
                } else {
                    const text = await response.text();
                    try {
                        const parsed = JSON.parse(text);
                        return parsed;
                    } catch (e) {
                        return [];
                    }
                }
            })
            .then(response => {
                if (Array.isArray(response)) {
                    dispatch({ type: RECEIVE_QUERY_RULES, queryRules: response as IQueryRule[] });
                    dispatch({ type: RECEIVE_QUERY_RULES_SUCCESS, data: true });
                } else if (response && response.error) {
                    throw (response.error);
                } else {
                    dispatch({ type: RECEIVE_QUERY_RULES, queryRules: [] });
                    dispatch({ type: RECEIVE_QUERY_RULES_SUCCESS, data: true });
                }
            })
            .catch(error => {
                console.error('🔴 retrieveQueryRules - CATCH ERROR:', error);
                console.error('🔴 retrieveQueryRules - Error message:', error?.message);
                console.error('🔴 retrieveQueryRules - Error stack:', error?.stack);
                dispatch({ type: RECEIVE_QUERY_RULES_ERROR, error: error?.message || String(error) });
                dispatch({ type: RECEIVE_QUERY_RULES_SUCCESS, data: false });
            })
    }
}

function shouldGetQueryRules(queryRulesState: IQueryRulesState): boolean {
    if (queryRulesState.isLoading) {
        // Data is already been loaded.
        return false;
    }

    if (!queryRulesState.queryRules || queryRulesState.queryRules.length === 0) {
        return true;
    }

    return false;
}

export function getQueryRules(baseApiUrl: string, queryRuleType?: QueryRuleType): any {
    return (dispatch: any, getState: any) => {
        if (shouldGetQueryRules(getState().queryRulesState)) {
            // Dispatch a thunk from thunk!
            return dispatch(retrieveQueryRules(baseApiUrl, queryRuleType));
        } else {
            // Let the calling code know there's nothing to wait for.
            return Promise.resolve();
        }
    }
}

// Actions

// Get QueryRules actions.
export function requestQueryRules(): IRequestQueryRulesActionType {
    return {
        type: REQUEST_QUERY_RULES
    };
}

export function receiveQueryRules(queryRules: IQueryRule[]): IReceiveQueryRulesActionType {
    return {
        type: RECEIVE_QUERY_RULES,
        queryRules: queryRules
    };
}

export function receiveQueryRulesError(error: any): IReceiveQueryRulesErrorActionType {
    return {
        type: RECEIVE_QUERY_RULES_ERROR,
        error: error
    };
}

export function receiveQueryRulesSuccess(success: boolean): IReceiveQueryRulesSuccessActionType {
    return {
        type: RECEIVE_QUERY_RULES_SUCCESS,
        data: success
    };
}

// Put QueryRules actions.
export function putQueryRuleSubmitted(): IPutQueryRuleSubmittedActionType {
    return { type: PUT_QUERY_RULE_SUBMITTED };
}

export function putQueryRuleSuccess(queryRule: IQueryRule, queryRuleModificationStatus: QueryRuleModificationStatus): IPutQueryRuleSuccessActionType {
    return { type: PUT_QUERY_RULE_SUCCESS, queryRule: queryRule, queryRuleModificationStatus: queryRuleModificationStatus };
}

export function putQueryRuleError(error: any): IPutQueryRuleErrorActionType {
    return { type: PUT_QUERY_RULE_ERROR, error: error };
}

// Delete actions.
export function deleteQueryRuleSubmitted(): IDeleteQueryRuleSubmittedActionType {
    return { type: DELETE_QUERY_RULE_SUBMITTED };
}

export function deleteQueryRuleSuccess(id: string): IDeleteQueryRuleSuccessActionType {
    return { type: DELETE_QUERY_RULE_SUCCESS, id: id };
}

export function deleteQueryRuleError(error: any): IDeleteQueryRuleErrorActionType {
    return { type: DELETE_QUERY_RULE_ERROR, error: error };
}

// Update the store with the currently selected QueryRule for adding/updating.
export function changeSelectedQueryRule(queryRule: IQueryRule): IChangeSelectedQueryRuleActionType {
    return { type: CHANGE_SELECTED_QUERY_RULE, queryRule: queryRule };
}

export function clearSelectedQueryRule(): IClearSelectedQueryRuleActionType {
    return { type: CLEAR_SELECTED_QUERY_RULE };
}

export function setQueryRuleModificationState(value: QueryRuleModificationStatus): ISetQueryRuleModificationStateActionType {
    return { type: SET_QUERY_RULE_MODIFICATION_STATE, value: value };
}

// Action Types.
// Get QueryRules.
interface IRequestQueryRulesActionType { type: string }
interface IReceiveQueryRulesActionType { type: string, queryRules: IQueryRule[] }
interface IReceiveQueryRulesErrorActionType { type: string, error: any }
interface IReceiveQueryRulesSuccessActionType { type: string, data: boolean }

// PUT QueryRule.
interface IPutQueryRuleSubmittedActionType { type: string };
interface IPutQueryRuleSuccessActionType { type: string, queryRule: IQueryRule, queryRuleModificationStatus: QueryRuleModificationStatus };
interface IPutQueryRuleErrorActionType { type: string, error: any };

// Delete QueryRule.
interface IDeleteQueryRuleSubmittedActionType { type: string };
interface IDeleteQueryRuleSuccessActionType { type: string, id: string };
interface IDeleteQueryRuleErrorActionType { type: string, error: any };

// Update the store with the currently selected QueryRule for adding/updating.
interface IChangeSelectedQueryRuleActionType { type: string, queryRule: IQueryRule };
interface IClearSelectedQueryRuleActionType { type: string };
interface ISetQueryRuleModificationStateActionType { type: string, value: QueryRuleModificationStatus };