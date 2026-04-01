import { IActionBase } from "../models/root.interface";
import { IAccount } from "../models/account.interface";
import { LOG_IN, LOG_OUT } from "../actions/account.actions";

const initialState: IAccount = {
    email: "",
    name: "",
    picture: "",
    isAuthenticated: false,
    isAuthenticationEnabled: false,
    groups: "",
    fullGroups: [],
};

function accountReducer(state: IAccount = initialState, action: IActionBase): IAccount {
    switch (action.type) {
        case LOG_IN: {
            // If the authentication is not enabled it sets the isAuthenticated to true, otherwise uses the result from the API.
            const isAuthenticated = action.account.isAuthenticationEnabled ? action.account.isAuthenticated : true;

            return {
                ...state,
                email: action.account.email,
                name: action.account.name,
                picture: action.account.picture,
                isAuthenticated: isAuthenticated,
                isAuthenticationEnabled: action.account.isAuthenticationEnabled,
                groups: action.account.groups,
                fullGroups: action.account.fullGroups ?? [],
                groupIds: action.account.groupIds ?? [],
                tenants: action.account.tenants,
                currentTenant: action.account.currentTenant
            };
        }
        case LOG_OUT: {
            return {
                ...state,
                email: "",
                name: "",
                picture: "",
                isAuthenticated: false,
                groups: "",
                fullGroups: [],
                groupIds: [],
                tenants: undefined,
                currentTenant: undefined
            };
        }
        default:
            return state;
    }
}


export default accountReducer;