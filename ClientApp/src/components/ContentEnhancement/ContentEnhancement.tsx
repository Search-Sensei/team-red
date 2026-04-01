// @ts-nocheck
import Button from "react-bootstrap/Button";
import React, { useCallback, useEffect, useState, Dispatch } from "react";
//import ContentModal from "./ContentModal";
import { IAdminSettingsState } from "../../store/models/adminsettingsstate.interface";
import { useDispatch, useSelector } from "react-redux";
import { IStateType } from "../../store/models/root.interface";
import {
    retrieveContent,
    deleteContent,
    getContentUpdate,
} from "../../store/actions/content.action";
import {
    IContentState,
    Content as IContent,
} from "../../store/models/content.interface";
import ConfirmDeletionModal from "../../common/components/ConfirmDeletionModal";
import ContentEnhancementModal from "./ContentEnhancementModal";
import { Redirect } from 'react-router-dom';
import { Link } from "react-router-dom";
import { IUserPermissionState } from "../../store/models/userpermission.interface";
import { UserPermissionEnum } from "../../store/models/queryruletype";
import { retrieveGetPermissionScreen } from "../../store/actions/userpermission.action";
import { IUserGroupsState } from "../../store/models/usergroups.interface";
import { normalizeAdminApiUrl } from "../../store/actions/adminsettings.actions";

const ContentEnhancement: React.FC = () => {
    const adminSettingsState: IAdminSettingsState = useSelector(
        (state: IStateType) => state.adminSettingsState
    );
    const contentState: IContentState = useSelector(
        (state: IStateType) => state.contentState
    );
    const userPermissionState: IUserPermissionState = useSelector(
        (state: IStateType) => state.permissionState
    );
    const userGroupsState: IUserGroupsState = useSelector(
        (state: IStateType) => state.userGroupsState
    );

    const [contentModalShow, setContentModalShow] = useState(false);
    const dispatch: Dispatch<any> = useDispatch();

    const [iDContent, setIdContent] = useState("");
    const [nameContent, setNameContent] = useState("");
    const [selectedContent, setSelectedContent] = useState();
    const [redirect, setRedirect] = useState(null);
    const [handleViewContent, setHandleViewContent] = useState(false);
    const [handleEditContent, setHandleEditContent] = useState(false);
    const [handleDeleteContent, setHandleDeleteContent] = useState(false);

    const [permissionsChecked, setPermissionsChecked] = useState(false);

    // Delete Modal.
    const [deleteConfirmationModalShow, setDeleteConfirmationModalShow] =
        useState(false);

    useEffect(() => {
        if (permissionsChecked && handleViewContent) {
            let baseApiUrl = adminSettingsState.adminSettings.searchAdminApiUrl;
            if (baseApiUrl?.length > 0) {
                handleGetContent();
            }
        }
    }, [permissionsChecked, handleViewContent]);

    useEffect(() => {
        if (userGroupsState.groups && adminSettingsState.adminSettings.userPermissionEnabled) {
            handleGetScreenPermissions(userGroupsState.groups);
        }
    }, [userGroupsState.groups]);

    useEffect(() => {
        if (
            userPermissionState?.getUserPermissionScreen?.result?.name == "ContentEnhancement" && adminSettingsState.adminSettings.userPermissionEnabled
        ) {
            setHandleViewContent(
                userPermissionState?.getUserPermissionScreen?.result?.view ||
                userPermissionState?.getUserPermissionScreen?.result?.edit ||
                userPermissionState?.getUserPermissionScreen?.result?.delete
            );
            setHandleEditContent(
                userPermissionState?.getUserPermissionScreen?.result?.edit &&
                userPermissionState?.getUserPermissionScreen?.result?.view
            );
            setHandleDeleteContent(
                userPermissionState?.getUserPermissionScreen?.result?.delete &&
                userPermissionState?.getUserPermissionScreen?.result?.view
            );
            setPermissionsChecked(true);
        }
        else if (!adminSettingsState.adminSettings.userPermissionEnabled) {
            setHandleViewContent(true);
            setHandleEditContent(true);
            setHandleDeleteContent(true);
            setPermissionsChecked(true);
        }
    }, [userPermissionState?.getUserPermissionScreen?.result, adminSettingsState.adminSettings.userPermissionEnabled]);
    function handleGetScreenPermissions(group: string) {
        const data = { groupMemberShipClaims: group };
        dispatch(
            retrieveGetPermissionScreen(
                getAdminApiBaseUrl(),
                UserPermissionEnum.ContentEnhancement,
                data
            )
        );
    }

    const handleGetContent = (search = "all") => {
        const data = { query: search };
        dispatch(retrieveContent(getAdminApiBaseUrl(), data));
    };

    function deleteContentAction(id: any, name: any) {
        setDeleteConfirmationModalShow(true);
        setIdContent(id);
        setNameContent(name);
    }

    function handleGetContentToUpdate(content: any) {
        dispatch(getContentUpdate(content));
        setSelectedContent(content);
        const contentUrl = `/content-detail`; // Modify this URL if needed
        window.location.href = contentUrl;
        //setContentModalShow(true);
    }

    // Delete confirmation modal.
    function onCancelDeleteConfirmationModal(): void {
        setDeleteConfirmationModalShow(false);
    }

    function onConfirmQueryRuleDeletion(): void {
        dispatch(deleteContent(getAdminApiBaseUrl(), iDContent));
        setDeleteConfirmationModalShow(false);
        setIdContent("");
        setNameContent("");
    }

    const getAdminApiBaseUrl = useCallback((): string => {
        return normalizeAdminApiUrl(adminSettingsState.adminSettings.searchAdminApiUrl);
    }, [adminSettingsState.adminSettings]);

    function ContentData(): JSX.Element {
        return (
            <tbody className="table-controlpain">
                {permissionsChecked && handleViewContent ? (
                    contentState?.contentList?.map((content: any, index: number) => (
                        <tr key={index}>
                            <td colSpan={7}>
                                {handleEditContent ? (
                                    <Link className="nav-link d-flex align-items-center" to={`/content-enhancement-detail/${index}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                        <div className="row w-100">
                                            <div className="col text-truncate">
                                                <p>{content?.title}</p>
                                            </div>
                                            <div className="col mr-10 text-truncate">
                                                {content?.source_doc_url}
                                            </div>
                                            <div className="col mr-10 text-truncate">
                                                {content?.process_status}
                                            </div>
                                        </div>
                                    </Link>
                                ) : (
                                    <div className="row w-100">
                                        <div className="col text-truncate">
                                            <p>{content?.title}</p>
                                        </div>
                                        <div className="col mr-10 text-truncate">
                                            {content?.source_doc_url}
                                        </div>
                                        <div className="col mr-10 text-truncate">
                                            {content?.process_status}
                                        </div>
                                    </div>
                                )}
                            </td>
                        </tr>
                    ))
                ) : (
                    <div className="p-4">
                        You do not have the permission to view Content Enhancement Information
                    </div>
                )}
            </tbody>


        );
    }

    return (
        <>
            {permissionsChecked ? (
                <table className="table">
                    <thead className="thead-dark">
                        <tr>
                            <th scope="col" className="align-middle">
                                Title
                                <Button variant="secondary" size="sm" className="sort-button">
                                    <i className="fas fa-sort"></i>
                                </Button>
                            </th>
                            <th scope="col" className="align-middle">
                                Url
                                <Button variant="secondary" size="sm" className="sort-button">
                                    <i className="fas fa-sort"></i>
                                </Button>
                            </th>
                            <th scope="col" style={{ marginLeft: '50px', alignItems: 'center', paddingLeft: '0px' }}>
                                Status
                                <Button variant="secondary" size="sm" className="sort-button">
                                    <i className="fas fa-sort"></i>
                                </Button>
                            </th>
                        </tr>
                    </thead>
                    {ContentData()}
                </table>
            ) : (
                <div>Loading...</div>
            )}
        </>
    );
};

export default ContentEnhancement;
