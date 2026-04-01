import { IActionBase } from "../models/root.interface";
import { REQUEST_CONTROL_PAIN, RECEIVE_CONTROL_PAIN, RECEIVE_CONTROL_PAIN_ERROR, 
DELETE_CONTROL_PAIN, DELETE_CONTROL_PAIN_ERROR, DELETE_CONTROL_PAIN_SUCCESS,
REQUEST_DOCUMENT_COUNT, RECEIVE_DOCUMENT_COUNT, RECEIVE_DOCUMENT_COUNT_ERROR } from '../actions/controlPain.action'
import { ControlPane, IControlPaneState } from "../models/controlPanel";

const initialState: IControlPaneState = {
    controlPainList: [],
    documentCount: 0,
    isLoading: false,
    isUpdating: false,
    error: null,
};

function controlPainReducer(state = initialState, action: IActionBase): IControlPaneState {
    switch (action.type) {
        case REQUEST_CONTROL_PAIN: {
            return {
                ...state,
                isLoading: true
            };
        }
        case RECEIVE_CONTROL_PAIN: {
            return {
                ...state,
                controlPainList: action.data,
                isLoading: false,
            };
        }
        case RECEIVE_CONTROL_PAIN_ERROR: {
            return {
                ...state,
                isLoading: false,
                error: action.error
            };
        }

        case DELETE_CONTROL_PAIN: {
            return {
                ...state,
                isUpdating: true
            };
        }
        case DELETE_CONTROL_PAIN_SUCCESS: {
            return {
                ...state,
                // Remove the QueryRule from the collection.
                controlPainList: state.controlPainList.filter((q: ControlPane) => q.id !== action.id),
                isUpdating: true,
            };
        }
        case DELETE_CONTROL_PAIN_ERROR: {
            return {
                ...state,
                isUpdating: false,
                error: action.error
            };
        }
        case REQUEST_DOCUMENT_COUNT: {
            return {
                ...state,
                isLoading: true,
            };
        }
        case RECEIVE_DOCUMENT_COUNT: {
            return {
                ...state,
                documentCount: action.response,
                isLoading: false
            };
        }
        case RECEIVE_DOCUMENT_COUNT_ERROR: {
            return {
                ...state,
                isLoading: false,
                error: action.error
            };
        }
        default:
            // Redux will call our reducer with an undefined state for the first time: https://redux.js.org/basics/reducers#handling-actions
            return state;
    }
}

export default controlPainReducer;