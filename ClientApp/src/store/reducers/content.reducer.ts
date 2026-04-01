import { IActionBase } from "../models/root.interface";
import {
    RECEIVE_CONTENT, REQUEST_CONTENT, RECEIVE_CONTENT_ERROR,
    DELETE_CONTENT, DELETE_CONTENT_SUCCESS, DELETE_CONTENT_ERROR,
    UPDATE_CONTENT, UPDATE_CONTENT_ERROR, UPDATE_CONTENT_SUCCESS, GET_CONTENT_UPDATE, REMOVE_CONTENT_UPDATE,
    CREATE_CONTENT, CREATE_CONTENT_SUCCESS, CREATE_CONTENT_ERROR,
    REQUEST_CONTENT_COUNT, RECEIVE_CONTENT_COUNT, RECEIVE_CONTENT_COUNT_ERROR
} from '../actions/content.action'
import { Content, IContentState } from "../models/content.interface";

const initialState: IContentState = {
    contentList: [],
    contentEdit: {} as Content,
    contentCount: 0,
    isLoading: false,
    isUpdating: false,
    error: null,
};

function contentReducer(state = initialState, action: IActionBase): IContentState {
    switch (action.type) {
        case REQUEST_CONTENT: {
            return {
                ...state,
                isLoading: true
            };
        }
        case RECEIVE_CONTENT: {
            return {
                ...state,
                contentList: action.data.body.result,
                isLoading: false,
            };
        }
        case RECEIVE_CONTENT_ERROR: {
            return {
                ...state,
                isLoading: false,
                error: action.error
            };
        }

        case DELETE_CONTENT: {
            return {
                ...state,
                isUpdating: true
            };
        }
        case DELETE_CONTENT_SUCCESS: {
            return {
                ...state,
                // Remove the QueryRule from the collection.
                contentList: state.contentList.filter((q: Content) => q.id !== action.id),
                isUpdating: false,
                contentCount: state.contentCount - 1
            };
        }
        case DELETE_CONTENT_ERROR: {
            return {
                ...state,
                isUpdating: false,
                error: action.error
            };
        }
        case CREATE_CONTENT: {
            return {
                ...state,
                isUpdating: true
            };
        }
        case CREATE_CONTENT_SUCCESS: {
            return {
                ...state,
                isUpdating: false,
                contentList: [...state.contentList, action.data],
                contentCount: state.contentCount + 1
            };
        }
        case CREATE_CONTENT_ERROR: {
            return {
                ...state,
                isUpdating: false,
                error: action.error
            };
        }
        case GET_CONTENT_UPDATE: {
            return {
                ...state,
                contentEdit: action.data,
                isUpdating: true
            };
        }
        case REMOVE_CONTENT_UPDATE: {
            return {
                ...state,
                contentEdit: {} as Content,
                isUpdating: false
            };
        }
        case UPDATE_CONTENT: {
            return {
                ...state,
                isUpdating: true
            };
        }
        case UPDATE_CONTENT_SUCCESS: {
            const index = state.contentList.findIndex(content => content.id === action.data.id);
            state.contentList[index] = action.data.content
            return {
                ...state,
                isUpdating: false,
                contentList: [...state.contentList],
            };
        }
        case UPDATE_CONTENT_ERROR: {
            return {
                ...state,
                isUpdating: false,
                error: action.error
            };
        }
        case REQUEST_CONTENT_COUNT: {
            return {
                ...state,
                isUpdating: true
            };
        }
        case RECEIVE_CONTENT_COUNT: {
            return {
                ...state,
                isUpdating: false,
                contentCount: action.response,
            };
        }
        case RECEIVE_CONTENT_COUNT_ERROR: {
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

export default contentReducer;