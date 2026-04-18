import React, { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { IAdminSettingsState } from "../../store/models/adminsettingsstate.interface";
import { IAccount } from "../../store/models/account.interface";
import { useSelector } from "react-redux";
import { IStateType } from "../../store/models/root.interface";
interface ShowAdminSidebar {
    featuredContent: IsEnabled;
    boostsAndBlocks: IsEnabled;
    synonym: IsEnabled;
    fastLinks: IsEnabled;
    navigation: IsEnabled;
    controlPanelDeleteUrl: IsEnabled;
    controlPanelUserPermission: IsEnabled;
    controlPanelUserGroups: IsEnabled;
    contentEnhancement: IsEnabled;
    controlPanelNavigationSetting: IsEnabled;
    searchSuggestion: IsEnabled;
    customerBilling: IsEnabled;
}

interface IsEnabled {
    isEnabled: boolean;
}

const LeftMenu: React.FC = () => {
    const [openMenu, setOpenMenu] = useState(false);
    const showAdminSidebarData: ShowAdminSidebar = {
        featuredContent: { isEnabled: false },
        boostsAndBlocks: { isEnabled: false },
        synonym: { isEnabled: false },
        fastLinks: { isEnabled: false },
        navigation: { isEnabled: false },
        controlPanelDeleteUrl: { isEnabled: false },
        controlPanelUserPermission: { isEnabled: false },
        controlPanelUserGroups: { isEnabled: false },
        controlPanelNavigationSetting: { isEnabled: false },
        contentEnhancement: { isEnabled: false },
        searchSuggestion: { isEnabled: false },
        customerBilling: { isEnabled: false }
    };
    const [isMaxLengthVisible, setIsMaxLengthVisible] = useState(false);
    const [showAdminSidebar, setShowAdminSidebar] =
        useState(showAdminSidebarData);
    const adminSettingsState: IAdminSettingsState = useSelector(
        (state: IStateType) => state.adminSettingsState
    );
    const account: IAccount = useSelector((state: IStateType) => state.account);
    const canManageUsers = !account.isAuthenticationEnabled
        || account.fullGroups.includes("org-admin")
        || account.fullGroups.includes("admin");

    let [leftMenuVisibility, setLeftMenuVisibility] = useState(false);

    useEffect(() => {
        const isMaxLengthSettingEnabled = adminSettingsState?.adminSettings?.navigationSettingEnabled;

        if (isMaxLengthSettingEnabled === true)
            setIsMaxLengthVisible(true);

        let showAdminSidebar = adminSettingsState.adminSettings.showAdminSidebar;

        if (showAdminSidebar) {
            setShowAdminSidebar(showAdminSidebar);
        }
    }, [adminSettingsState.adminSettings.showAdminSidebar]);

    function changeLeftMenuVisibility() {
        setLeftMenuVisibility(!leftMenuVisibility);
    }

    function getCollapseClass() {
        return leftMenuVisibility ? "" : "collapsed";
    }

    return (
        <Fragment>
            <div className="toggle-area">
                <button
                    className="btn btn-primary toggle-button"
                    onClick={() => changeLeftMenuVisibility()}
                >
                    <i className="fas fa-bars"></i>
                </button>
            </div>

            <ul
                className={`navbar-nav sidebar sidebar-dark accordion ${getCollapseClass()}`}
                id="collapseMenu"
            >
                <Link
                    className="brand sidebar-brand d-flex align-items-center justify-content-center"
                    to="Home"
                >
                    <div className="account-icon">
                        <div className="sidebar-brand-icon"></div>
                    </div>
                    <div className="sidebar-brand-text mx-3">OSP Admin</div>
                </Link>

                <hr className="sidebar-divider my-0" />

                <li className="nav-item active">
                    <Link className="nav-link" to="Home">
                        <i className="fas fa-fw fa-tachometer-alt"></i>
                        <span>Dashboard</span>
                    </Link>
                </li>

                {canManageUsers && (
                    <li className="nav-item">
                        <Link className="nav-link" to="/users">
                            <i className="fas fa-fw fa-users"></i>
                            <span>Users</span>
                        </Link>
                    </li>
                )}

                <hr className="sidebar-divider" />

                {showAdminSidebar?.featuredContent?.isEnabled == true && (
                    <li className="nav-item">
                        <Link className="nav-link" to={`/feature`}>
                            <i className="fas fa-fw fa-newspaper"></i>
                            <span>Featured Content</span>
                        </Link>
                    </li>
                )}

                {showAdminSidebar?.boostsAndBlocks?.isEnabled == true && (
                    <li className="nav-item">
                        <Link className="nav-link" to={`/boost`}>
                            <i className="fas fa-fw fa-arrow-circle-up"></i>
                            <span>Boosts and Blocks</span>
                        </Link>
                    </li>
                )}

                {showAdminSidebar?.synonym?.isEnabled == true && (
                    <li className="nav-item">
                        <Link className="nav-link" to={`/synonym`}>
                            <i className="fas fa-fw fa-arrow-circle-up"></i>
                            <span>Synonym</span>
                        </Link>
                    </li>
                )}

                {showAdminSidebar?.fastLinks?.isEnabled == true && (
                    <li className="nav-item">
                        <Link className="nav-link" to={`/fast-links`}>
                            <i className="fas fa-fw fa-arrow-circle-up"></i>
                            <span>Fast Links</span>
                        </Link>
                    </li>
                )}

                {showAdminSidebar?.navigation?.isEnabled == true && (
                    <li className="nav-item">
                        <Link className="nav-link" to={`/navigation`}>
                            <i className="fas fa-fw fa-arrow-circle-up"></i>
                            <span>Navigation</span>
                        </Link>
                    </li>
                )}

                {showAdminSidebar?.contentEnhancement?.isEnabled == true && (
                    <li className="nav-item">
                        <Link className="nav-link" to={`/content-enhancement`}>
                            <i className="fas fa-fw fa-arrow-circle-up"></i>
                            <span>Content Enhancement</span>
                        </Link>
                    </li>
                )}

                {showAdminSidebar?.searchSuggestion?.isEnabled == true && (
                    <li className="nav-item">
                        <Link className="nav-link" to={`/suggestion`}>
                            <i className="fas fa-fw fa-arrow-circle-up"></i>
                            <span>Search Suggestion</span>
                        </Link>
                    </li>
                )}

                {showAdminSidebar?.customerBilling?.isEnabled == true && (
                    <li className="nav-item">
                        <Link className="nav-link" to="/customer-billing">
                            <i className="fas fa-fw fa-arrow-circle-up"></i>
                            <span>Customer Billing</span>
                        </Link>
                    </li>
                )}

                {showAdminSidebar?.controlPanelDeleteUrl?.isEnabled == false &&
                    showAdminSidebar?.controlPanelUserPermission?.isEnabled == false &&
                    showAdminSidebar?.controlPanelNavigationSetting?.isEnabled == false &&
                    showAdminSidebar?.controlPanelUserGroups?.isEnabled == false ? (
                    ""
                ) : (
                    <li className="nav-item subMenu">
                        <div className="nav-link" onClick={() => setOpenMenu(!openMenu)}>
                            <i className="fas fa-fw fa-arrow-circle-up"></i>
                            <span>Control Panel</span>
                        </div>
                        {showAdminSidebar?.controlPanelDeleteUrl?.isEnabled == true && (
                            <Link
                                className={`subMenu-item nav-link  ${openMenu && "d-block"}`}
                                to={`/control-panel`}
                            >
                                Delete URL
                            </Link>
                        )}
                        {showAdminSidebar?.controlPanelUserGroups?.isEnabled == true && adminSettingsState.adminSettings.userPermissionEnabled && (
                            <Link
                                className={`subMenu-item nav-link  ${openMenu && "d-block"}`}
                                to={`/user-group`}
                            >
                                User Groups
                            </Link>
                        )}
                        {showAdminSidebar?.controlPanelUserPermission?.isEnabled == true && adminSettingsState.adminSettings.userPermissionEnabled && (
                            <Link
                                className={`subMenu-item nav-link  ${openMenu && "d-block"}`}
                                to={`/user-permission`}
                            >
                                Group Permission
                            </Link>
                        )}
                        {showAdminSidebar?.controlPanelNavigationSetting?.isEnabled == true && (
                        <Link
                            className={`subMenu-item nav-link  ${openMenu && "d-block"}`}
                            to={`/setting`}
                        >
                            Setting
                        </Link>
                        )}
                    </li>
                )}

                <hr className="sidebar-divider d-none d-md-block" />
            </ul>
        </Fragment>
    );
};

export default LeftMenu;
