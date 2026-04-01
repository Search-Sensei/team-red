import { IActionBase } from "../models/root.interface";
import { 
    RECEIVE_NAVIGATION, REQUEST_NAVIGATION, RECEIVE_NAVIGATION_ERROR,
    DELETE_NAVIGATION, DELETE_NAVIGATION_SUCCESS, DELETE_NAVIGATION_ERROR,
    UPDATE_NAVIGATION, UPDATE_NAVIGATION_ERROR, UPDATE_NAVIGATION_SUCCESS, GET_NAVIGATION_UPDATE, REMOVE_NAVIGATION_UPDATE,
    CREATE_NAVIGATION, CREATE_NAVIGATION_SUCCESS, CREATE_NAVIGATION_ERROR, 
    REQUEST_NAVIGATION_COUNT, RECEIVE_NAVIGATION_COUNT, RECEIVE_NAVIGATION_COUNT_ERROR
 } from '../actions/navigation.action'
import { Navigation, INavigationState, ResponseNavigation } from "../models/navigation";

const initialState: INavigationState = {
    navigationList: {} as ResponseNavigation,
    navigationEdit: {} as Navigation,
    navigationCount: 0,
    currentPage: 1,
    currentProfile: "",
    isLoading: false ,
    isUpdating: false,
    error: null,
};

function navigationReducer(state = initialState, action: IActionBase): INavigationState {
    switch (action.type) {
        case REQUEST_NAVIGATION: {
            return {
                ...state,
                isLoading: true
            };
        }
        case RECEIVE_NAVIGATION: {
            // Update navigationCount from resultsCount if available
            const resultsCount = action.data?.body?.resultsCount;
            const newNavigationCount = resultsCount !== undefined && resultsCount !== null ? resultsCount : state.navigationCount;
            
            // Extract page and profile from action if available
            const currentPage = action.data?.currentPage !== undefined ? action.data.currentPage : state.currentPage;
            const currentProfile = action.data?.currentProfile !== undefined ? action.data.currentProfile : state.currentProfile;
            
            return {
                ...state,
                navigationList: action.data,
                navigationCount: newNavigationCount,
                currentPage: currentPage,
                currentProfile: currentProfile,
                isLoading: false,
            };
        }
        case RECEIVE_NAVIGATION_ERROR: {
            return {
                ...state,
                isLoading: false,
                error: action.error
            };
        }

        case DELETE_NAVIGATION: {
            return {
                ...state,
                isUpdating: true
            };
        }
        case DELETE_NAVIGATION_SUCCESS: {
            return {
                ...state,
                // Remove the QueryRule from the collection.
                navigationList: {} as ResponseNavigation,
                isUpdating: false,
                navigationCount: state.navigationCount - 1
            };
        }
        case DELETE_NAVIGATION_ERROR: {
            return {
                ...state,
                isUpdating: false,
                error: action.error
            };
        }
        case CREATE_NAVIGATION: {
            return {
                ...state,
                isUpdating: true
            };
        }
        case CREATE_NAVIGATION_SUCCESS: {
            return {
                ...state,
                isUpdating: false,
                navigationList: {} as ResponseNavigation,
                navigationCount: state.navigationCount + 1
            };
        }
        case CREATE_NAVIGATION_ERROR: {
            return {
                ...state,
                isUpdating: false,
                error: action.error
            };
        }
        case GET_NAVIGATION_UPDATE: {
            return {
                ...state,
                navigationEdit: action.data,
                isUpdating: true
            };
        }
        case REMOVE_NAVIGATION_UPDATE: {
            return {
                ...state,
                navigationEdit: {} as Navigation,
                isUpdating: false
            };
        }
        case UPDATE_NAVIGATION: {
            return {
                ...state,
                isUpdating: true
            };
        }
        case UPDATE_NAVIGATION_SUCCESS: {
            return {
                ...state,
                isUpdating: false,
                navigationList: {} as ResponseNavigation,
            };
        }
        case UPDATE_NAVIGATION_ERROR: {
            return {
                ...state,
                isUpdating: false,
                error: action.error
            };
        }
        case REQUEST_NAVIGATION_COUNT: {
            return {
                ...state,
                isUpdating: true
            };
        }
        case RECEIVE_NAVIGATION_COUNT: {
            return {
                ...state,
                isUpdating: false,
                navigationCount: action.response,
            };
        }
        case RECEIVE_NAVIGATION_COUNT_ERROR: {
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

export default navigationReducer;