import * as _ from "lodash";
import Button from "react-bootstrap/Button";
import React, { useCallback, useEffect, useState, Dispatch } from "react";
import { IAdminSettingsState } from "../../store/models/adminsettingsstate.interface";
import { useDispatch, useSelector } from "react-redux";
import { IStateType } from "../../store/models/root.interface";
import {
    INavigationState,
    Navigation as INavigation,
} from "../../store/models/navigation";
import NavigationModal from "./NavigationModal";
import {
    deleteNavigation,
    getNavigationUpdate,
    retrieveNavigation,
} from "../../store/actions/navigation.action";
import ConfirmDeletionModal from "../../common/components/ConfirmDeletionModal";
import { retrieveGetPermissionScreen } from "../../store/actions/userpermission.action";
import { UserPermissionEnum } from "../../store/models/queryruletype";
import { IUserPermissionState } from "../../store/models/userpermission.interface";
import { IUserGroupsState } from "../../store/models/usergroups.interface";
import { normalizeAdminApiUrl } from "../../store/actions/adminsettings.actions";

export interface IListSortState {
    fieldName: string;
    isAscending: boolean;
}

export interface INavigationsListSortState {
    navName: IListSortState;
    navLink: IListSortState;
    navDescription: IListSortState;
    linkType: IListSortState;
    profile: IListSortState;
    accessibilityTitle: IListSortState;
    accessibilityDescription: IListSortState;
}

const Navigation: React.FC = () => {
    const adminSettingsState: IAdminSettingsState = useSelector(
        (state: IStateType) => state.adminSettingsState
    );
    const navigationState: INavigationState = useSelector(
        (state: IStateType) => state.navigationState
    );
    const userPermissionState: IUserPermissionState = useSelector(
        (state: IStateType) => state.permissionState
    );
    const userGroupsState: IUserGroupsState = useSelector(
        (state: IStateType) => state.userGroupsState
    );

    const [navigationModalShow, setNavigationModalShow] = useState(false);
    const dispatch: Dispatch<any> = useDispatch();
    let initialNavigationsListSortState: INavigationsListSortState = {
        navName: { fieldName: "navName", isAscending: false },
        navLink: { fieldName: "navLink", isAscending: false },
        navDescription: { fieldName: "navDescription", isAscending: false },
        linkType: { fieldName: "linkType", isAscending: false },
        profile: { fieldName: "profile", isAscending: false },
        accessibilityTitle: { fieldName: "accessibilityTitle", isAscending: false },
        accessibilityDescription: { fieldName: "accessibilityDescription", isAscending: false },
    };
    let [navigationsListSortState, setNavigationsListSortState] =
        useState<INavigationsListSortState>(initialNavigationsListSortState);
    const [iDNavigation, setIdNavigation] = useState("");
    const [nameNavigation, setNameNavigation] = useState("");
    const isMobileNavigationEnabled = adminSettingsState.adminSettings?.mobileNavigationEnabled;
    const [handleViewNavigation, setHandleViewNavigation] = useState(false);
    const [handleEditNavigation, setHandleEditNavigation] = useState(false);
    const [handleDeleteNavigation, setHandleDeleteNavigation] = useState(false);
    const [permissionsChecked, setPermissionsChecked] = useState(false);
    const isAccessibilityNavigationEnabled = adminSettingsState.adminSettings?.accessibilityNavigationEnabled;
    // Delete Modal.
    const [deleteConfirmationModalShow, setDeleteConfirmationModalShow] =
        useState(false);

    useEffect(() => {
        if (permissionsChecked && handleViewNavigation) {
            let baseApiUrl = adminSettingsState.adminSettings?.searchAdminApiUrl;
            // Fallback to /adminui if searchAdminApiUrl is empty or not set
            if (!baseApiUrl || baseApiUrl.trim().length === 0) {
                baseApiUrl = "/adminui";
            }
            if (baseApiUrl?.length > 0) {
                handleGetNavigation();
            }
        }
    }, [permissionsChecked, handleViewNavigation]);


    useEffect(() => {
        if (userGroupsState.groups && adminSettingsState.adminSettings.userPermissionEnabled) {
            handleGetScreenPermissions(userGroupsState.groups);
        }
    }, [userGroupsState.groups]);
    useEffect(() => {
        if (
            userPermissionState?.getUserPermissionScreen?.result?.name == "Navigation" && adminSettingsState.adminSettings.userPermissionEnabled
        ) {
            setHandleViewNavigation(
                userPermissionState?.getUserPermissionScreen?.result?.view ||
                userPermissionState?.getUserPermissionScreen?.result?.edit ||
                userPermissionState?.getUserPermissionScreen?.result?.delete
            );
            setHandleEditNavigation(
                userPermissionState?.getUserPermissionScreen?.result?.edit &&
                userPermissionState?.getUserPermissionScreen?.result?.view
            );
            setHandleDeleteNavigation(
                userPermissionState?.getUserPermissionScreen?.result?.delete &&
                userPermissionState?.getUserPermissionScreen?.result?.view
            );
            setPermissionsChecked(true);
        }
        else if (!adminSettingsState.adminSettings.userPermissionEnabled) {
            setHandleViewNavigation(true);
            setHandleEditNavigation(true);
            setHandleDeleteNavigation(true);
            setPermissionsChecked(true);
        }
    }, [userPermissionState?.getUserPermissionScreen?.result, adminSettingsState.adminSettings.userPermissionEnabled]);

    const handleGetNavigation = (search = "all", profile?: string) => {
        // Use current profile from state if not provided
        const currentProfile = profile !== undefined ? profile : navigationState.currentProfile || "";

        const data = {
            query: search,
            profile: currentProfile
        };
        dispatch(retrieveNavigation(getAdminApiBaseUrl(), data));
    };

    function sortNavigations(listSortState: IListSortState): void {
        // Toggle the sort.
        let isAscending: boolean = !listSortState.isAscending;

        // Save it in state.
        setNavigationsListSortState({
            ...navigationsListSortState,
            [listSortState.fieldName]: {
                fieldName: listSortState.fieldName,
                isAscending: !listSortState.isAscending,
            },
        });

        let sortedNavigations: INavigation[] = navigationState.navigationList.body?.result;

        let sortType: boolean | "asc" | "desc" = isAscending ? "asc" : "desc";
        sortedNavigations = _.orderBy(
            sortedNavigations,
            [(navigation) => (navigation[listSortState.fieldName as keyof INavigation] as string)?.toLowerCase()],
            [sortType]
        );

        navigationState.navigationList.body.result = sortedNavigations;

    }

    function deleteNavigationAction(id: any, name: any) {
        console.log("deleteNavigationAction called", { id, name, handleDeleteNavigation });
        if (handleDeleteNavigation) {
            console.log("Setting delete confirmation modal to show");
            setDeleteConfirmationModalShow(true);
            setIdNavigation(id);
            setNameNavigation(name);
        }
    }

    function handleGetNavigationToUpdate(navigation: INavigation) {
        if (handleEditNavigation) {
            dispatch(getNavigationUpdate(navigation));
            setNavigationModalShow(true);
        }
    }

    // Delete confirmation modal.
    function onCancelDeleteConfirmationModal(): void {
        setDeleteConfirmationModalShow(false);
        setIdNavigation("");
        setNameNavigation("");
    }

    async function onConfirmQueryRuleDeletion(): Promise<void> {
        if (localStorage !== null) {
            for (const [key, itemString] of Object.entries(localStorage)) {
                try {
                    const item = JSON.parse(itemString);
                    if (item.navName === nameNavigation) {
                        localStorage.removeItem(key)
                    }
                } catch (e) { }

            }
        }
        await dispatch(deleteNavigation(getAdminApiBaseUrl(), iDNavigation, nameNavigation));
        var localCount = navigationState.navigationCount
        let countNavigation = localStorage.getItem('CountNavigation');
        if (countNavigation === null) {
            localCount--;
            countNavigation = localCount.toString();
            localStorage.setItem('CountNavigation', countNavigation);
        }
        else {
            countNavigation = (parseInt(countNavigation) - 1).toString();
            localStorage.setItem('CountNavigation', countNavigation);
        }
        setDeleteConfirmationModalShow(false);
        setIdNavigation("");
        setNameNavigation("");
        
        // Reload with current page, but if current page becomes empty, go to previous page
        const currentPage = navigationState.currentPage || 1;
        const currentProfile = navigationState.currentProfile || "";
        const resultsCount = (navigationState.navigationCount || 0) - 1; // After deletion
        const pageSize = 10;
        const totalPages = Math.ceil(resultsCount / pageSize);
        
        // Reload navigation data after deletion
        handleGetNavigation("all", currentProfile);
    }
    function handleGetScreenPermissions(group: string) {
        const data = { groupMemberShipClaims: group };
        dispatch(
            retrieveGetPermissionScreen(
                getAdminApiBaseUrl(),
                UserPermissionEnum.Navigation,
                data
            )
        );
    }

    const getAdminApiBaseUrl = useCallback((): string => {
        return normalizeAdminApiUrl(adminSettingsState.adminSettings?.searchAdminApiUrl);
    }, [adminSettingsState.adminSettings]);

    function FastLinkData(): JSX.Element {
        return (
            /*          className = "table-controlpain"*/
            <tbody>
                {permissionsChecked && handleViewNavigation ? (
                    navigationState?.navigationList?.body?.result
                        ?.filter((navigator: INavigation) => {
                            // Filter out empty/invalid navigation items
                            // Only show items that have at least navName or navLink
                            return navigator && (navigator.navName || navigator.navLink);
                        })
                        ?.map(
                            (navigator: INavigation, index: number) => {
                                // Ensure ID exists and is valid
                                const navId = navigator?.id && navigator.id !== "undefined" && String(navigator.id).trim() !== "" 
                                    ? String(navigator.id) 
                                    : null;
                                const hasValidId = navId !== null;
                                
                                return (
                                <tr 
                                    key={navId || `nav-${index}`} 
                                    onClick={(e) => {
                                        // Don't trigger edit if clicking on action column
                                        if (e.target && (e.target as HTMLElement).closest('.action-button-column')) {
                                            console.log("Click on action column, ignoring row click");
                                            return;
                                        }
                                        if (handleEditNavigation) {
                                            handleGetNavigationToUpdate(navigator);
                                        }
                                    }}
                                >
                                    <td>
                                        {navigator.navName || ""}
                                    </td>
                                    <td>
                                        {navigator.navLink || ""}
                                    </td>
                                    <td>
                                        {navigator.navDescription || ""}
                                    </td>
                                    {isMobileNavigationEnabled && (
                                        <>
                                            <td>
                                                {navigator.linkType || ""}
                                            </td>
                                            <td>
                                                {navigator.profile || ""}
                                            </td>
                                        </>
                                    )}
                                    {isAccessibilityNavigationEnabled && (
                                        <>
                                            <td>
                                                {navigator.accessibilityTitle || ""}
                                            </td>
                                            <td>
                                                {navigator.accessibilityDescription || ""}
                                            </td>
                                        </>
                                    )}
                                    <td>
                                        {navigator.extensionKeywords?.join(", ") || ""}
                                    </td>
                                    <td onClick={(e) => {
                                        e.stopPropagation();
                                    }}>
                                        <div className="action-button-column text-center" onClick={(e) => {
                                            e.stopPropagation();
                                        }}>
                                            <Button
                                                key={navId || `delete-${index}`}
                                                className="action-link-button link-button"
                                                id={`delete-${navId || index}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    
                                                    if (!handleDeleteNavigation) {
                                                        alert("Delete permission not granted");
                                                        return;
                                                    }
                                                    
                                                    if (hasValidId && navId) {
                                                        deleteNavigationAction(
                                                            navId,
                                                            navigator.navName || ""
                                                        );
                                                    } else {
                                                        alert(`Cannot delete: invalid ID. hasValidId=${hasValidId}, navId=${navId}`);
                                                    }
                                                }}
                                                disabled={!hasValidId || !handleDeleteNavigation}
                                                style={{ 
                                                    cursor: (!hasValidId || !handleDeleteNavigation) ? 'not-allowed' : 'pointer',
                                                    pointerEvents: 'auto',
                                                    opacity: (!hasValidId || !handleDeleteNavigation) ? 0.5 : 1
                                                }}
                                            >
                                                {/* @ts-ignore */}
                                                <i className="fas fa-times-circle"></i>
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                                );
                            }
                        )
                ) : (
                    <div className="p-4">
                        You do not have the permission to view Navigation Information
                    </div>
                )}
            </tbody>
        );
    }

    return (
        <>
            {permissionsChecked ? (
                <div className="table-wrapper">
                    <table className="table">
                        <thead className="thead-dark">
                            <tr>
                                <th scope="col" className="align-middle">
                                    Nav Name
                                    <Button variant="secondary" size="sm" className="sort-button" onClick={() =>
                                        sortNavigations(navigationsListSortState.navName)
                                    }>
                                        {/* @ts-ignore */}
                                        <i className="fas fa-sort"></i>
                                    </Button>
                                </th>
                                <th scope="col" className="align-middle">
                                    Nav Link
                                    <Button variant="secondary" size="sm" className="sort-button" onClick={() =>
                                        sortNavigations(navigationsListSortState.navLink)
                                    }>
                                        {/* @ts-ignore */}
                                        <i className="fas fa-sort"></i>
                                    </Button>
                                </th>
                                <th scope="col" className="align-middle">
                                    Nav Description
                                    <Button variant="secondary" size="sm" className="sort-button" onClick={() =>
                                        sortNavigations(navigationsListSortState.navDescription)
                                    }>
                                        {/* @ts-ignore */}
                                        <i className="fas fa-sort"></i>
                                    </Button>
                                </th>
                                {isMobileNavigationEnabled && (
                                    <>
                                        <th scope="col" className="align-middle">
                                            Link Type
                                            <Button variant="secondary" size="sm" className="sort-button" onClick={() =>
                                                sortNavigations(navigationsListSortState.linkType)
                                            }>
                                                {/* @ts-ignore */}
                                        <i className="fas fa-sort"></i>
                                            </Button>
                                        </th>
                                        <th scope="col" className="align-middle">
                                            Profile
                                            <Button variant="secondary" size="sm" className="sort-button" onClick={() =>
                                                sortNavigations(navigationsListSortState.profile)
                                            }>
                                                {/* @ts-ignore */}
                                        <i className="fas fa-sort"></i>
                                            </Button>
                                        </th>
                                    </>
                                )}
                                {isAccessibilityNavigationEnabled && (
                                    <>
                                        <th scope="col" className="align-middle">
                                            Accessibility Title
                                            <Button variant="secondary" size="sm" className="sort-button" onClick={() =>
                                                sortNavigations(navigationsListSortState.accessibilityTitle)
                                            }>
                                                {/* @ts-ignore */}
                                        <i className="fas fa-sort"></i>
                                            </Button>
                                        </th>
                                        <th scope="col" className="align-middle">
                                            Accessibility Description
                                            <Button variant="secondary" size="sm" className="sort-button" onClick={() =>
                                                sortNavigations(navigationsListSortState.accessibilityDescription)
                                            }>
                                                {/* @ts-ignore */}
                                        <i className="fas fa-sort"></i>
                                            </Button>
                                        </th>
                                    </>
                                )}
                                <th scope="col" className="align-middle">
                                    Extension Keywords
                                </th>
                                {handleDeleteNavigation && (
                                    <th scope="col" className="align-middle">
                                        Action
                                    </th>
                                )}
                            </tr>
                        </thead>
                        {FastLinkData()}
                    </table>

                    {navigationModalShow && (
                        <NavigationModal
                            navigationModalShow={navigationModalShow}
                            title="Edit"
                            setNavigationModalShow={setNavigationModalShow}
                        />
                    )}

                    <ConfirmDeletionModal
                        showConfirmationModal={deleteConfirmationModalShow}
                        onCancel={onCancelDeleteConfirmationModal}
                        onConfirm={onConfirmQueryRuleDeletion}
                        itemName={nameNavigation}
                        size="lg"
                    />
                </div>
            ) : (
                <div>Loading...</div>
            )}
        </>
    );
};

export default Navigation;
