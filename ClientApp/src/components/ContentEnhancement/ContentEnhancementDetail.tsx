// @ts-nocheck
import "bootstrap/dist/css/bootstrap.css";
import React, { Dispatch, useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { IStateType } from "../../store/models/root.interface";
import { IContentState, Content } from "../../store/models/content.interface";
import { IAdminSettingsState } from "../../store/models/adminsettingsstate.interface";
import { useParams } from 'react-router-dom';
import { normalizeAdminApiUrl } from "../../store/actions/adminsettings.actions";
import Button from "react-bootstrap/Button";
import {
    retrieveContent,
    deleteContent,
    getContentUpdate,
    updateContent
} from "../../store/actions/content.action";
import ConfirmDeletionModal from "../../common/components/ConfirmDeletionModal";
import ContentEnhancementModal from "./ContentEnhancementModal";
import { IUserPermissionState } from "../../store/models/userpermission.interface";
import { IUserGroupsState } from "../../store/models/usergroups.interface";
import { retrieveGetPermissionScreen } from "../../store/actions/userpermission.action";
import { UserPermissionEnum } from "../../store/models/queryruletype";

const ContentEnhancementDetail: React.FC = () => {
    const dispatch: Dispatch<any> = useDispatch();
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

    const [content, setContent] = useState<Content | null>(null);
    const [selectedContent, setSelectedContent] = useState();
    const [contentModalShow, setContentModalShow] = useState(false);

    const [handleEditContentEnhancements, setHandleEditContentEnhancements] = useState(false);

    const [handleDeleteContentEnhancements, setHandleDeleteContentEnhancements] = useState(false);
    const [permissionsChecked, setPermissionsChecked] = useState(false);

    const [handleViewContentEnhancements, setHandleViewContentEnhancements] = useState(false);
    const [deleteConfirmationModalShow, setDeleteConfirmationModalShow] =
        useState(false);
    const [indexQA, setIndexQA] = useState(0);
    const [question, setQuestion] = useState("");


    const getAdminApiBaseUrl = useCallback((): string => {
        return normalizeAdminApiUrl(adminSettingsState.adminSettings?.searchAdminApiUrl);
    }, [adminSettingsState.adminSettings]);

    const { index } = useParams<{ index: string }>();

    useEffect(() => {
        // Fetch content if it's not already loaded
        const idx = parseInt(index, 10);
        if (!isNaN(idx) && idx >= 0 && idx < contentState?.contentList?.length) {
            setContent(contentState.contentList[idx]);
        }
    }, [index, contentState.contentList]);

    useEffect(() => {
        if (contentState.contentEdit && contentState.contentEdit.id) {
            setContent(contentState.contentEdit);
        }
    }, [contentState.contentEdit]);

    useEffect(() => {
        if (userGroupsState.groups && adminSettingsState.adminSettings.userPermissionEnabled) {
            handleGetScreenPermissions(userGroupsState.groups);
        }
    }, [userGroupsState.groups]);

    useEffect(() => {
        if (
            userPermissionState?.getUserPermissionScreen?.result?.name == "ContentEnhancement" && adminSettingsState.adminSettings.userPermissionEnabled
        ) {
            setHandleViewContentEnhancements(
                userPermissionState?.getUserPermissionScreen?.result?.view ||
                userPermissionState?.getUserPermissionScreen?.result?.edit ||
                userPermissionState?.getUserPermissionScreen?.result?.delete
            );
            setHandleEditContentEnhancements(
                userPermissionState?.getUserPermissionScreen?.result?.edit &&
                userPermissionState?.getUserPermissionScreen?.result?.view
            );
            setHandleDeleteContentEnhancements(
                userPermissionState?.getUserPermissionScreen?.result?.delete &&
                userPermissionState?.getUserPermissionScreen?.result?.view
            );
            setPermissionsChecked(true);
        }
        else if (!adminSettingsState.adminSettings.userPermissionEnabled) {
            setHandleViewContentEnhancements(true);
            setHandleEditContentEnhancements(true);
            setHandleDeleteContentEnhancements(true);
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

    if (content === null) {
        return <div>Loading...</div>; // Or some loading indicator
    }
    function handleGetContentToUpdate(content: any) {
        dispatch(getContentUpdate(content));
        setSelectedContent(content);
        setContentModalShow(true);
    }

    function deleteCategoryContentEnhancementAction(idx: number, q: string) {
        setDeleteConfirmationModalShow(true);
        setIndexQA(idx);
        setQuestion(q);
    }

    function onCancelDeleteConfirmationModal(): void {
        setDeleteConfirmationModalShow(false);
    }

    async function onConfirmQueryRuleDeletion(): Promise<void> {
        const newData = {
            ...contentState.contentList[0],
            questions_answers: contentState.contentList[0].questions_answers?.filter((qa, index) =>
               (index !== indexQA)
            ),
        };
        await dispatch(updateContent(getAdminApiBaseUrl(), newData));
        setDeleteConfirmationModalShow(false);
        setIndexQA(0);
        setQuestion("");
    }

    function ContentData(): JSX.Element {
        return (
            <tbody className="table-controlpain">
                {content?.questions_answers?.map((qa, idx) => (
                    <tr key={idx}>
                        <td className="align-middle">
                            {qa.qa_status ? (
                                <i className="fas fa-check text-success"></i>
                            ) : (
                                <i className="fas fa-times text-danger"></i>
                            )}
                        </td>
                        <td style={{ fontWeight: "bold" }}>{qa.question}</td>
                        <td>{qa.answer}</td>
                        <td>
                            {handleEditContentEnhancements && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="sort-button ml-3"
                                    onClick={() => handleGetContentToUpdate(qa)}
                                >
                                    Update
                                </Button>
                            )}
                            {handleEditContentEnhancements && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="btn btn-danger ml-3"
                                    onClick={() => deleteCategoryContentEnhancementAction(idx, qa.question)}
                                >
                                    <i className="fas fa-trash"></i>
                                </Button>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        );
    }

    return (
        <>
            <table className="table">
                <thead className="thead-dark">
                    <tr>
                        <th scope="col" className="align-middle">Approved</th>
                        <th scope="col" className="align-middle">
                            Question
                            <Button variant="secondary" size="sm" className="sort-button">
                                <i className="fas fa-sort"></i>
                            </Button>
                        </th>
                        <th scope="col" className="align-middle">
                            Answer
                            <Button variant="secondary" size="sm" className="sort-button">
                                <i className="fas fa-sort"></i>
                            </Button>
                        </th>
                        <th scope="col" className="align-middle">Action</th>
                    </tr>
                </thead>
                {ContentData()}
            </table>

            {contentModalShow && (
                <ContentEnhancementModal
                    contentModalShow={contentModalShow}
                    title="Detail"
                    setContentModalShow={setContentModalShow}
                />
            )}
            <ConfirmDeletionModal
                showConfirmationModal={deleteConfirmationModalShow}
                onCancel={onCancelDeleteConfirmationModal}
                onConfirm={onConfirmQueryRuleDeletion}
                itemName={question}
                size="lg"
            ></ConfirmDeletionModal>
        </>
    );
};

export default ContentEnhancementDetail;
