export interface UserGroups {
    id: string,
    groupName: string,
    description: string
}

export interface ResponseUserGroups {
    error: string,
    isSuccess: boolean,
    status: number,
    result: Array<UserGroups>
}

export interface GetUserPermission {
    name: string,
    view: boolean,
    edit: boolean,
    delete: boolean,
}

export interface ResponseGetUserGroups {
    error: string,
    isSuccess: boolean,
    status: string,
    result: GetUserPermission
}

export interface IUserGroupsState {
    userGroupsList: ResponseUserGroups,
    userGroupsEdit: UserGroups,
    userGroupsCount: number,
    groups: string,
    isLoading: boolean,
    isUpdating: boolean,
    error: string,
}

export interface IGroupsState {
    groups: string,
}
