import { IActionBase } from "../models/root.interface";
import {
    RECEIVE_USER_PERMISSION, REQUEST_USER_PERMISSION, RECEIVE_USER_PERMISSION_ERROR,
    DELETE_USER_PERMISSION, DELETE_USER_PERMISSION_SUCCESS, DELETE_USER_PERMISSION_ERROR,
    UPDATE_USER_PERMISSION, UPDATE_USER_PERMISSION_ERROR, UPDATE_USER_PERMISSION_SUCCESS, GET_USER_PERMISSION_UPDATE, REMOVE_USER_PERMISSION_UPDATE,
    CREATE_USER_PERMISSION, CREATE_USER_PERMISSION_SUCCESS, CREATE_USER_PERMISSION_ERROR,
    REQUEST_USER_PERMISSION_COUNT, RECEIVE_USER_PERMISSION_COUNT, RECEIVE_USER_PERMISSION_COUNT_ERROR, REQUEST_USER_PERMISSION_SCREEN, REQUEST_USER_PERMISSION_SCREEN_ERROR, RECEIVE_USER_PERMISSION_SCREEN
} from '../actions/userpermission.action'
import { UserPermission, IUserPermissionState, ResponsePermission, ResponseGetUserPermission } from "../models/userpermission.interface";

const initialState: IUserPermissionState = {
    permissionList: {} as ResponsePermission,
    permissionEdit: {} as UserPermission,
    getUserPermissionScreen: {} as ResponseGetUserPermission,
    isLoading: false,
    isUpdating: false,
    error: null,
};

function userPermissionReducer(state = initialState, action: IActionBase): IUserPermissionState {
    switch (action.type) {
        case REQUEST_USER_PERMISSION: {
            return {
                ...state,
                isLoading: true
            };
        }
        case REQUEST_USER_PERMISSION_SCREEN: {
            return {
                ...state,
                isLoading: true
            };
        }
        case RECEIVE_USER_PERMISSION: {
            return {
                ...state,
                permissionList: action.data,
                isLoading: false,
            };
        }
        case RECEIVE_USER_PERMISSION_SCREEN: {
            return {
                ...state,
                getUserPermissionScreen: action.data,
                isLoading: false,
            };
        }
        case RECEIVE_USER_PERMISSION_ERROR: {
            return {
                ...state,
                isLoading: false,
                error: action.error
            };
        }
        case REQUEST_USER_PERMISSION_SCREEN_ERROR: {
            return {
                ...state,
                isLoading: false,
                error: action.error
            };
        }
        case DELETE_USER_PERMISSION: {
            return {
                ...state,
                isUpdating: true
            };
        }
        case DELETE_USER_PERMISSION_SUCCESS: {
            return {
                ...state,
                // Remove the QueryRule from the collection.
                permissionList: {} as ResponsePermission,
                isUpdating: false,
            };
        }
        case DELETE_USER_PERMISSION_ERROR: {
            return {
                ...state,
                isUpdating: false,
                error: action.error
            };
        }
        case CREATE_USER_PERMISSION: {
            return {
                ...state,
                isUpdating: true
            };
        }
        case CREATE_USER_PERMISSION_SUCCESS: {
            return {
                ...state,
                isUpdating: false,
                permissionList: {} as ResponsePermission,
            };
        }
        case CREATE_USER_PERMISSION_ERROR: {
            return {
                ...state,
                isUpdating: false,
                error: action.error
            };
        }
        case GET_USER_PERMISSION_UPDATE: {
            return {
                ...state,
                permissionEdit: action.data,
                isUpdating: true
            };
        }
        case REMOVE_USER_PERMISSION_UPDATE: {
            return {
                ...state,
                permissionEdit: {} as UserPermission,
                isUpdating: false
            };
        }
        case UPDATE_USER_PERMISSION: {
            return {
                ...state,
                isUpdating: true
            };
        }
        case UPDATE_USER_PERMISSION_SUCCESS: {
            return {
                ...state,
                isUpdating: false,
                permissionList: {} as ResponsePermission,
            };
        }
        case UPDATE_USER_PERMISSION_ERROR: {
            return {
                ...state,
                isUpdating: false,
                error: action.error
            };
        }
        case REQUEST_USER_PERMISSION_COUNT: {
            return {
                ...state,
                isUpdating: true
            };
        }
        case RECEIVE_USER_PERMISSION_COUNT_ERROR: {
            return {
                ...state,
                isUpdating: false,
                error: action.error
            };
        }
        default:
            // Redux will call our reducer with an undefined state for the first time: https://redux.js.org/basics/reducers#handling-actions
            return state;
    }
}

export default userPermissionReducer;