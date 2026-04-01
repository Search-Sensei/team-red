import { IUserState, IActionBase } from "../models/root.interface";
import { ADD_ADMIN, REMOVE_ADMIN } from "../actions/users.action";

const initialState: IUserState = {
    users: [
        { id: 1, firstName: "John", lastName: "Smith", email: "jsmith@search365.ai", },
        { id: 2, firstName: "Jane", lastName: "Doe", email: "jdoe@search365.ai" },
        { id: 3, firstName: "Support", lastName: "User", email: "support@search365.ai" },
        { id: 4, firstName: "Accounts", lastName: "User", email: "accounts@search365.ai" }
    ],
    admins: [
        { id: 3, firstName: "Access", lastName: "Account", email: "access@search365.ai" },
    ]
};

function userReducer(state: IUserState = initialState, action: IActionBase): IUserState {
    switch (action.type) {
        case ADD_ADMIN: {
            return { ...state, users: state.users.filter(x=>x.id !== action.user.id), admins: [...state.admins, action.user]};
        }
        case REMOVE_ADMIN: {
            return { ...state, admins: state.admins.filter(x=>x.id !== action.user.id), users: [...state.users, action.user]};
        }
        default:
            return state;
    }
}

export default userReducer;