import Button from "react-bootstrap/Button";
import React, { useCallback, useEffect, useState, Dispatch } from "react";
import Select from "react-select";
import { IAdminSettingsState } from "../../store/models/adminsettingsstate.interface";
import { useDispatch, useSelector } from "react-redux";
import { IStateType } from "../../store/models/root.interface";
import {
    retrieveUserPermission,
    getUserPermissionUpdate,
    updateUserPermission,
    retrieveGetPermissionScreen,
} from "../../store/actions/userpermission.action";
import {
    IUserPermissionState,
    UserPermission as IUserPermission,
} from "../../store/models/userpermission.interface";
import { UserPermissionEnum } from "../../store/models/queryruletype";
import {
    IUserGroupsState,
    UserGroups as IUserGroup,
    UserGroups,
} from "../../store/models/usergroups.interface";
import { retrieveUserGroups } from "../../store/actions/usergroups.action";
import UserPermissionScreen from "./UserPermissionScreen";
import { normalizeAdminApiUrl } from "../../store/actions/adminsettings.actions";

export interface UserPermission {
    id: string;
    name: string;
    view: Array<string>;
    edit: Array<string>;
    delete: Array<string>;
}

const UserPermission: React.FC = () => {
    const adminSettingsState: IAdminSettingsState = useSelector(
        (state: IStateType) => state.adminSettingsState
    );
    const userGroupsState: IUserGroupsState = useSelector(
        (state: IStateType) => state.userGroupsState
    );
    const dispatch: Dispatch<any> = useDispatch();
    const userPermissionState: IUserPermissionState = useSelector(
        (state: IStateType) => state.permissionState
    );
    const [userPermissionModalShow, setUserPermissionModalShow] = useState(false);
    const [titleEdit, setTitle] = useState("");
    const [listUserPermission, setListUserPermission] = useState<
        Array<UserPermission>
    >([]);
    interface IsEnabled {
        isEnabled: boolean;
    }
    interface ShowAdminSidebar {
        featuredContent: IsEnabled;
        boostsAndBlocks: IsEnabled;
        synonym: IsEnabled;
        fastLinks: IsEnabled;
        navigation: IsEnabled;
        controlPanelDeleteUrl: IsEnabled;
        controlPanelUserPermission: IsEnabled;
        controlPanelUserGroups: IsEnabled;
        controlPanelNavigationSetting: IsEnabled;
        contentEnhancement: IsEnabled;
        searchSuggestion: IsEnabled;
    }
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
        searchSuggestion: { isEnabled: false }
    };
    const [showAdminSidebar, setShowAdminSidebar] =
        useState(showAdminSidebarData);
    const [handleViewUserPermission, setHandleViewUserPermission] =
        useState(false);
    const [handleEditUserPermission, setHandleEditUserPermission] =
        useState(false);
    const [handleDeleteUserPermission, setHandleDeleteUserPermission] =
        useState(false);
    const [state, setState] = useState({
        Featured: {
            view: [],
            edit: [],
            delete: [],
        },
        Boost: {
            view: [],
            edit: [],
            delete: [],
        },
        Synonym: {
            view: [],
            edit: [],
            delete: [],
        },
        FastLinks: {
            view: [],
            edit: [],
            delete: [],
        },
        Navigation: {
            view: [],
            edit: [],
            delete: [],
        },
        SearchSuggestion: {
            view: [],
            edit: [],
            delete: [],
        },
        ContentEnhancement: {
            view: [],
            edit: [],
            delete: [],
        },
        ControlPanelDeleteUrl: {
            view: [],
            edit: [],
            delete: [],
        },
        ControlPanelUserPermission: {
            view: [],
            edit: [],
            delete: [],
        },
        ControlPanelUserGroups: {
            view: [],
            edit: [],
            delete: [],
        },
        ControlPanelNavigationSetting: {
            view: [],
            edit: [],
            delete: [],
        }
    });

    const [options, setOptions] = useState([
        {
            value: "",
            label: "",
        },
    ]);

    const [value, setValue] = useState([
        {
            value: "",
            label: "",
        },
    ]);

    useEffect(() => {
        let baseApiUrl = adminSettingsState.adminSettings.searchAdminApiUrl;
        if (baseApiUrl?.length > 0) {
            handleGetUserPermission();
            handleGetUserGroups();
        }
    }, []);

    useEffect(() => {
        let showAdminSidebar = adminSettingsState.adminSettings.showAdminSidebar;

        if (showAdminSidebar) {
            setShowAdminSidebar(showAdminSidebar);
        }
    }, [adminSettingsState.adminSettings.showAdminSidebar]);

    useEffect(() => {
        if (userGroupsState.groups && adminSettingsState.adminSettings.userPermissionEnabled) {
            handleGetScreenPermissions(userGroupsState.groups);
        }
    }, [userGroupsState.groups]);

    const handleGetUserPermission = () => {
        dispatch(retrieveUserPermission(getAdminApiBaseUrl()));
    };

    const handleGetUserGroups = (search = "") => {
        const data = { query: search };
        dispatch(retrieveUserGroups(getAdminApiBaseUrl(), data));
    };

    useEffect(() => {
        if (
            (listUserPermission && listUserPermission.length == 0) ||
            !listUserPermission
        ) {
            const enabledPermissions = Object.keys(showAdminSidebar).filter(
              (key) => showAdminSidebar[key as keyof ShowAdminSidebar].isEnabled === true
            ).map(key => key.toLowerCase()); // Convert the keys to lowercase

            // Adjust the special case mappings for 'boost' and 'feature'
            const permissionMappings: { [key: string]: string } = {
              boost: "boostsandblocks",
              feature: "featuredcontent",
            };
            const list = userPermissionState?.permissionList?.result?.filter((qr) => {
                const permissionNameLowerCase = qr.name.toLowerCase();
                return enabledPermissions.includes(permissionMappings[permissionNameLowerCase]) || enabledPermissions.includes(permissionNameLowerCase);
              });
            setListUserPermission(list);
            setState({
                Featured: {
                    view: list?.find((item) => item.name == "Feature")?.view as never[],
                    delete: list?.find((item) => item.name == "Feature")
                        ?.delete as never[],
                    edit: list?.find((item) => item.name == "Feature")?.edit as never[],
                },
                Boost: {
                    view: list?.find((item) => item.name == "Boost")?.view as never[],
                    delete: list?.find((item) => item.name == "Boost")?.delete as never[],
                    edit: list?.find((item) => item.name == "Boost")?.edit as never[],
                },
                Synonym: {
                    view: list?.find((item) => item.name == "Synonym")?.view as never[],
                    delete: list?.find((item) => item.name == "Synonym")
                        ?.delete as never[],
                    edit: list?.find((item) => item.name == "Synonym")?.edit as never[],
                },
                FastLinks: {
                    view: list?.find((item) => item.name == "FastLinks")?.view as never[],
                    delete: list?.find((item) => item.name == "FastLinks")
                        ?.delete as never[],
                    edit: list?.find((item) => item.name == "FastLinks")?.edit as never[],
                },
                Navigation: {
                    view: list?.find((item) => item.name == "Navigation")
                        ?.view as never[],
                    delete: list?.find((item) => item.name == "Navigation")
                        ?.delete as never[],
                    edit: list?.find((item) => item.name == "Navigation")
                        ?.edit as never[],
                },
                SearchSuggestion: {
                    view: list?.find((item) => item.name == "SearchSuggestion")
                        ?.view as never[],
                    delete: list?.find((item) => item.name == "SearchSuggestion")
                        ?.delete as never[],
                    edit: list?.find((item) => item.name == "SearchSuggestion")
                        ?.edit as never[],
                },
                ContentEnhancement: {
                    view: list?.find((item) => item.name == "ContentEnhancement")
                        ?.view as never[],
                    delete: list?.find((item) => item.name == "ContentEnhancement")
                        ?.delete as never[],
                    edit: list?.find((item) => item.name == "ContentEnhancement")
                        ?.edit as never[],
                },
                ControlPanelDeleteUrl: {
                    view: list?.find((item) => item.name == "ControlPanelDeleteUrl")
                        ?.view as never[],
                    delete: list?.find((item) => item.name == "ControlPanelDeleteUrl")
                        ?.delete as never[],
                    edit: list?.find((item) => item.name == "ControlPanelDeleteUrl")
                        ?.edit as never[],
                },
                ControlPanelUserPermission: {
                    view: list?.find((item) => item.name == "ControlPanelUserPermission")
                        ?.view as never[],
                    delete: list?.find(
                        (item) => item.name == "ControlPanelUserPermission"
                    )?.delete as never[],
                    edit: list?.find((item) => item.name == "ControlPanelUserPermission")
                        ?.edit as never[],
                },
                ControlPanelUserGroups: {
                    view: list?.find((item) => item.name == "ControlPanelUserGroups")
                        ?.view as never[],
                    delete: list?.find((item) => item.name == "ControlPanelUserGroups")
                        ?.delete as never[],
                    edit: list?.find((item) => item.name == "ControlPanelUserGroups")
                        ?.edit as never[],
                },
                ControlPanelNavigationSetting: {
                    view: list?.find((item) => item.name == "ControlPanelNavigationSetting")
                        ?.view as never[],
                    delete: list?.find((item) => item.name == "ControlPanelNavigationSetting")
                        ?.delete as never[],
                    edit: list?.find((item) => item.name == "ControlPanelNavigationSetting")
                        ?.edit as never[],
                },
            });
        }
    }, [userPermissionState?.permissionList?.result]);

    useEffect(() => {
        if (
            userPermissionState?.getUserPermissionScreen?.result?.name ==
            "ControlPanelUserPermission"
        ) {
            setHandleViewUserPermission(
                userPermissionState?.getUserPermissionScreen?.result?.view ||
                userPermissionState?.getUserPermissionScreen?.result?.edit ||
                userPermissionState?.getUserPermissionScreen?.result?.delete
            );
            setHandleEditUserPermission(
                userPermissionState?.getUserPermissionScreen?.result?.edit &&
                userPermissionState?.getUserPermissionScreen?.result?.view
            );
            setHandleDeleteUserPermission(
                userPermissionState?.getUserPermissionScreen?.result?.delete &&
                userPermissionState?.getUserPermissionScreen?.result?.view
            );
        }
    }, [userPermissionState?.getUserPermissionScreen?.result]);

    useEffect(() => {
        setOptions(
            userGroupsState?.userGroupsList?.result?.map((userGroup: IUserGroup) => {
                return { value: userGroup.groupName, label: userGroup.groupName };
            })
        );
    }, [userGroupsState?.userGroupsList?.result]);

    const getAdminApiBaseUrl = useCallback((): string => {
        return normalizeAdminApiUrl(adminSettingsState.adminSettings.searchAdminApiUrl);
    }, [adminSettingsState.adminSettings]);

    const handleCreateUserPermission = () => {
        let data: Array<UserPermission> = [];
        listUserPermission?.map((item) => {
            if (item.name == "Feature") {
                data.push({
                    id: item.id,
                    name: item.name,
                    view: state.Featured.view,
                    edit: state.Featured.edit,
                    delete: state.Featured.delete,
                });
            }
            if (item.name == "Boost") {
                data.push({
                    id: item.id,
                    name: item.name,
                    view: state.Boost.view,
                    edit: state.Boost.edit,
                    delete: state.Boost.delete,
                });
            }
            if (item.name == "Synonym") {
                data.push({
                    id: item.id,
                    name: item.name,
                    view: state.Synonym.view,
                    edit: state.Synonym.edit,
                    delete: state.Synonym.delete,
                });
            }
            if (item.name == "FastLinks") {
                data.push({
                    id: item.id,
                    name: item.name,
                    view: state.FastLinks.view,
                    edit: state.FastLinks.edit,
                    delete: state.FastLinks.delete,
                });
            }
            if (item.name == "Navigation") {
                data.push({
                    id: item.id,
                    name: item.name,
                    view: state.Navigation.view,
                    edit: state.Navigation.edit,
                    delete: state.Navigation.delete,
                });
            }
            if (item.name == "SearchSuggestion") {
                data.push({
                    id: item.id,
                    name: item.name,
                    view: state.SearchSuggestion.view,
                    edit: state.SearchSuggestion.edit,
                    delete: state.SearchSuggestion.delete,
                });
            }
            if (item.name == "ContentEnhancement") {
                data.push({
                    id: item.id,
                    name: item.name,
                    view: state.ContentEnhancement.view,
                    edit: state.ContentEnhancement.edit,
                    delete: state.ContentEnhancement.delete,
                });
            }
            if (item.name == "ControlPanelDeleteUrl") {
                data.push({
                    id: item.id,
                    name: item.name,
                    view: state.ControlPanelDeleteUrl.view,
                    edit: state.ControlPanelDeleteUrl.edit,
                    delete: state.ControlPanelDeleteUrl.delete,
                });
            }
            if (item.name == "ControlPanelUserPermission") {
                data.push({
                    id: item.id,
                    name: item.name,
                    view: state.ControlPanelUserPermission.view,
                    edit: state.ControlPanelUserPermission.edit,
                    delete: state.ControlPanelUserPermission.delete,
                });
            }
            if (item.name == "ControlPanelUserGroups") {
                data.push({
                    id: item.id,
                    name: item.name,
                    view: state.ControlPanelUserGroups.view,
                    edit: state.ControlPanelUserGroups.edit,
                    delete: state.ControlPanelUserGroups.delete,
                });
            }
            if (item.name == "ControlPanelNavigationSetting") {
                data.push({
                    id: item.id,
                    name: item.name,
                    view: state.ControlPanelNavigationSetting.view,
                    edit: state.ControlPanelNavigationSetting.edit,
                    delete: state.ControlPanelNavigationSetting.delete,
                });
            }
        });
        dispatch(updateUserPermission(getAdminApiBaseUrl(), data));
    };

    function handleGetScreenPermissions(group: string) {
        const data = { groupMemberShipClaims: group };
        dispatch(
            retrieveGetPermissionScreen(
                getAdminApiBaseUrl(),
                UserPermissionEnum.ControlPanelUserPermission,
                data
            )
        );
    }

    return (
        <>
            {handleEditUserPermission && (
                <div className="save-permission">
                    <Button
                        className="btn-modal-synonym"
                        variant="primary"
                        onClick={handleCreateUserPermission}
                    >
                        Save
                    </Button>
                </div>
            )}
            <div className="d-flex p-2 listUserPermission">
                {handleViewUserPermission ? (
                    listUserPermission?.map(
                        (permission: IUserPermission, index: number) => (
                            <UserPermissionScreen
                                index={index}
                                permission={permission}
                                options={options}
                                stateChanger={setState}
                                handleEditUserPermission={handleEditUserPermission}
                            />
                        )
                    )
                ) : (
                    <div className="p-4">
                        You do not have the permission to view Group Permission Information
                    </div>
                )}
            </div>
        </>
    );
};

export default UserPermission;
