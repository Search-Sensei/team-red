import { IActionBase } from "../models/root.interface";
import {
    RECEIVE_SUGGESTION, REQUEST_SUGGESTION, RECEIVE_SUGGESTION_ERROR,
    DELETE_SUGGESTION, DELETE_SUGGESTION_SUCCESS, DELETE_SUGGESTION_ERROR,
    UPDATE_SUGGESTION, UPDATE_SUGGESTION_ERROR, UPDATE_SUGGESTION_SUCCESS, GET_SUGGESTION_UPDATE, REMOVE_SUGGESTION_UPDATE,
    CREATE_SUGGESTION, CREATE_SUGGESTION_SUCCESS, CREATE_SUGGESTION_ERROR,
    REQUEST_SUGGESTION_COUNT, RECEIVE_SUGGESTION_COUNT, RECEIVE_SUGGESTION_COUNT_ERROR
} from '../actions/suggestion.action'
import { Suggestion, ISuggestionState, ResponseSuggestion } from "../models/suggestion";

const initialState: ISuggestionState = {
    suggestionList: {} as ResponseSuggestion,
    suggestionEdit: {} as Suggestion,
    suggestionCount: 0,
    isLoading: false,
    isUpdating: false,
    error: null,
};

function suggestionReducer(state = initialState, action: IActionBase): ISuggestionState {
    switch (action.type) {
        case REQUEST_SUGGESTION: {
            return {
                ...state,
                isLoading: true
            };
        }
        case RECEIVE_SUGGESTION: {
            return {
                ...state,
                suggestionList: action.data,
                isLoading: false,
            };
        }
        case RECEIVE_SUGGESTION_ERROR: {
            return {
                ...state,
                isLoading: false,
                error: action.error
            };
        }

        case DELETE_SUGGESTION: {
            return {
                ...state,
                isUpdating: true
            };
        }
        case DELETE_SUGGESTION_SUCCESS: {
            return {
                ...state,
                // Remove the QueryRule from the collection.
                suggestionList: {} as ResponseSuggestion,
                isUpdating: false,
                suggestionCount: state.suggestionCount - 1
            };
        }
        case DELETE_SUGGESTION_ERROR: {
            return {
                ...state,
                isUpdating: false,
                error: action.error
            };
        }
        case CREATE_SUGGESTION: {
            return {
                ...state,
                isUpdating: true
            };
        }
        case CREATE_SUGGESTION_SUCCESS: {
            return {
                ...state,
                isUpdating: false,
                suggestionList: {} as ResponseSuggestion,
                suggestionCount: state.suggestionCount + 1
            };
        }
        case CREATE_SUGGESTION_ERROR: {
            return {
                ...state,
                isUpdating: false,
                error: action.error
            };
        }
        case GET_SUGGESTION_UPDATE: {
            return {
                ...state,
                suggestionEdit: action.data,
                isUpdating: true
            };
        }
        case REMOVE_SUGGESTION_UPDATE: {
            return {
                ...state,
                suggestionEdit: {} as Suggestion,
                isUpdating: false
            };
        }
        case UPDATE_SUGGESTION: {
            return {
                ...state,
                isUpdating: true
            };
        }
        case UPDATE_SUGGESTION_SUCCESS: {
            return {
                ...state,
                isUpdating: false,
                suggestionList: {} as ResponseSuggestion,
            };
        }
        case UPDATE_SUGGESTION_ERROR: {
            return {
                ...state,
                isUpdating: false,
                error: action.error
            };
        }
        case REQUEST_SUGGESTION_COUNT: {
            return {
                ...state,
                isUpdating: true
            };
        }
        case RECEIVE_SUGGESTION_COUNT: {
            return {
                ...state,
                isUpdating: false,
                suggestionCount: action.response,
            };
        }
        case RECEIVE_SUGGESTION_COUNT_ERROR: {
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

export default suggestionReducer;