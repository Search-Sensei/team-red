import React, { Dispatch, useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { IStateType } from "../../store/models/root.interface";
import Button from "react-bootstrap/Button";
import {
    ControlPane,
    IControlPaneState,
} from "../../store/models/controlPanel";
import { deleteControlPain } from "../../store/actions/controlPain.action";
import { IAdminSettingsState } from "../../store/models/adminsettingsstate.interface";
import ConfirmDeletionModal from "../../common/components/ConfirmDeletionModal";
import { IUserPermissionState } from "../../store/models/userpermission.interface";
import { retrieveGetPermissionScreen } from "../../store/actions/userpermission.action";
import { UserPermissionEnum } from "../../store/models/queryruletype";
import { IUserGroupsState } from "../../store/models/usergroups.interface";
import { normalizeAdminApiUrl } from "../../store/actions/adminsettings.actions";

const ControlPanel: React.FC = () => {
    const dispatch: Dispatch<any> = useDispatch();
    const controlPain: IControlPaneState = useSelector(
        (state: IStateType) => state.controlPain
    );
    const adminSettingsState: IAdminSettingsState = useSelector(
        (state: IStateType) => state.adminSettingsState
    );
    const userPermissionState: IUserPermissionState = useSelector(
        (state: IStateType) => state.permissionState
    );
    const userGroupsState: IUserGroupsState = useSelector(
        (state: IStateType) => state.userGroupsState
    );
    const getAdminApiBaseUrl = useCallback((): string => {
        return normalizeAdminApiUrl(adminSettingsState.adminSettings.searchAdminApiUrl);
    }, [adminSettingsState.adminSettings]);

    const [iDControlPanel, setIdControlPanel] = useState("");
    const [nameControlPanel, setNameControlPanel] = useState("");
    const [indexNameControlPanel, setIndexNameControlPanel] = useState("");
    const [handleViewControlPanel, setHandleViewControlPanel] = useState(false);
    const [handleDeleteControlPanel, setHandleDeleteControlPanel] =
        useState(false);

    // Delete Modal.
    const [deleteConfirmationModalShow, setDeleteConfirmationModalShow] =
        useState(false);

    function deleteControlPainAction(id: any, indexName: any, name: any) {
        setDeleteConfirmationModalShow(true);
        setIdControlPanel(id);
        setNameControlPanel(name);
        setIndexNameControlPanel(indexName);
    }

    useEffect(() => {
        let baseApiUrl = adminSettingsState.adminSettings.searchAdminApiUrl;
    }, []);
    useEffect(() => {
        if (userGroupsState.groups && adminSettingsState.adminSettings.userPermissionEnabled) {
            handleGetScreenPermissions(userGroupsState.groups);
        }
    }, [userGroupsState.groups]);
    useEffect(() => {
        if (
            userPermissionState?.getUserPermissionScreen?.result?.name ==
            "ControlPanelDeleteUrl" && adminSettingsState.adminSettings.userPermissionEnabled
        ) {
            setHandleViewControlPanel(
                userPermissionState?.getUserPermissionScreen?.result?.view ||
                userPermissionState?.getUserPermissionScreen?.result?.delete
            );
            setHandleDeleteControlPanel(
                userPermissionState?.getUserPermissionScreen?.result?.delete &&
                userPermissionState?.getUserPermissionScreen?.result?.view
            );
        }
        else if (!adminSettingsState.adminSettings.userPermissionEnabled) {
            setHandleViewControlPanel(true);
            setHandleDeleteControlPanel(true)
        }
    }, [userPermissionState?.getUserPermissionScreen?.result, adminSettingsState.adminSettings.userPermissionEnabled]);

    // Delete confirmation modal.
    function onCancelDeleteConfirmationModal(): void {
        setDeleteConfirmationModalShow(false);
    }

    async function onConfirmQueryRuleDeletion(): Promise<void> {
        await dispatch(
            deleteControlPain(getAdminApiBaseUrl(), {
                id: iDControlPanel,
                indexName: indexNameControlPanel,
            })
        );
        setDeleteConfirmationModalShow(false);
        setIdControlPanel("");
        setNameControlPanel("");
        setIndexNameControlPanel("");
    }
    function handleGetScreenPermissions(group: string) {
        const data = { groupMemberShipClaims: group };
        dispatch(
            retrieveGetPermissionScreen(
                getAdminApiBaseUrl(),
                UserPermissionEnum.ControlPanelDeleteUrl,
                data
            )
        );
    }
    function controlPaneData(): JSX.Element {
        return (
            <tbody className="table-controlpain">
                {handleViewControlPanel ? (
                    controlPain.controlPainList?.map(
                        (item: ControlPane, index: number) => (
                            <tr key={index}>
                                <td>
                                    <a
                                        href={item.url}
                                        target="_blank"
                                        style={{ color: "#000", textDecoration: "none" }}
                                    >
                                        {item.url}
                                    </a>
                                </td>
                                <td>
                                    {item.modified && new Date(item.modified).toLocaleDateString()}
                                </td>
                                <td>{item.datasource}</td>
                                <td>{item.category}</td>
                                {handleDeleteControlPanel && (
                                    <td>
                                        <div className="action-button-column text-center">
                                            <Button
                                                key={index}
                                                variant="link"
                                                className="action-link-button link-button"
                                                id={`delete-${index}`}
                                                onClick={() =>
                                                    deleteControlPainAction(item.id, item.indexName, item.url)
                                                }
                                            >
                                                {/* @ts-ignore */}
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
                        You do not have the permission to view Delete Url Information
                    </div>
                )}
            </tbody>
        );
    }

    return (
        <table className="table">
            <thead className="thead-dark">
                <tr>
                    <th scope="col" className="align-middle">
                        URL
                        <Button variant="secondary" size="sm" className="sort-button">
                            {/* @ts-ignore */}
                            <i className="fas fa-sort"></i>
                        </Button>
                    </th>
                    <th scope="col" className="align-middle">
                        Modifile
                        <Button variant="secondary" size="sm" className="sort-button">
                            {/* @ts-ignore */}
                            <i className="fas fa-sort"></i>
                        </Button>
                    </th>
                    <th scope="col" className="align-middle">
                        Datasource
                        <Button variant="secondary" size="sm" className="sort-button">
                            {/* @ts-ignore */}
                            <i className="fas fa-sort"></i>
                        </Button>
                    </th>
                    <th scope="col" className="align-middle">
                        Category
                        <Button variant="secondary" size="sm" className="sort-button">
                            {/* @ts-ignore */}
                            <i className="fas fa-sort"></i>
                        </Button>
                    </th>
                    {handleDeleteControlPanel && (
                        <th scope="col" className="align-middle">
                            Action
                        </th>
                    )}
                </tr>
            </thead>
            {controlPaneData()}
            <ConfirmDeletionModal
                showConfirmationModal={deleteConfirmationModalShow}
                onCancel={onCancelDeleteConfirmationModal}
                onConfirm={onConfirmQueryRuleDeletion}
                itemName={nameControlPanel}
                size="lg"
            ></ConfirmDeletionModal>
        </table>
    );
};

export default ControlPanel;
