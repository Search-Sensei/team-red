import React, { Dispatch, useState, useEffect, useCallback } from "react";
import { Button } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import LoadingIndicator from "../../common/components/LoadingIndicator";
import MessageAlert from "../../common/components/MessageAlert";
import { ApiHelper } from "../../common/modules/ApiHelper";
import { MessageAlertType } from "../../common/types/MessageAlert.types";
import { login } from "../../store/actions/account.actions";
import { appVirtualPath, getBaseUrl } from "../../store/actions/adminsettings.actions";
import { setRedirectUrl } from "../../store/actions/root.actions";
import { IAccount } from "../../store/models/account.interface";
import { IAuthenticatedUser } from "../../store/models/authenticateduser.interface";
import { HttpMethod } from "../../store/models/httpmethod";
import { IStateType } from "../../store/models/root.interface";
import { getGroups } from "../../store/actions/usergroups.action";
import { IAdminSettingsState } from "../../store/models/adminsettingsstate.interface";
import { setErrorMesssage } from "../../store/actions/root.actions";
import fetcher from "../Fetcher";
import { normalizeAdminApiUrl } from "../../store/actions/adminsettings.actions";

const Login: React.FC = () => {
    const [token, setToken] = useState<string | null>(null);
    const [isTokenActive, setIsTokenActive] = useState<boolean>(false);
    const dispatch: Dispatch<any> = useDispatch();
    const account: IAccount = useSelector((state: IStateType) => state.account);
    const errorMessage: string = useSelector((state: IStateType) => state.root.errorMessage);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [showLogOut, setShowLogOut] = useState(false);
    const [mTLSEnabled, setmTLSEnabled] = useState(false);
    const [isGettingUserDetails, setIsGettingUserDetails] = useState(false);
    const [email, setEmail] = useState("");
    // Always use /adminui prefix for API calls
    const baseApiUrl: string = appVirtualPath;
    const redirectUrlQueryStringKey = "redirectUrl";
    // If not the root path then add a redirectUrl query string parameter to the login href that will be used as the redirect from the IDP after successful login.
    const redirect: string = window.location.pathname !== "/" && window.location.pathname !== appVirtualPath ? `&${redirectUrlQueryStringKey}=${window.location.href}` : "";
    const loginHref = `${baseApiUrl}/account/login`;
    const logoutHref = `${baseApiUrl}/account/logout`;
    const title = "Welcome";

    const adminSettingsState: IAdminSettingsState = useSelector(
        (state: IStateType) => state.adminSettingsState
    );

    interface UserGroup {
      id: string;
      groupName: string;
      description: string;
      dataType: string;
    }

    const getAdminApiBaseUrl = useCallback((): string => {
        return normalizeAdminApiUrl(adminSettingsState.adminSettings?.searchAdminApiUrl);
    }, [adminSettingsState.adminSettings]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        setEmail(e.target.value);
    };

    useEffect(() => {
        const fetchmTLSCheck = async () => {
            const url = `${baseApiUrl}/api/mTLSCheck`;
            //Internal_Call :  Interact base API Url which Method Get
            //Receiving_Data : Data of base API Url to convert file JSON
            const response = await fetch(url, {
                method: 'GET',
            });
            setmTLSEnabled(await response.json());
        }
        fetchmTLSCheck();
    },[]);

    useEffect(() => {
        if (token) {
            setIsTokenActive(true);
        }
        else {
            const timer = setTimeout(() => {
                setIsTokenActive(true);
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [token]);

    useEffect(() => {
        const fetchToken = async () => {
            if (localStorage.timestamp) {
                if (!localStorage.accessToken || parseInt(localStorage.timestamp) < Date.now()) {
                    try {
                        const url = `${baseApiUrl}/api/token`;
                        //Internal_Call :  Interact base API Url which Method Get 
                        //Receiving_Data : Data of base API Url to convert file JSON and take access_token
                        const response = await fetch(url, {
                            method: 'GET',
                        });

                        const resultToken = await response.json();
                        saveTokenResponseToStorage(resultToken);
                        setToken(resultToken.access_token ?? "Bearer");
                    } catch (error) {
                        console.error('Error fetching token:', error);
                    }
                }
                if (localStorage.accessToken || parseInt(localStorage.timestamp) > Date.now()) {
                    setToken(localStorage.getItem('accessToken'));
                }
            }
            else {
                try {
                    const url = `${baseApiUrl}/api/token`;
                    const response = await fetch(url, { method: 'GET' });
                    const resultToken = await response.json();
                    saveTokenResponseToStorage(resultToken);
                    setToken(resultToken.access_token ?? "Bearer");
                } catch (error) {
                    console.error('Error fetching token:', error);
                }
            }
        };

        function saveTokenResponseToStorage(t: Record<string, unknown>) {
            if (t.access_token) {
                localStorage.setItem('accessToken', String(t.access_token));
                localStorage.setItem('timestamp', (Date.now() + (Number(t.expires_in) || 300) * 1000).toString());
            }
            if (t.refresh_token) localStorage.setItem('refreshToken', String(t.refresh_token));
            if (t.token_type != null) localStorage.setItem('token_type', String(t.token_type));
            if (t.expires_in != null) localStorage.setItem('expires_in', String(t.expires_in));
            if (t.refresh_expires_in != null) localStorage.setItem('refresh_expires_in', String(t.refresh_expires_in));
            if (t.session_state != null) localStorage.setItem('session_state', String(t.session_state));
            if (t.scope != null) localStorage.setItem('scope', String(t.scope));
            if (t.not_before_policy != null) localStorage.setItem('not_before_policy', String(t.not_before_policy));
        }
        if(mTLSEnabled) {
        fetchToken();
        }
        else{
            setIsTokenActive(true);
        }
    }, [mTLSEnabled]);



    const handleKeyPress = (event: { key: string; }) => {
        if (event.key === 'Enter') {
            setIsLoggingIn(true)
            window.location.href = loginHref + (email != "" ? "?email=" + email + "&" : "?") + (`returnUrl=${window.location.href}${redirect}`);
        }
    }

    function getRedirectUrl(): string {
        const urlParams = new URLSearchParams(window.location.search);
        const redirectUrl: string = urlParams.get(redirectUrlQueryStringKey) || "";
        return redirectUrl;
    }
    async function getUserDetailsCallback(jsonResponse: any, hasAttemptedLogin: boolean): Promise<void> {
        setIsLoggingIn(false);
        const authenticatedUser: IAuthenticatedUser = jsonResponse as IAuthenticatedUser;
        if (!authenticatedUser.isAuthenticated) {
            try {
                const tokenKeys = ["accessToken", "refreshToken", "timestamp", "token_type", "expires_in", "refresh_expires_in", "session_state", "scope", "not_before_policy"];
                tokenKeys.forEach(k => localStorage.removeItem(k));
            } catch (_) {}
        }

        const fullGroupsArr = authenticatedUser.fullGroups ?? (Array.isArray((authenticatedUser as any).groups) ? (authenticatedUser as any).groups : []);
        const groupsStr = typeof authenticatedUser.groups === "string" ? authenticatedUser.groups : fullGroupsArr.join(",");
        const groupIdsArr = authenticatedUser.groupIds ?? (Array.isArray((authenticatedUser as any).groupIds) ? (authenticatedUser as any).groupIds : []);
        const account: IAccount = {
            email: authenticatedUser.email,
            name: authenticatedUser.name,
            picture: authenticatedUser.picture,
            isAuthenticated: authenticatedUser.isAuthenticated,
            isAuthenticationEnabled: authenticatedUser.isAuthenticationEnabled,
            groups: groupsStr,
            fullGroups: fullGroupsArr,
            groupIds: groupIdsArr,
            tenants: authenticatedUser.tenants ?? (authenticatedUser.groupId ? [{ name: authenticatedUser.groupId, displayName: authenticatedUser.groupId }] : []),
            currentTenant: authenticatedUser.currentTenant ?? authenticatedUser.groupId
        };
        var canLogin = true;
        dispatch(getGroups(groupsStr));
        if (groupsStr && hasAttemptedLogin) {
            // Internal_Call : Request Method GET to Endpoint ${baseApiUrl}/api/settings
            // Receiving_Data : Get value userPermissionEnabled of file JSON from response API
            var conn = await fetcher(`${baseApiUrl}/api/settings`, {
                method: 'GET',
            });
            const settings = await conn.json();
            var permissionEnable = settings?.userPermissionEnabled;

            if (permissionEnable) {
                //Internal_Call: Making a POST request to endpoint '${baseApiUrl}/adminui/userGroups/search'
                //Sending_Data: Sending `query` to create the setting body
                const response = await fetcher(`${baseApiUrl}/adminui/userGroups/search`, {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    method: 'POST',
                    body: JSON.stringify({ query: "" }),
                });

                const result = await response.json();
                if (result.result == "" || (Array.isArray(result.result) && result.result.length == 0)) {
                    
                    //Internal_Call: Making a POST request to endpoint '${baseApiUrl}/adminui/userGroups/init'
                    //Sending_Data: Sending `id,groupName,description` to create the setting body
                    const response2 = await fetcher(`${baseApiUrl}/adminui/userGroups/init`, {
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        method: 'POST',
                        body: JSON.stringify({
                            id: (authenticatedUser.groupId ?? (groupsStr.trim() || "init")).trim(),
                            groupName: "init",
                            description: "init",
                        }),
                    });
                    await response2.json();
                } else {
                    const resultIds = result?.result?.map((item: { id: any }) => item.id.trim()) || [];
                    const resultGroupName = result?.result?.filter((item: UserGroup) => fullGroupsArr.includes(item.id.trim()));
                    if (!fullGroupsArr.some((groupId: string) => resultIds.includes(groupId.trim()))) {
                        canLogin = false;
                        dispatch(setErrorMesssage("You do not have permission to access. Please sign out and try again later."));
                        setShowLogOut(true)
                    } else {
                        // Internal_Call : Request Method Get to Endpoint ${baseApiUrl}/adminui/userPermission/search
                        // Receiving_Data : Content of file JSON from response API
                        const response = await fetcher(`${baseApiUrl}/adminui/userPermission/search`, {
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            method: 'GET',
                        });
                        const result = await response.json();

                        type Permission = {
                            view: string[];
                            edit: string[];
                            delete: string[];
                        };

                        const hasPermission = result?.result?.some((permission: Permission) => {
                            const allPermissions = [...permission.view, ...permission.edit, ...permission.delete];
                            return resultGroupName.some((group: UserGroup) => allPermissions.includes(group.groupName));
                        });

                        if (!hasPermission) {
                            canLogin = false;
                            dispatch(setErrorMesssage("No permission found for your group. Please sign out and try again later.")); // Set error message
                            setShowLogOut(true)
                        }
                    }
                }
            }
        }
        if (canLogin) {
            dispatch(login(account));
        }

        if (authenticatedUser.isAuthenticated) {
            // Store the redirect in redux state to redirect after the account has successfully stored in redux state.
            dispatch(setRedirectUrl(getRedirectUrl()));

            // After a successful login try to redirect if required.
            const redirectUrl = getRedirectUrl();
            if (redirectUrl) {
                window.location.href = redirectUrl;
            }
        }
    }

    /**
     * Call the API to get the authenticatedUser details and store in redux.
     */
    function getAuthenticatedUser() {
        if (!isGettingUserDetails && !account.isAuthenticated) {
            setIsGettingUserDetails(true);
            setIsLoggingIn(true);
            ApiHelper.getApiResponse(`${baseApiUrl}/account/getuserdetails`, HttpMethod.Get, getUserDetailsCallback, dispatch, "Failed to get user details.", "", true);
        }
    }

    function getLoginContent(): JSX.Element | null {
        if (!account.isAuthenticated) {
            getAuthenticatedUser();
        }

        if (!account.isAuthenticated && !isLoggingIn) {
            return (
                <div className="text-center login-content">
                    <p>Log in to Search Administration.</p>
                    {/*<Button className="btn btn-secondary" onClick={loginClick}>Login</Button>*/}
                    <div hidden={showLogOut}>
                        <label>Email: </label>
                        <input
                            value={email} type="text"
                            onChange={handleChange} onKeyPress={handleKeyPress}
                        />
                    </div>
                    <Button className="btn btn-secondary" href={loginHref + (email != "" ? "?email=" + email + "&" : "?") + (`returnUrl=${window.location.href}${redirect}`)} hidden={showLogOut} onClick={() => setIsLoggingIn(true)}>Login</Button>
                    <Button className="btn btn-secondary" href={logoutHref} hidden={!showLogOut} onClick={() => { ["accessToken", "refreshToken", "timestamp", "token_type", "expires_in", "refresh_expires_in", "session_state", "scope", "not_before_policy"].forEach(k => localStorage.removeItem(k)); setIsLoggingOut(true); }}>Logout</Button>
                    <hr hidden={showLogOut} />
                    <div hidden={showLogOut}>
                        <p className="text-muted mb-2">Don't have an account?</p>
                        <a href="/portal/register" className="btn btn-outline-primary">Register Your Organisation</a>
                    </div>
                </div>
            );
        }

        return null;
    }

    return (
        <>
            {isTokenActive ? (<div id="content-wrapper">
                <div className="container">
                    <div className="row justify-content-center">
                        <div className="col-xl-10 col-lg-12 col-md-9">
                            <div className="card o-hidden border-0 shadow-lg my-5">
                                <div className="card-body p-0">
                                    <div className="row">
                                        <div className="col-lg-6 d-none d-lg-block bg-login-image"></div>
                                        <div className="col-lg-6">
                                            <div className="p-5 login-container-right">
                                                <div className="brand d-flex align-items-center justify-content-center">
                                                    <div className="account-icon login-icon">
                                                        <div className="sidebar-brand-icon" />
                                                    </div>
                                                </div>
                                                <div className="text-center">
                                                    <h1 className="h4 text-gray-900">{title}</h1>
                                                </div>
                                                <div className="login-container">
                                                    {getLoginContent()}

                                                    <LoadingIndicator isLoading={isLoggingIn} text="Logging in" />
                                                    <LoadingIndicator isLoading={isLoggingOut} text="Logging out" />
                                                    <MessageAlert message={errorMessage} type={MessageAlertType.Error} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>) : (
                <div></div>
            )}
        </>
    );
};

export default Login;
