import { combineReducers, Reducer } from "redux";
import { CLEAR_ERROR_MESSAGE, CLEAR_REDIRECT_URL, SET_ERROR_MESSAGE, SET_REDIRECT_URL, UPDATE_CURRENT_PATH } from "../actions/root.actions";
import { IRootStateType, IActionBase, IStateType } from "../models/root.interface";
import productsReducer from "./products.reducer";
import notificationReducer from "./notification.reducer";
import userReducer from "./users.reducer";
import orderReducer from "./order.reducer";
import accountReducer from "./account.reducer";
import queryRuleReducer from "./queryrule.reducer";
import adminSettingsReducer from "./adminsettings.reducer";
import synonymReducer from "./synonym.reducer";
import controlPain from "./controlPain.reducer";
import fastLinkReducer from "./fastlink.reducer";
import navigationReducer from "./navigation.reducer";
import userPermissionReducer from "./userPermission.reducer";
import userGroupsReducer from "./usergroups.reducer";
import contentReducer from "./content.reducer";
import suggestionReducer from "./suggestion.reducer";


const initialState: IRootStateType = {
    page: { area: "home", subArea: "" },
    errorMessage: "",
    redirectUrl: ""
};

function rootReducer(state: IRootStateType = initialState, action: IActionBase): IRootStateType {
    switch (action.type) {
        case UPDATE_CURRENT_PATH:
            return { ...state, page: { area: action.area, subArea: action.subArea } };
        case SET_ERROR_MESSAGE:
            return { ...state, errorMessage: action.errorMessage };
        case CLEAR_ERROR_MESSAGE:
            return { ...state, errorMessage: "" };
        case SET_REDIRECT_URL: {
            return { ...state, redirectUrl: action.redirectUrl }
        }
        case CLEAR_REDIRECT_URL: {
            return { ...state, redirectUrl: "" }
        }
        default:
            return state;
    }
}

const rootReducers: Reducer<IStateType> = combineReducers({
    root: rootReducer,
    products: productsReducer,
    notifications: notificationReducer,
    users: userReducer,
    orders: orderReducer,
    account: accountReducer,
    queryRulesState: queryRuleReducer,
    adminSettingsState: adminSettingsReducer,
    synonymStateState: synonymReducer,
    controlPain: controlPain,
    fastLinkStateState: fastLinkReducer,
    permissionState: userPermissionReducer,
    userGroupsState: userGroupsReducer,
    navigationState: navigationReducer,
    suggestionState: suggestionReducer,
    contentState: contentReducer
});

export default rootReducers;