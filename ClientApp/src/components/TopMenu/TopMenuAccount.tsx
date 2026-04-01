import React, { Fragment, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { appVirtualPath } from "../../store/actions/adminsettings.actions";
import { login } from "../../store/actions/account.actions";
import { IAccount } from "../../store/models/account.interface";
import { IAuthenticatedUser } from "../../store/models/authenticateduser.interface";
import { IStateType } from "../../store/models/root.interface";
import { ApiHelper } from "../../common/modules/ApiHelper";
import { HttpMethod } from "../../store/models/httpmethod";

function TopMenuAccount(): JSX.Element {
    const dispatch = useDispatch();
    const account: IAccount = useSelector((state: IStateType) => state.account);
    const [isShow, setShow] = useState(false);
    const [switchingTenant, setSwitchingTenant] = useState<string | null>(null);
    const fetchedTenantsRef = useRef(false);
    const baseApiUrl: string = appVirtualPath;

    // When user opens profile dropdown and tenants are missing, get list from token (getuserdetails)
    useEffect(() => {
        if (!isShow || !account.isAuthenticated || fetchedTenantsRef.current) return;
        const hasTenants = account.tenants && account.tenants.length > 0;
        const hasCurrentTenant = !!account.currentTenant;
        if (hasTenants || hasCurrentTenant) return;

        fetchedTenantsRef.current = true;
        const url = `${baseApiUrl}/account/getuserdetails`;
        ApiHelper.getApiResponse(url, HttpMethod.Get, (jsonResponse: any) => {
            const u = jsonResponse as IAuthenticatedUser;
            const fullGroupsArr = u.fullGroups ?? (Array.isArray((u as any).groups) ? (u as any).groups : []);
            const groupsStr = typeof u.groups === "string" ? u.groups : fullGroupsArr.join(",");
            const groupIdsArr = u.groupIds ?? (Array.isArray((u as any).groupIds) ? (u as any).groupIds : []);
            const next: IAccount = {
                ...account,
                email: u.email ?? account.email,
                name: u.name ?? account.name,
                picture: u.picture ?? account.picture,
                tenants: u.tenants ?? (u.groupId ? [u.groupId] : []),
                currentTenant: u.currentTenant ?? u.groupId ?? account.currentTenant,
            };
            dispatch(login(next) as any);
        }, dispatch, "Failed to get user details.", "", false);
    }, [isShow, account.isAuthenticated, account.tenants, account.currentTenant, baseApiUrl, dispatch, account.email, account.name, account.picture]);
    const logoutHref = `${baseApiUrl}/account/logout`;

    async function handleSwitchTenant(tenant: string): Promise<void> {
        if (!tenant || tenant === account.currentTenant || switchingTenant !== null) {
            return;
        }

        try {
            setSwitchingTenant(tenant);
            const refreshToken = localStorage.getItem("refreshToken");
            
            if (!refreshToken) {
                console.error("RefreshToken not found in localStorage");
                return;
            }

            const response = await fetch(`${baseApiUrl}/switch-context`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ 
                    RefreshToken: refreshToken,
                    ActiveTenant: tenant
                }),
            });

            if (response.ok) {
                const data = await response.json();
                
                // Update localStorage with new tokens
                localStorage.setItem("accessToken", data.accessToken);
                if (data.refreshToken) {
                    localStorage.setItem("refreshToken", data.refreshToken);
                }
                
                // Update Redux state with new currentTenant
                const updatedAccount: IAccount = {
                    ...account,
                    currentTenant: tenant
                };
                dispatch(login(updatedAccount) as any);

                // Reload page to update state
                window.location.reload();
            } else {
                const errorText = await response.text();
                console.error(`Failed to switch tenant: ${response.statusText}`);
                console.error("handleSwitchTenant: Error response:", errorText);
            }
        } catch (error) {
            console.error("Error switching tenant:", error);
        } finally {
            setSwitchingTenant(null);
        }
    }

    function getUserImage(): JSX.Element {
        if (account.picture) {
            return (
                <Fragment>
                    <img className="account-icon user-image" title={account.name} alt={account.name} src={account.picture} />
                </Fragment>
            );
        }

        return (
            <Fragment>
                <i className="fa fa-user account-icon" title={account.name} aria-hidden="true"></i>
            </Fragment>
        );
    }

    function toggleNavigation(event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) {
        event.preventDefault();
        setShow(!isShow);
    }

    function getContent(): JSX.Element | null {
        if (!account.isAuthenticationEnabled) {
            return null;
        }

        const hasTenants = account.tenants && account.tenants.length > 0;

        return (
            <li className="nav-item dropdown no-arrow top-menu">
                <a
                    className="nav-link dropdown-toggle"
                    onClick={toggleNavigation}
                    href="#"
                    id="userDropdown"
                    role="button"
                    data-toggle="dropdown"
                    aria-haspopup="true"
                    aria-expanded={isShow ? "true" : "false"}
                >
                    <span className="mr-2 d-none d-lg-inline small">{account.name}</span>
                    {getUserImage()}
                </a>

                <div className={`dropdown-menu dropdown-menu-right shadow animated--grow-in ${(isShow) ? "show" : ""}`} aria-labelledby="userDropdown">
                    <div className="dropdown-item">{account.name}</div>
                    <div className="dropdown-item">{account.email}</div>
                    {(account.tenants && account.tenants.length > 0) || account.currentTenant ? (
                        <>
                            <div className="dropdown-divider"></div>
                            <div className="dropdown-item text-muted small font-weight-bold">Tenants</div>
                            {(account.tenants && account.tenants.length > 0 ? account.tenants : [account.currentTenant!]).map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    className={`dropdown-item small text-left ${t === account.currentTenant ? "font-weight-bold" : ""}`}
                                    onClick={() => { void handleSwitchTenant(t); }}
                                    disabled={t === account.currentTenant || switchingTenant !== null}
                                >
                                    {t}
                                    {t === account.currentTenant ? " (current)" : ""}
                                    {switchingTenant === t ? " (switching...)" : ""}
                                </button>
                            ))}
                        </>
                    ) : null}
                    <div className="dropdown-divider"></div>
                    <a
                        className="dropdown-item"
                        href={logoutHref}
                        data-toggle="modal"
                        data-target="#logoutModal"
                        onClick={() => {
                            ["accessToken", "refreshToken", "timestamp", "token_type", "expires_in", "refresh_expires_in", "session_state", "scope", "not_before_policy"].forEach(k => localStorage.removeItem(k));
                        }}
                    >
                        <i className="fas fa-sign-out-alt fa-sm fa-fw mr-2 text-gray-400"></i>
                        Logout
                    </a>
                </div>
            </li>
        );
    }

    return (
        <Fragment>
            {getContent()}
        </Fragment>
    );
};

export default TopMenuAccount;