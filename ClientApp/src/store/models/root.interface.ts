import { IProduct, ProductModificationStatus } from "./product.interface";
import { INotification } from "./notification.interface";
import { IUser } from "./user.interface";
import { IOrder } from "./order.interface";
import { IAccount } from "./account.interface";
import { IQueryRulesState } from "./queryrulesstate.interface";
import { IAdminSettingsState } from "./adminsettingsstate.interface";
import { ISynonymState } from "./synonym.interface";
import { IControlPaneState } from "./controlPanel";
import { IFastLinksState } from "./fastlinks";
import { INavigationState } from "./navigation";
import { IUserPermissionState } from "./userpermission.interface";
import { IUserGroupsState } from "./usergroups.interface";
import { IContentState } from "./content.interface";
import { ISuggestionState } from "./suggestion";
export interface IRootPageStateType {
    area: string;
    subArea: string;
}

export interface IRootStateType {
    page: IRootPageStateType;
    errorMessage: string;
    redirectUrl: string;
}
export interface IStateType {
    root: IRootStateType;
    products: IProductState;
    notifications: INotificationState;
    users: IUserState;
    orders: IOrdersState;
    account: IAccount;
    queryRulesState: IQueryRulesState;
    adminSettingsState: IAdminSettingsState;
    synonymStateState: ISynonymState;
    controlPain: IControlPaneState;
    fastLinkStateState: IFastLinksState;
    navigationState: INavigationState;
    permissionState: IUserPermissionState;
    userGroupsState: IUserGroupsState;
    contentState: IContentState;
    suggestionState: ISuggestionState;
}

export interface IProductState {
    products: IProduct[];
    selectedProduct: IProduct | null;
    modificationState: ProductModificationStatus;
}

export interface IActionBase {
    type: string;
    [prop: string]: any;
}

export interface IOrdersState {
    orders: IOrder[];
}

export interface INotificationState {
    notifications: INotification[];
}

export interface IUserState {
    users: IUser[];
    admins: IUser[];
}