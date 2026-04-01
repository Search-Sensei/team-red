export interface IAccount {
    email: string;
    name: string;
    picture: string;
    isAuthenticated: boolean;
    isAuthenticationEnabled: boolean;
    groups: string;
    fullGroups: Array<string>;
    groupIds?: Array<string>;
    tenants?: Array<string>;
    currentTenant?: string;
}