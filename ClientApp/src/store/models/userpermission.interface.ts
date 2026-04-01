export interface UserPermission {
    id: string,
    name: string,
    view: Array<string>,
    edit: Array<string>,
    delete: Array<string>,
}

export interface ResponsePermission {
    error: string,
    isSuccess: boolean,
    status: string,
    result: Array<UserPermission>
}

export interface GetUserPermission {
    name: string,
    view: boolean,
    edit: boolean,
    delete: boolean,
}

export interface ResponseGetUserPermission {
    error: string,
    isSuccess: boolean,
    status: string,
    result: GetUserPermission
}

export interface IUserPermissionState {
    permissionList: ResponsePermission,
    permissionEdit: UserPermission,
    getUserPermissionScreen: ResponseGetUserPermission,
    isLoading: boolean,
    isUpdating: boolean,
    error: any,
}
