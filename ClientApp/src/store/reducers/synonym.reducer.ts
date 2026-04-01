import { IActionBase } from "../models/root.interface";
import { 
    RECEIVE_SYNONYM, REQUEST_SYNONYM, RECEIVE_SYNONYM_ERROR,
    DELETE_SYNONYM, DELETE_SYNONYM_SUCCESS, DELETE_SYNONYM_ERROR,
    UPDATE_SYNONYM, UPDATE_SYNONYM_ERROR, UPDATE_SYNONYM_SUCCESS, GET_SYNONYM_UPDATE, REMOVE_SYNONYM_UPDATE,
    CREATE_SYNONYM, CREATE_SYNONYM_SUCCESS, CREATE_SYNONYM_ERROR, 
    REQUEST_SYNONYM_COUNT, RECEIVE_SYNONYM_COUNT, RECEIVE_SYNONYM_COUNT_ERROR
 } from '../actions/synonym.action'
import { Synonym, ISynonymState } from "../models/synonym.interface";

const initialState: ISynonymState = {
    synonymList: [],
    synonymEdit: {} as Synonym,
    synonymCount: 0,
    isLoading: false,
    isUpdating: false,
    error: null,
};

function synonymReducer(state = initialState, action: IActionBase): ISynonymState {
    switch (action.type) {
        case REQUEST_SYNONYM: {
            return {
                ...state,
                isLoading: true
            };
        }
        case RECEIVE_SYNONYM: {
            return {
                ...state,
                synonymList: action.data,
                isLoading: false,
            };
        }
        case RECEIVE_SYNONYM_ERROR: {
            return {
                ...state,
                isLoading: false,
                error: action.error
            };
        }

        case DELETE_SYNONYM: {
            return {
                ...state,
                isUpdating: true
            };
        }
        case DELETE_SYNONYM_SUCCESS: {
            return {
                ...state,
                // Remove the QueryRule from the collection.
                synonymList: state.synonymList.filter((q: Synonym) => q.id !== action.id),
                isUpdating: false,
                synonymCount: state.synonymCount - 1
            };
        }
        case DELETE_SYNONYM_ERROR: {
            return {
                ...state,
                isUpdating: false,
                error: action.error
            };
        }
        case CREATE_SYNONYM: {
            return {
                ...state,
                isUpdating: true
            };
        }
        case CREATE_SYNONYM_SUCCESS: {
            return {
                ...state,
                isUpdating: false,
                synonymList: [...state.synonymList, action.data],
                synonymCount: state.synonymCount + 1
            };
        }
        case CREATE_SYNONYM_ERROR: {
            return {
                ...state,
                isUpdating: false,
                error: action.error
            };
        }
        case GET_SYNONYM_UPDATE: {
            return {
                ...state,
                synonymEdit: action.data,
                isUpdating: true
            };
        }
        case REMOVE_SYNONYM_UPDATE: {
            return {
                ...state,
                synonymEdit: {} as Synonym,
                isUpdating: false
            };
        }
        case UPDATE_SYNONYM: {
            return {
                ...state,
                isUpdating: true
            };
        }
        case UPDATE_SYNONYM_SUCCESS: {
            const index = state.synonymList.findIndex(synonym => synonym.id === action.data.id);
            state.synonymList[index] = action.data.synonym
            return {
                ...state,
                isUpdating: false,
                synonymList: [...state.synonymList],
            };
        }
        case UPDATE_SYNONYM_ERROR: {
            return {
                ...state,
                isUpdating: false,
                error: action.error
            };
        }
        case REQUEST_SYNONYM_COUNT: {
            return {
                ...state,
                isUpdating: true
            };
        }
        case RECEIVE_SYNONYM_COUNT: {
            return {
                ...state,
                isUpdating: false,
                synonymCount: action.response,
            };
        }
        case RECEIVE_SYNONYM_COUNT_ERROR: {
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

export default synonymReducer;