
import { HttpMethod } from "../models/httpmethod";
import { QueryRuleType, UserPermissionEnum } from "../models/queryruletype";
import { createRequestOptions } from "./adminsettings.actions";
import { Synonym } from "../models/synonym.interface";
import { ResponseGetUserPermission, ResponsePermission, UserPermission } from "../models/userpermission.interface";
import { addNotification } from "./notifications.action";
import fetcher from "../../components/Fetcher";


export const REQUEST_USER_PERMISSION_COUNT = 'REQUEST_USER_PERMISSION_COUNT';
export const RECEIVE_USER_PERMISSION_COUNT = 'RECEIVE_USER_PERMISSION_COUNT';
export const RECEIVE_USER_PERMISSION_COUNT_ERROR = 'RECEIVE_USER_PERMISSION_COUNT_ERROR';

export const REQUEST_USER_PERMISSION = 'REQUEST_USER_PERMISSION';
export const REQUEST_USER_PERMISSION_SCREEN = 'REQUEST_USER_PERMISSION_SCREEN'
export const RECEIVE_USER_PERMISSION = 'RECEIVE_USER_PERMISSION';
export const RECEIVE_USER_PERMISSION_ERROR = 'RECEIVE_USER_PERMISSION_ERROR';
export const REQUEST_USER_PERMISSION_SCREEN_ERROR = 'REQUEST_USER_PERMISSION_SCREEN_ERROR';
export const RECEIVE_USER_PERMISSION_SCREEN = 'RECEIVE_USER_PERMISSION_SCREEN';

export const CREATE_USER_PERMISSION = 'CREATE_USER_PERMISSION';
export const CREATE_USER_PERMISSION_SUCCESS = 'CREATE_USER_PERMISSION_SUCCESS';
export const CREATE_USER_PERMISSION_ERROR = 'CREATE_USER_PERMISSION_ERROR';

export const GET_USER_PERMISSION_UPDATE: string = "GET_USER_PERMISSION_UPDATE";
export const REMOVE_USER_PERMISSION_UPDATE: string = "REMOVE_USER_PERMISSION_UPDATE";
export const UPDATE_USER_PERMISSION: string = "UPDATE_USER_PERMISSION";
export const UPDATE_USER_PERMISSION_SUCCESS: string = "UPDATE_USER_PERMISSION_SUCCESS";
export const UPDATE_USER_PERMISSION_ERROR: string = "UPDATE_USER_PERMISSION_ERROR";

export const DELETE_USER_PERMISSION: string = "DELETE_USER_PERMISSION";
export const DELETE_USER_PERMISSION_SUCCESS: string = "DELETE_USER_PERMISSION_SUCCESS";
export const DELETE_USER_PERMISSION_ERROR: string = "DELETE_USER_PERMISSION_ERROR";

function getUserPermissionPath(baseApiUrl: string): string {
    const queryRulesPath: string = `${baseApiUrl}/userPermission/search`;
    return queryRulesPath;
}

// Used to Get Query Rules.
function getUserPermissionApiUrl(baseApiUrl: string, queryRuleType?: QueryRuleType): string {
    const queryRuleTypeText: string = ``;
    const fetchQueryRulesApiUrl = `${getUserPermissionPath(baseApiUrl)}${queryRuleTypeText}`;
    return fetchQueryRulesApiUrl;
}

export function updateUserPermission(baseApiUrl: string, userPermission: Array<UserPermission>): any {
    return function action(dispatch: any) {
        dispatch({ type: UPDATE_USER_PERMISSION });
        const url = `${baseApiUrl}/userPermission/upsert`

        // Simple UPDATE request using fetch.
        //Internal_Call: Making a PUT request to endpoint 'url'
        //Sending_Data : Sending `userPermission` to create the setting body
        //Receiving_Data : If the request is successful, parse the response to JSON, If there is an error, dispatch an error action
        return fetcher(url, {
            method: 'PUT', body: JSON.stringify(userPermission), headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.json())
            .then(response => {
                if (response.error) {
                    throw (response.error);
                }
                const data = {
                    userPermission: response,
                }
                // Update the app state after deleting the QueryRule.
                dispatch({ type: UPDATE_USER_PERMISSION_SUCCESS, data: data });
                dispatch(addNotification("Group Permission Saved", "Successfully"));
            })
            .catch(error => {
                dispatch({ type: UPDATE_USER_PERMISSION_ERROR, error: error })
            });
    }
}

export function getUserPermissionUpdate(userPermission: UserPermission): any {
    return function action(dispatch: any) {
        dispatch({ type: GET_USER_PERMISSION_UPDATE, data: userPermission });
    }
}

export function retrieveUserPermission(baseApiUrl: string): any {
    return function action(dispatch: any) {
        // Used for the Support message to know which API function has failed on error.
        dispatch({ type: REQUEST_USER_PERMISSION });

        const url = getUserPermissionApiUrl(baseApiUrl);
        //Internal_Call : Making a Get request to endpoint 'url'
        //Receiving_Data : If the request is successful, parse the response to JSON, If there is an error, dispatch an error action
        return fetcher(url, {
            method: 'GET', headers: {
                'Content-Type': 'application/json'
            },
        })
            .then(response => response.json())
            .then(response => {
                if (response.error) {
                    throw (response.error);
                }
                // Update the app state with the results of the API call.
                dispatch({ type: RECEIVE_USER_PERMISSION, data: response as ResponsePermission });
            })
            .catch(error => {
                dispatch({ type: RECEIVE_USER_PERMISSION_ERROR, error: error });
            })
    }
}

function GetUserPermissionPath(baseApiUrl: string): string {
    const queryRulesPath: string = `${baseApiUrl}/userPermission/PermissionScreen`;
    return queryRulesPath;
}

function getFetchUserPermissionApiUrl(baseApiUrl: string, permissionType?: UserPermissionEnum): string {
    const permissionTypeText: string = `/${permissionType ? UserPermissionEnum[permissionType] : ""}`;
    const fetchUserPermissionApiUrl = `${GetUserPermissionPath(baseApiUrl)}${permissionTypeText}`;
    return fetchUserPermissionApiUrl;
}

export function retrieveGetPermissionScreen(baseApiUrl: string, permissionType: UserPermissionEnum, groupMemberShipClaims: any): any {
    return function action(dispatch: any) {
        // Used for the Support message to know which API function has failed on error.
        dispatch({ type: REQUEST_USER_PERMISSION_SCREEN });

        const url = getFetchUserPermissionApiUrl(baseApiUrl, permissionType);

        let claimsToSend: any;
        if (groupMemberShipClaims == null) {
            claimsToSend = "";
        } else if (
            typeof groupMemberShipClaims === 'object' &&
            Object.keys(groupMemberShipClaims).length === 0
        ) {
            claimsToSend = "";
        } else if (
            groupMemberShipClaims.groupMemberShipClaims === undefined
        ) {
            claimsToSend = "";
        } else {
            claimsToSend = groupMemberShipClaims.groupMemberShipClaims;
        }
        const bodyPayload = {
            groupMemberShipClaims: claimsToSend
        };

        //Internal_Call: Making a POST request to endpoint 'url'
        //Sending_Data : Sending `groupMemberShipClaims` to create the setting body
        //Receiving_Data : If the request is successful, parse the response to JSON, If there is an error, dispatch an error action
        return fetcher(url, {
            method: 'POST', body: JSON.stringify(bodyPayload), headers: {
                'Content-Type': 'application/json'
            },
        })
            .then(response => response.json())
            .then(response => {
                if (response.error) {
                    throw (response.error);
                }
                // Update the app state with the results of the API call.
                dispatch({ type: RECEIVE_USER_PERMISSION_SCREEN, data: response as ResponseGetUserPermission });
            })
            .catch(error => {
                dispatch({ type: REQUEST_USER_PERMISSION_SCREEN_ERROR, error: error });
            })
    }
}

