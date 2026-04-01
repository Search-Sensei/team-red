import Button from "react-bootstrap/Button";
import React, { useCallback, useEffect, useState, Dispatch } from "react";
import { IAdminSettingsState } from "../../store/models/adminsettingsstate.interface";
import { useDispatch, useSelector } from "react-redux";
import { IStateType } from "../../store/models/root.interface";
import {
    IUserGroupsState,
    UserGroups as IUserGroup,
    UserGroups,
} from "../../store/models/usergroups.interface";
import ConfirmDeletionModal from "../../common/components/ConfirmDeletionModal";
import { IUserPermissionState } from "../../store/models/userpermission.interface";
import { UserPermissionEnum } from "../../store/models/queryruletype";
import { retrieveGetPermissionScreen } from "../../store/actions/userpermission.action";
import UserGroupModal from "./UserGroupModal";
import {
    deleteUserGroup,
    getUserGroupsUpdate,
    retrieveUserGroups,
} from "../../store/actions/usergroups.action";
import { normalizeAdminApiUrl } from "../../store/actions/adminsettings.actions";

const UserGroup: React.FC = () => {
    const adminSettingsState: IAdminSettingsState = useSelector(
        (state: IStateType) => state.adminSettingsState
    );
    const userGroupsState: IUserGroupsState = useSelector(
        (state: IStateType) => state.userGroupsState
    );
    const userPermissionState: IUserPermissionState = useSelector(
        (state: IStateType) => state.permissionState
    );

    const [userGroupModalShow, setUserGroupModalShow] = useState(false);
    const dispatch: Dispatch<any> = useDispatch();

    const [idUserGroup, setIdUserGroup] = useState("");
    const [nameUserGroup, setNameUserGroup] = useState("");
    const [handleViewUserGroup, setHandleViewUserGroup] = useState(false);
    const [handleEditUserGroup, setHandleEditUserGroup] = useState(false);
    const [handleDeleteUserGroup, setHandleDeleteUserGroup] = useState(false);

    // Delete Modal.
    const [deleteConfirmationModalShow, setDeleteConfirmationModalShow] =
        useState(false);

    useEffect(() => {
        let baseApiUrl = adminSettingsState.adminSettings.searchAdminApiUrl;
        if (baseApiUrl?.length > 0) {
            handleGetUserGroups();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (userGroupsState.groups && adminSettingsState.adminSettings.userPermissionEnabled) {
            handleGetScreenPermissions(userGroupsState.groups);
        }
    }, [userGroupsState.groups]);

    useEffect(() => {
        if (
            userPermissionState?.getUserPermissionScreen?.result?.name ==
            "ControlPanelUserGroups"
        ) {
            setHandleViewUserGroup(
                userPermissionState?.getUserPermissionScreen?.result?.view ||
                userPermissionState?.getUserPermissionScreen?.result?.edit ||
                userPermissionState?.getUserPermissionScreen?.result?.delete
            );
            setHandleEditUserGroup(
                userPermissionState?.getUserPermissionScreen?.result?.edit &&
                userPermissionState?.getUserPermissionScreen?.result?.view
            );
            setHandleDeleteUserGroup(
                userPermissionState?.getUserPermissionScreen?.result?.delete &&
                userPermissionState?.getUserPermissionScreen?.result?.view
            );
        }
    }, [userPermissionState?.getUserPermissionScreen?.result]);

    const handleGetUserGroups = (search = "") => {
        const data = { query: search };
        dispatch(retrieveUserGroups(getAdminApiBaseUrl(), data));
    };

    function deleteUserGroupAction(id: any, name: any) {
        if (handleDeleteUserGroup) {
            setDeleteConfirmationModalShow(true);
            setIdUserGroup(id);
            setNameUserGroup(name);
        }
    }

    function handleGetUserGroupsToUpdate(userGroup: UserGroups) {
        if (handleEditUserGroup) {
            dispatch(getUserGroupsUpdate(userGroup));
            setUserGroupModalShow(true);
        }
    }

    // Delete confirmation modal.
    function onCancelDeleteConfirmationModal(): void {
        setDeleteConfirmationModalShow(false);
    }

    async function onConfirmQueryRuleDeletion(): Promise<void> {
        await dispatch(deleteUserGroup(getAdminApiBaseUrl(), idUserGroup, nameUserGroup));
        setDeleteConfirmationModalShow(false);
        setTimeout(() => {
            handleGetUserGroups();
        }, 500);
        setIdUserGroup("");
        setNameUserGroup("");
    }

    function handleGetScreenPermissions(group: string) {
        const data = { groupMemberShipClaims: group };
        dispatch(
            retrieveGetPermissionScreen(
                getAdminApiBaseUrl(),
                UserPermissionEnum.ControlPanelUserGroups,
                data
            )
        );
    }

    const getAdminApiBaseUrl = useCallback((): string => {
        return normalizeAdminApiUrl(adminSettingsState.adminSettings.searchAdminApiUrl);
    }, [adminSettingsState.adminSettings]);

    function UserGroupsData(): JSX.Element {
        return (
            <tbody className="table-controlpain">
                {handleViewUserGroup ? (
                    userGroupsState?.userGroupsList?.result?.map(
                        (userGroup: IUserGroup, index: number) => (
                            <tr key={index}>
                                <td>
                                    <p onClick={() => handleGetUserGroupsToUpdate(userGroup)}>
                                        {userGroup?.id}
                                    </p>
                                </td>
                                <td>
                                    <p onClick={() => handleGetUserGroupsToUpdate(userGroup)}>
                                        {userGroup?.groupName}
                                    </p>
                                </td>
                                <td onClick={() => handleGetUserGroupsToUpdate(userGroup)}>
                                    {userGroup?.description}
                                </td>
                                {handleDeleteUserGroup && (
                                    <td>
                                        <div className="action-button-column text-center mb-2">
                                            <Button
                                                key={index}
                                                className="action-link-button link-button"
                                                id={`delete-${index}`}
                                                onClick={() =>
                                                    deleteUserGroupAction(
                                                        userGroup?.id,
                                                        userGroup.groupName
                                                    )
                                                }
                                            >
                                                <i className="fas fa-times-circle"></i>
                                            </Button>
                                        </div>
                                    </td>
                                )}
                            </tr>
                        )
                    )
                ) : (
                    <div className="p-4">
                        You do not have the permission to view User Groups Information
                    </div>
                )}
            </tbody>
        );
    }

    return (
        <>
            <table className="table">
                <thead className="thead-dark">
                    <tr>
                        <th scope="col" className="align-middle">
                            Group Id
                            <Button variant="secondary" size="sm" className="sort-button">
                                <i className="fas fa-sort"></i>
                            </Button>
                        </th>
                        <th scope="col" className="align-middle">
                            User Group
                            <Button variant="secondary" size="sm" className="sort-button">
                                <i className="fas fa-sort"></i>
                            </Button>
                        </th>
                        <th scope="col" className="align-middle">
                            Description
                            <Button variant="secondary" size="sm" className="sort-button">
                                <i className="fas fa-sort"></i>
                            </Button>
                        </th>
                        {handleDeleteUserGroup && (
                            <th scope="col" className="align-middle text-center">
                                Action
                            </th>
                        )}
                    </tr>
                </thead>
                {UserGroupsData()}
            </table>

            {userGroupModalShow && (
                <UserGroupModal
                    userGroupModalShow={userGroupModalShow}
                    title="Edit"
                    setUserGroupModalShow={setUserGroupModalShow}
                />
            )}

            <ConfirmDeletionModal
                showConfirmationModal={deleteConfirmationModalShow}
                onCancel={onCancelDeleteConfirmationModal}
                onConfirm={onConfirmQueryRuleDeletion}
                itemName={nameUserGroup}
                size="lg"
            ></ConfirmDeletionModal>
        </>
    );
};

export default UserGroup;
