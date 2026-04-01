import { IActionBase } from "../models/root.interface";
import { 
    RECEIVE_FAST_LINK, REQUEST_FAST_LINK, RECEIVE_FAST_LINK_ERROR,
    DELETE_FAST_LINK, DELETE_FAST_LINK_SUCCESS, DELETE_FAST_LINK_ERROR, CREATE_CATEGORIES_FAST_LINK_SUCCESS,
    UPDATE_FAST_LINK, UPDATE_FAST_LINK_ERROR, UPDATE_FAST_LINK_SUCCESS, GET_FAST_LINK_UPDATE, REMOVE_FAST_LINK_UPDATE,
    CREATE_FAST_LINK, CREATE_FAST_LINK_SUCCESS, CREATE_FAST_LINK_ERROR, DELETE_CATEGORIES_FAST_LINK_SUCCESS,
    REQUEST_FAST_LINK_COUNT, RECEIVE_FAST_LINK_COUNT, RECEIVE_FAST_LINK_COUNT_ERROR, REQUEST_ACTION_CREATE, RECEIVE_CATEGORIES_ERROR, REQUEST_CATEGORIES, RECEIVE_FAST_LINK_ADD_CATEGORIES, REMOVE_CATEGORIES_UPDATE, UPDATE_FAST_LINK_LIST, GET_CATEGORY_UPDATE
 } from '../actions/fastlink.action'
import { Categories, CategoryData, FastLinks, IFastLinksState, ResponseFastLinks, ResponseNavigation, ResultFastLinks } from "../models/fastlinks";

const initialState: IFastLinksState = {
    fastLinkList: {} as ResponseFastLinks,
    fastLinkEdit: {} as FastLinks,
    disallowedSeq: [],
    fastLinkCount: 0,
    isLoading: false ,
    isUpdating: false,
    error: null,
    actionCreate: false,
    categories: Array<Categories>(),
    category: {} as CategoryData,
    fastLinkData: {} as ResponseNavigation,
    fastLinkListUpdate: {} as ResultFastLinks,
};

function fastLinkReducer(state = initialState, action: IActionBase): IFastLinksState {
    switch (action.type) {
        case REQUEST_FAST_LINK: {
            return {
                ...state,
                isLoading: true
            };
        }
        case REQUEST_ACTION_CREATE: {
            return {
                ...state,
                actionCreate: action.data
            };
        }
        case RECEIVE_FAST_LINK: {
            return {
                ...state,
                fastLinkList: action.data,
                isLoading: false,
            };
        }
        case UPDATE_FAST_LINK_LIST: {
            return {
                ...state,
                fastLinkListUpdate: action.data,
                isLoading: false,
            };
        }
        case RECEIVE_FAST_LINK_ADD_CATEGORIES: {
            return {
                ...state,
                fastLinkData: action.data,
                isLoading: false,
            };
        }
        case RECEIVE_FAST_LINK_ERROR: {
            return {
                ...state,
                isLoading: false,
                error: action.error
            };
        }
        case REQUEST_CATEGORIES: {
            return {
                ...state,
                categories: action.data,
                isLoading: false,
            };
        }
        case GET_CATEGORY_UPDATE: {
            return {
                ...state,
                category: action.data,
                isLoading: false,
            };
        }
        case RECEIVE_CATEGORIES_ERROR: {
            return {
                ...state,
                isLoading: false,
                error: action.error
            };
        }
        case DELETE_FAST_LINK: {
            return {
                ...state,
                isUpdating: true
            };
        }
        case DELETE_FAST_LINK_SUCCESS: {
            return {
                ...state,
                // Remove the QueryRule from the collection.
                fastLinkList: {} as ResponseFastLinks,
                isUpdating: false,
                fastLinkCount: state.fastLinkCount - 1
            };
        }
        case DELETE_FAST_LINK_SUCCESS: {
            return {
                ...state,
                fastLinkList: {} as ResponseFastLinks,
                isUpdating: false,
                fastLinkCount: state.fastLinkCount + 1
            };
        }
        case DELETE_CATEGORIES_FAST_LINK_SUCCESS: {
            return {
                ...state,
                isUpdating: false,
                fastLinkCount: state.fastLinkCount - 1
            };
        }
        case DELETE_FAST_LINK_ERROR: {
            return {
                ...state,
                isUpdating: false,
                error: action.error
            };
        }
        case CREATE_FAST_LINK: {
            return {
                ...state,
                isUpdating: true
            };
        }
        case CREATE_FAST_LINK_SUCCESS: {
            return {
                ...state,
                isUpdating: false,
                fastLinkList: {} as ResponseFastLinks,
                fastLinkCount: state.fastLinkCount + 1
            };
        }
        case CREATE_FAST_LINK_ERROR: {
            return {
                ...state,
                isUpdating: false,
                error: action.error
            };
        }
        case GET_FAST_LINK_UPDATE: {
            return {
                ...state,
                fastLinkEdit: action.data,
                disallowedSeq: action.extraData,
                isUpdating: true
            };
        }
        case REMOVE_FAST_LINK_UPDATE: {
            return {
                ...state,
                fastLinkEdit: {} as FastLinks,
                isUpdating: false
            };
        }
        case UPDATE_FAST_LINK: {
            return {
                ...state,
                isUpdating: true
            };
        }
        case UPDATE_FAST_LINK_SUCCESS: {
            return {
                ...state,
                isUpdating: false,
                fastLinkList: {} as ResponseFastLinks,
            };
        }
        case UPDATE_FAST_LINK_ERROR: {
            return {
                ...state,
                isUpdating: false,
                error: action.error
            };
        }
        case REQUEST_FAST_LINK_COUNT: {
            return {
                ...state,
                isUpdating: true
            };
        }
        case RECEIVE_FAST_LINK_COUNT: {
            return {
                ...state,
                isUpdating: false,
                fastLinkCount: action.response,
            };
        }
        case RECEIVE_FAST_LINK_COUNT_ERROR: {
            return {
                ...state,
                isUpdating: false,
                error: action.error
            };
        }
        case REMOVE_CATEGORIES_UPDATE: {
            return {
                ...state,
                categories: {} as Array<Categories>,
                isUpdating: false
            };
        }
        default:
            // Redux will call our reducer with an undefined state for the first time: https://redux.js.org/basics/reducers#handling-actions
            return state;
    }
}

export default fastLinkReducer;