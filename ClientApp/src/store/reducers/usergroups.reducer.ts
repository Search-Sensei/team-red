import { IActionBase } from "../models/root.interface";
import { 
    RECEIVE_USER_GROUPS, REQUEST_USER_GROUPS, RECEIVE_USER_GROUPS_ERROR,
    DELETE_USER_GROUPS, DELETE_USER_GROUPS_SUCCESS, DELETE_USER_GROUPS_ERROR,
    UPDATE_USER_GROUPS, UPDATE_USER_GROUPS_ERROR, UPDATE_USER_GROUPS_SUCCESS, GET_USER_GROUPS_UPDATE, REMOVE_USER_GROUPS_UPDATE,
    CREATE_USER_GROUPS, CREATE_USER_GROUPS_SUCCESS, CREATE_USER_GROUPS_ERROR, 
    REQUEST_USER_GROUPS_COUNT, RECEIVE_USER_GROUPS_COUNT, RECEIVE_USER_GROUPS_COUNT_ERROR, RESPONSE_GROUPS
 } from '../actions/usergroups.action'
import { UserGroups, IUserGroupsState, ResponseUserGroups } from "../models/usergroups.interface";

const initialState: IUserGroupsState = {
    userGroupsList: {} as ResponseUserGroups,
    userGroupsEdit: {} as UserGroups,
    userGroupsCount: 0,
    groups: "",
    isLoading: false,
    isUpdating: false,
    error: "",
};

function userGroupsReducer(state = initialState, action: IActionBase): IUserGroupsState {
    switch (action.type) {
        case REQUEST_USER_GROUPS: {
            return {
                ...state,
                isLoading: true
            };
        }
        case RECEIVE_USER_GROUPS: {
            return {
                ...state,
                userGroupsList: action.data,
                isLoading: false,
            };
        }
        case RECEIVE_USER_GROUPS_ERROR: {
            return {
                ...state,
                isLoading: false,
                error: action.error
            };
        }

        case DELETE_USER_GROUPS: {
            return {
                ...state,
                isUpdating: true
            };
        }
        case DELETE_USER_GROUPS_SUCCESS: {
            return {
                ...state,
                // Remove the QueryRule from the collection.
                userGroupsList: {} as ResponseUserGroups,
                isUpdating: false,
                userGroupsCount: state.userGroupsCount - 1
            };
        }
        case DELETE_USER_GROUPS_ERROR: {
            return {
                ...state,
                isUpdating: false,
                error: action.error
            };
        }
        case CREATE_USER_GROUPS: {
            return {
                ...state,
                isUpdating: true
            };
        }
        case CREATE_USER_GROUPS_SUCCESS: {
            return {
                ...state,
                isUpdating: false,
                userGroupsList: {} as ResponseUserGroups,
                userGroupsCount: state.userGroupsCount + 1
            };
        }
        case CREATE_USER_GROUPS_ERROR: {
            return {
                ...state,
                isUpdating: false,
                error: action.error
            };
        }
        case GET_USER_GROUPS_UPDATE: {
            return {
                ...state,
                userGroupsEdit: action.data,
                isUpdating: true
            };
        }
        case REMOVE_USER_GROUPS_UPDATE: {
            return {
                ...state,
                userGroupsEdit: {} as UserGroups,
                isUpdating: false
            };
        }
        case UPDATE_USER_GROUPS: {
            return {
                ...state,
                isUpdating: true
            };
        }
        case UPDATE_USER_GROUPS_SUCCESS: {
            return {
                ...state,
                isUpdating: false,
                userGroupsList: {} as ResponseUserGroups
            };
        }
        case UPDATE_USER_GROUPS_ERROR: {
            return {
                ...state,
                isUpdating: false,
                error: action.error
            };
        }
        case REQUEST_USER_GROUPS_COUNT: {
            return {
                ...state,
                isUpdating: true
            };
        }
        case RECEIVE_USER_GROUPS_COUNT: {
            return {
                ...state,
                isUpdating: false,
                userGroupsCount: action.response,
            };
        }
        case RECEIVE_USER_GROUPS_COUNT_ERROR: {
            return {
                ...state,
                isUpdating: false,
                error: action.error
            };
        }
        case RESPONSE_GROUPS: {
            return {
                ...state,
                groups: action.data
            };
        }
        default:
            // Redux will call our reducer with an undefined state for the first time: https://redux.js.org/basics/reducers#handling-actions
            return state;
    }
}

export default userGroupsReducer;