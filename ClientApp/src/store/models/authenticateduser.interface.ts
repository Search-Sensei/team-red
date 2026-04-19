/**
 * The authenticated user returned by the login process. This will be an object generated
 * from the IDP login process.
 * */
export interface IAuthenticatedUser {
    name: string;
    email: string;
    picture: string;
    idToken: string;
    accessToken: string;
    isAuthenticated: boolean;
    isAuthenticationEnabled: boolean;
    groups: string;
    fullGroups: Array<string>;
    groupIds?: Array<string>;
    groupId?: string;
    tenants?: Array<{ name: string; displayName: string }>;
    currentTenant?: string;
}