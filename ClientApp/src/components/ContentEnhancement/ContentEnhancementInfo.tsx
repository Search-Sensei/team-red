import "bootstrap/dist/css/bootstrap.css";
import React, { Dispatch, useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { IStateType } from "../../store/models/root.interface";
import { IContentState, Content } from "../../store/models/content.interface";
import { IAdminSettingsState } from "../../store/models/adminsettingsstate.interface";
import { retrieveContent, updateContent } from "../../store/actions/content.action";
import { useParams, useHistory  } from 'react-router-dom';
import { normalizeAdminApiUrl } from "../../store/actions/adminsettings.actions";
import Button from "react-bootstrap/Button";
import { IUserPermissionState } from "../../store/models/userpermission.interface";
import { IUserGroupsState } from "../../store/models/usergroups.interface";
import { UserPermissionEnum } from "../../store/models/queryruletype";
import { retrieveGetPermissionScreen } from "../../store/actions/userpermission.action";

const ContentEnhancementInfo: React.FC = () => {
    let history = useHistory();
    const dispatch: Dispatch<any> = useDispatch();
    const adminSettingsState: IAdminSettingsState = useSelector(
        (state: IStateType) => state.adminSettingsState
    );
    const contentState: IContentState = useSelector(
        (state: IStateType) => state.contentState
    );

    const [content, setContent] = useState<Content | null>(null);
    const [selectedContent, setSelectedContent] = useState();
    const userPermissionState: IUserPermissionState = useSelector(
        (state: IStateType) => state.permissionState
    );
    const userGroupsState: IUserGroupsState = useSelector(
        (state: IStateType) => state.userGroupsState
    );
    const [handleEditContentEnhancements, setHandleEditContentEnhancements] = useState(false);
    const [saveClicked, setSaveClicked] = useState(false);

    
    const [handleDeleteContentEnhancements, setHandleDeleteContentEnhancements] = useState(false);
    const [permissionsChecked, setPermissionsChecked] = useState(false);
    
    const [handleViewContentEnhancements, setHandleViewContentEnhancements] = useState(false);

    const getAdminApiBaseUrl = useCallback((): string => {
        return normalizeAdminApiUrl(adminSettingsState.adminSettings.searchAdminApiUrl);
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

    useEffect(() => {
        if (contentState.contentEdit && contentState.contentEdit.id) {
            setContent(contentState.contentEdit);
        }
    }, [contentState.contentEdit]);

    if (content === null) {
        return <div>Loading...</div>; // Or some loading indicator
    }

    const handleApprove = async (): Promise<void> => {
        if (handleEditContentEnhancements) {
            setSaveClicked(true)
            const newData = {
                ...content,
                questions_answers: content.questions_answers?.map((qa) => ({
                  ...qa,
                  qa_status: true,
                })),
            }
            await dispatch(updateContent(getAdminApiBaseUrl(), newData));
            setSaveClicked(false)
        }
    }

    const handleSave = async (): Promise<void> => {
        if (handleEditContentEnhancements) {
            setSaveClicked(true)
            await dispatch(updateContent(getAdminApiBaseUrl(), content));
            setSaveClicked(false)
        }
    }

    return (
        <>
            <div key={index} style={{ marginBottom: '16px', marginLeft: '24px', marginRight: '100px', display: 'flex', flexDirection: 'column', width: 'calc(100% - 24px)' }}>
                <h1>{content?.title}</h1>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <strong style={{ minWidth: '200px', marginRight: '16px' }}>Url:</strong>
                    <input
                        type="text"
                        value={content?.source_doc_url || ''}
                        style={{ width: '100%' }}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <strong style={{ minWidth: '200px', marginRight: '16px' }}>Summary (50 chars):</strong>
                    <input
                        type="text"
                        value={content?.summary_50 || ''}
                        style={{ width: '100%' }}
                    />
                </div>
                <p style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}><strong style={{ minWidth: '200px', marginRight: '16px' }}>Summary Score (50 chars):</strong> {content?.summary_50_score}</p>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <strong style={{ minWidth: '200px', marginRight: '16px' }}>Summary (100 chars):</strong>
                    <input
                        type="text"
                        value={content?.summary_100 || ''}
                        style={{ width: '100%' }}
                    />
                </div>
                <p style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}><strong style={{ minWidth: '200px', marginRight: '16px' }}>Summary Score (100 chars):</strong> {content?.summary_100_score}</p>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <strong style={{ minWidth: '200px', marginRight: '16px' }}>Keywords:</strong>
                    <input
                        type="text"
                        value={content?.keywords != undefined ? content?.keywords.join(", ") : ''}
                        style={{ width: '100%' }}
                    />
                </div>
                <p style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}><strong style={{ minWidth: '200px', marginRight: '16px' }}>Category:</strong> {content?.category}</p>
                <p style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}><strong style={{ minWidth: '200px', marginRight: '16px' }}>Page Last Updated:</strong>  {new Date(content?.modified).toLocaleDateString()}</p>
                <p style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}><strong style={{ minWidth: '200px', marginRight: '16px' }}>Review / Approve:</strong> {new Date(content?.created).toLocaleDateString()}</p>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <button
                        style={{
                            backgroundColor: 'red',
                            color: 'white',
                            padding: '10px 20px',
                            marginRight: '8px',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    onClick={history.goBack}
                    >
                        Cancel
                    </button>
                    <Button
                        className="btn-modal-synonym"
                        variant="primary"
                        disabled={saveClicked}
                        style={{
                            backgroundColor: 'green',
                            color: 'white',
                            padding: '10px 20px',
                            marginRight: '8px',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    onClick={handleApprove}
                    >
                        Approve
                    </Button>
                    <Button
                        className="btn-modal-synonym"
                        variant="primary"
                        disabled={saveClicked}
                        style={{
                            backgroundColor: 'green',
                            color: 'white',
                            padding: '10px 20px',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    onClick={handleSave}
                    >
                        Save
                    </Button>
                </div>
            </div>
        </>



    );
};

export default ContentEnhancementInfo;
