import * as _ from "lodash";
import Button from "react-bootstrap/Button";
import React, { useCallback, useEffect, useState, Dispatch } from "react";
import SynonymModal from "./SynonymModal";
import { IAdminSettingsState } from "../../store/models/adminsettingsstate.interface";
import { useDispatch, useSelector } from "react-redux";
import { IStateType } from "../../store/models/root.interface";
import {
    retrieveSynonym,
    deleteSynonym,
    getSynonymUpdate,
} from "../../store/actions/synonym.action";
import {
    ISynonymState,
    Synonym as ISynonym,
} from "../../store/models/synonym.interface";
import ConfirmDeletionModal from "../../common/components/ConfirmDeletionModal";
import { IUserPermissionState } from "../../store/models/userpermission.interface";
import { UserPermissionEnum } from "../../store/models/queryruletype";
import { retrieveGetPermissionScreen } from "../../store/actions/userpermission.action";
import { IUserGroupsState } from "../../store/models/usergroups.interface";
import { normalizeAdminApiUrl } from "../../store/actions/adminsettings.actions";

export interface IListSortState {
    fieldName: string;
    isAscending: boolean;
}

export interface ISynonymsListSortState {
    synonyms: IListSortState;
    is: IListSortState;
    word: IListSortState;
}

const Synonym: React.FC = () => {
    const adminSettingsState: IAdminSettingsState = useSelector(
        (state: IStateType) => state.adminSettingsState
    );
    const synonymState: ISynonymState = useSelector(
        (state: IStateType) => state.synonymStateState
    );
    const userPermissionState: IUserPermissionState = useSelector(
        (state: IStateType) => state.permissionState
    );
    const userGroupsState: IUserGroupsState = useSelector(
        (state: IStateType) => state.userGroupsState
    );

    const [synonymModalShow, setSynonymModalShow] = useState(false);
    const dispatch: Dispatch<any> = useDispatch();
    let initialSynonymsListSortState: ISynonymsListSortState = {
        synonyms: { fieldName: "synonyms", isAscending: false },
        is: { fieldName: "is", isAscending: false },
        word: { fieldName: "word", isAscending: false },
    };
    let [synonymsListSortState, setSynonymsListSortState] =
        useState<ISynonymsListSortState>(initialSynonymsListSortState);

    const [iDSynonym, setIdSynonym] = useState("");
    const [nameSynonym, setNameSynonym] = useState("");
    const [handleViewSynonym, setHandleViewSynonym] = useState(false);
    const [handleEditSynonym, setHandleEditSynonym] = useState(false);
    const [handleDeleteSynonym, setHandleDeleteSynonym] = useState(false);

    const [permissionsChecked, setPermissionsChecked] = useState(false);


    const [deleteConfirmationModalShow, setDeleteConfirmationModalShow] =
        useState(false);

    useEffect(() => {
        if (permissionsChecked && handleViewSynonym) {
            let baseApiUrl = adminSettingsState.adminSettings.searchAdminApiUrl;
            if (baseApiUrl?.length > 0) {
                handleGetSynonym();
            }
        }
    }, [permissionsChecked, handleViewSynonym]);

    useEffect(() => {
        if (userGroupsState.groups && adminSettingsState.adminSettings.userPermissionEnabled) {
            handleGetScreenPermissions(userGroupsState.groups);
        }
    }, [userGroupsState.groups]);

    useEffect(() => {
        if (
            userPermissionState?.getUserPermissionScreen?.result?.name == "Synonym" && adminSettingsState.adminSettings.userPermissionEnabled
        ) {
            setHandleViewSynonym(
                userPermissionState?.getUserPermissionScreen?.result?.view ||
                userPermissionState?.getUserPermissionScreen?.result?.edit ||
                userPermissionState?.getUserPermissionScreen?.result?.delete
            );
            setHandleEditSynonym(
                userPermissionState?.getUserPermissionScreen?.result?.edit &&
                userPermissionState?.getUserPermissionScreen?.result?.view
            );
            setHandleDeleteSynonym(
                userPermissionState?.getUserPermissionScreen?.result?.delete &&
                userPermissionState?.getUserPermissionScreen?.result?.view
            );
            setPermissionsChecked(true);
        }
        else if (!adminSettingsState.adminSettings.userPermissionEnabled) {
            setHandleViewSynonym(true);
            setHandleEditSynonym(true);
            setHandleDeleteSynonym(true);
            setPermissionsChecked(true);
        }
    }, [userPermissionState?.getUserPermissionScreen?.result, adminSettingsState.adminSettings.userPermissionEnabled]);

    const handleGetSynonym = (search = "") => {
        const data = { synonyms: search };
        dispatch(retrieveSynonym(getAdminApiBaseUrl(), data));
    };

    function deleteSynonymAction(id: any, name: any) {
        if (handleDeleteSynonym) {
            setDeleteConfirmationModalShow(true);
            setIdSynonym(id);
            setNameSynonym(name);
        }
    }

    function handleGetSynonymToUpdate(synonym: ISynonym) {
        if (handleEditSynonym) {
            dispatch(getSynonymUpdate(synonym));
            setSynonymModalShow(true);
        }
    }

    // Delete confirmation modal.
    function onCancelDeleteConfirmationModal(): void {
        setDeleteConfirmationModalShow(false);
    }

    async function onConfirmQueryRuleDeletion(): Promise<void> {
        await dispatch(deleteSynonym(getAdminApiBaseUrl(), iDSynonym, nameSynonym));
        setDeleteConfirmationModalShow(false);
        setIdSynonym("");
        setNameSynonym("");
        handleGetSynonym();
    }

    function sortSynonyms(listSortState: IListSortState): void {
        // Toggle the sort.
        let isAscending: boolean = !listSortState.isAscending;

        // Save it in state.
        setSynonymsListSortState({
            ...synonymsListSortState,
            [listSortState.fieldName]: {
                fieldName: listSortState.fieldName,
                isAscending: !listSortState.isAscending,
            },
        });

        let sortedSynonyms: ISynonym[] = synonymState.synonymList;

        let sortType: boolean | "asc" | "desc" = isAscending ? "asc" : "desc";
        sortedSynonyms = _.orderBy(
            sortedSynonyms,
            [(synonym) => (synonym[listSortState.fieldName as keyof ISynonym] as string).toLowerCase()],
            [sortType]
        );

        synonymState.synonymList = sortedSynonyms;
        
    }
    function handleGetScreenPermissions(group: string) {
        const data = { groupMemberShipClaims: group };
        dispatch(
            retrieveGetPermissionScreen(
                getAdminApiBaseUrl(),
                UserPermissionEnum.Synonym,
                data
            )
        );
    }

    const getAdminApiBaseUrl = useCallback((): string => {
        return adminSettingsState.adminSettings.searchAdminApiUrl;
    }, [adminSettingsState.adminSettings]);

    function SynonymData(): JSX.Element {
        return (
            <tbody className="table-controlpain">
                {permissionsChecked && handleViewSynonym ? (
                    synonymState?.synonymList?.map((synonym: ISynonym, index: number) => (
                        <tr key={index}>
                            <td>
                                <p onClick={() => handleGetSynonymToUpdate(synonym)}>
                                    {synonym?.synonyms}
                                </p>
                            </td>
                            <td onClick={() => handleGetSynonymToUpdate(synonym)}>
                                {synonym?.is}
                            </td>
                            <td onClick={() => handleGetSynonymToUpdate(synonym)}>
                                {synonym?.word}
                            </td>
                            {handleDeleteSynonym && (
                                <td>
                                    <div className="action-button-column text-center mb-2">
                                        <Button
                                            key={index}
                                            className="action-link-button link-button"
                                            id={`delete-${index}`}
                                            onClick={() =>
                                                deleteSynonymAction(synonym?.id, synonym.synonyms)
                                            }
                                        >
                                            <i className="fas fa-times-circle"></i>
                                        </Button>
                                    </div>
                                </td>
                            )}
                        </tr>
                    ))
                ) : (
                    <div className="p-4">
                        You do not have the permission to view Synonym Information
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
                                Synonym Name
                                <Button variant="secondary" size="sm" className="sort-button" onClick={() =>
                                                    sortSynonyms(synonymsListSortState.synonyms)
                                                }>
                                    <i className="fas fa-sort"></i>
                                </Button>
                            </th>
                            <th scope="col" className="align-middle">
                                Is
                                <Button variant="secondary" size="sm" className="sort-button" onClick={() =>
                                                    sortSynonyms(synonymsListSortState.is)
                                                }>
                                    <i className="fas fa-sort"></i>
                                </Button>
                            </th>
                            <th scope="col" className="align-middle">
                                Word
                                <Button variant="secondary" size="sm" className="sort-button" onClick={() =>
                                                    sortSynonyms(synonymsListSortState.word)
                                                }>
                                    <i className="fas fa-sort"></i>
                                </Button>
                            </th>
                            {handleDeleteSynonym && (
                                <th scope="col" className="align-middle text-center">
                                    Action
                                </th>
                            )}
                        </tr>
                    </thead>
                    {SynonymData()}
                </table>
            ) : (
                <div>Loading...</div>
            )}

            {synonymModalShow && (
                <SynonymModal
                    synonymModalShow={synonymModalShow}
                    title="Edit"
                    setSynonymModalShow={setSynonymModalShow}
                />
            )}

            <ConfirmDeletionModal
                showConfirmationModal={deleteConfirmationModalShow}
                onCancel={onCancelDeleteConfirmationModal}
                onConfirm={onConfirmQueryRuleDeletion}
                itemName={nameSynonym}
                size="lg"
            ></ConfirmDeletionModal>
        </>
    );
};

export default Synonym;
