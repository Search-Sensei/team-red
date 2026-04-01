
import { HttpMethod } from "../models/httpmethod";
import { QueryRuleType } from "../models/queryruletype";
import { IQueryRule } from "../models/queryrule.interface";
import { createRequestOptions } from "./adminsettings.actions";
import { ResponseUserGroups, UserGroups } from "../models/usergroups.interface";
import { addNotification } from "./notifications.action";
import { getQueryRuleTitle } from "./queryrules.actions";
import fetcher from "../../components/Fetcher";


// GET Synonym Count
export const REQUEST_USER_GROUPS_COUNT = 'REQUEST_USER_GROUPS_COUNT';
export const RECEIVE_USER_GROUPS_COUNT = 'RECEIVE_USER_GROUPS_COUNT';
export const RECEIVE_USER_GROUPS_COUNT_ERROR = 'RECEIVE_USER_GROUPS_COUNT_ERROR';

// GET Synonym - Gets the list of Synonym.
export const REQUEST_USER_GROUPS = 'REQUEST_USER_GROUPS';
export const RECEIVE_USER_GROUPS = 'RECEIVE_USER_GROUPS';
export const RECEIVE_USER_GROUPS_ERROR = 'RECEIVE_USER_GROUPS_ERROR';

// CREATE Synonym - Gets the list of Synonym.
export const CREATE_USER_GROUPS = 'CREATE_USER_GROUPS';
export const CREATE_USER_GROUPS_SUCCESS = 'CREATE_USER_GROUPS_SUCCESS';
export const CREATE_USER_GROUPS_ERROR = 'CREATE_USER_GROUPS_ERROR';


// UPDATE Synonym.
export const GET_USER_GROUPS_UPDATE: string = "GET_USER_GROUPS_UPDATE";
export const REMOVE_USER_GROUPS_UPDATE: string = "REMOVE_USER_GROUPS_UPDATE";
export const UPDATE_USER_GROUPS: string = "UPDATE_USER_GROUPS";
export const UPDATE_USER_GROUPS_SUCCESS: string = "UPDATE_USER_GROUPS_SUCCESS";
export const UPDATE_USER_GROUPS_ERROR: string = "UPDATE_USER_GROUPS_ERROR";

// DELETE Synonym.
export const DELETE_USER_GROUPS: string = "DELETE_USER_GROUPS";
export const DELETE_USER_GROUPS_SUCCESS: string = "DELETE_USER_GROUPS_SUCCESS";
export const DELETE_USER_GROUPS_ERROR: string = "DELETE_USER_GROUPS_ERROR";

export const RESPONSE_GROUPS: string = "RESPONSE_GROUPS"

function getSynonymPath(baseApiUrl: string): string {
    const queryRulesPath: string = `${baseApiUrl}/userGroups/search`;
    return queryRulesPath;
}

// Used to Get Query Rules.
function getSynonymApiUrl(baseApiUrl: string, queryRuleType?: QueryRuleType): string {
    const queryRuleTypeText: string = `/${queryRuleType ? QueryRuleType[queryRuleType] : ""}`;
    const fetchQueryRulesApiUrl = `${getSynonymPath(baseApiUrl)}${queryRuleTypeText}`;
    return fetchQueryRulesApiUrl;
}

// Used by Add, Edit and Delete functions.
// function getQueryRuleApiUrl(baseApiUrl: string, id: string): string {
//     const queryRuleApiUrl: string = `${baseApiUrl}/controlanels/controlpanel/${id}`;
//     return queryRuleApiUrl;
// }

// Action Creators.
export function deleteUserGroup(baseApiUrl: string, id: string, nameUserGroup: string): any {
    return function action(dispatch: any) {
        dispatch({ type: DELETE_USER_GROUPS });
        const url = `${baseApiUrl}/userGroups/deleteById/${id}` 
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
                dispatch({ type: DELETE_USER_GROUPS_SUCCESS, id: id });
                dispatch(addNotification("UserGroup Removed", `'${nameUserGroup}' was removed`));
            })
            .catch(error => {
                dispatch({ type: DELETE_USER_GROUPS_ERROR, error: error })
                dispatch(addNotification("UserGroup Removed", `${error}`));
            });
    }
}

export function createUserGroup(baseApiUrl: string, data: UserGroups): any {
    return function action(dispatch: any) {
        // Used for the Support message to know which API function has failed on error.
        removeUserGroupUpdate()
        dispatch({ type: CREATE_USER_GROUPS });

        const url = `${baseApiUrl}/userGroups/create`
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
                dispatch({ type: CREATE_USER_GROUPS_SUCCESS, data: response as UserGroups });
                dispatch({ type: CREATE_USER_GROUPS_ERROR, error: "Successfully" })
                dispatch(addNotification("User Group Saved", `'${data.groupName}' was saved`));
            })
            .catch(error => {
                dispatch({ type: CREATE_USER_GROUPS_ERROR, error: error });
            })
    }
}

export function getUserGroupsUpdate(userGroup: UserGroups): any {
    return function action(dispatch: any) {
        dispatch({ type: GET_USER_GROUPS_UPDATE, data: userGroup });
    }
}

export function removeUserGroupUpdate(): any {
    return function action(dispatch: any) {
        dispatch({ type: REMOVE_USER_GROUPS_UPDATE });
    }
}

export function updateUserGroup(baseApiUrl: string, userGroup: UserGroups): any {
    return function action(dispatch: any) {
        dispatch({ type: UPDATE_USER_GROUPS });
        const url = `${baseApiUrl}/userGroups/update/?id=${userGroup.id}` 
        
        // Simple UPDATE request using fetch.
        //Internal_Call: Making a PUT request to endpoint 'url'
        //Sending_Data : Sending `userGroup` to create the setting body
        //Receiving_Data : If the request is successful, parse the response to JSON, If there is an error, dispatch an error action
        return fetcher(url, {
            method: 'PUT', body: JSON.stringify(userGroup), headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.json())
            .then(response => {
                if (response.error) {
                    throw (response.error);
                }
                // Update the app state after deleting the QueryRule.
                dispatch({ type: UPDATE_USER_GROUPS_SUCCESS, data: response as UserGroups  });
                dispatch({ type: UPDATE_USER_GROUPS_ERROR, error: "Successfully" });
                dispatch(addNotification("User Group Saved", `'${userGroup.groupName}' was saved`));
            })
            .catch(error => {
                dispatch({ type: UPDATE_USER_GROUPS_ERROR, error: error })
            });
    }
}

export function getDocumentCountUserGroups(baseApiUrl: string): any {
    return function action(dispatch: any) {
        dispatch({ type: REQUEST_USER_GROUPS_COUNT });
        const url = `${baseApiUrl}/userGroups/userGroupCount` 
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
                dispatch({ type: RECEIVE_USER_GROUPS_COUNT, response });
            })
            .catch(error => {
                dispatch({ type: RECEIVE_USER_GROUPS_COUNT_ERROR, error: error })
            });
    }
}


export function retrieveUserGroups(baseApiUrl: string, data: any): any {
    return function action(dispatch: any) {
        // Used for the Support message to know which API function has failed on error.
        dispatch({ type: REQUEST_USER_GROUPS });

        const url = getSynonymApiUrl(baseApiUrl);
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
                dispatch({ type: RECEIVE_USER_GROUPS, data: response as ResponseUserGroups });
            })
            .catch(error => {
                dispatch({ type: RECEIVE_USER_GROUPS_ERROR, error: error });
            })
    }
}

export function getGroups(groups: string): any {
    return function action(dispatch: any) {
        dispatch({ type: RESPONSE_GROUPS, data: groups });
    }
}