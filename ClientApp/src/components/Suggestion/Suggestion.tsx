import * as _ from "lodash";
import Button from "react-bootstrap/Button";
import React, { useCallback, useEffect, useState, Dispatch } from "react";
import { IAdminSettingsState } from "../../store/models/adminsettingsstate.interface";
import { useDispatch, useSelector } from "react-redux";
import { IStateType } from "../../store/models/root.interface";
import {
    ISuggestionState,
    Suggestion as ISuggestion,
} from "../../store/models/suggestion";
import SuggestionModal from "./SuggestionModal";
import {
    deleteSuggestion,
    getSuggestionUpdate,
    retrieveSuggestion,
} from "../../store/actions/suggestion.action";
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

export interface ISuggestionsListSortState {
    query: IListSortState;
    suggestion: IListSortState;
    count: IListSortState;
    type: IListSortState;
}

const Suggestion: React.FC = () => {
    const adminSettingsState: IAdminSettingsState = useSelector(
        (state: IStateType) => state.adminSettingsState
    );
    const suggestionState: ISuggestionState = useSelector(
        (state: IStateType) => state.suggestionState
    );
    const userPermissionState: IUserPermissionState = useSelector(
        (state: IStateType) => state.permissionState
    );
    const userGroupsState: IUserGroupsState = useSelector(
        (state: IStateType) => state.userGroupsState
    );
    const [suggestionModalShow, setSuggestionModalShow] = useState(false);
    const dispatch: Dispatch<any> = useDispatch();
    let initialSuggestionsListSortState: ISuggestionsListSortState = {
        query: { fieldName: "query", isAscending: false },
        suggestion: { fieldName: "suggestion", isAscending: false },
        count: { fieldName: "count", isAscending: false },
        type: { fieldName: "type", isAscending: false },
    };
    let [suggestionsListSortState, setSuggestionsListSortState] =
        useState<ISuggestionsListSortState>(initialSuggestionsListSortState);
    const [iDSuggestion, setIdSuggestion] = useState("");
    const [nameSuggestion, setNameSuggestion] = useState("");
    const [handleViewSuggestion, setHandleViewSuggestion] = useState(false);
    const [handleEditSuggestion, setHandleEditSuggestion] = useState(false);
    const [handleDeleteSuggestion, setHandleDeleteSuggestion] = useState(false);

    const [permissionsChecked, setPermissionsChecked] = useState(false);
    // Delete Modal.
    const [deleteConfirmationModalShow, setDeleteConfirmationModalShow] =
        useState(false);

    useEffect(() => {
        if (permissionsChecked && handleViewSuggestion) {
            let baseApiUrl = adminSettingsState.adminSettings.searchAdminApiUrl;
            if (baseApiUrl?.length > 0) {
                handleGetSuggestion();
            }
        }
    }, [permissionsChecked, handleViewSuggestion]);

    useEffect(() => {
        if (userGroupsState.groups && adminSettingsState.adminSettings.userPermissionEnabled) {
            handleGetScreenPermissions(userGroupsState.groups);
        }
    }, [userGroupsState.groups]);

    useEffect(() => {
        if (
            userPermissionState?.getUserPermissionScreen?.result?.name == "SearchSuggestion" && adminSettingsState.adminSettings.userPermissionEnabled
        ) {
            setHandleViewSuggestion(
                userPermissionState?.getUserPermissionScreen?.result?.view ||
                userPermissionState?.getUserPermissionScreen?.result?.edit ||
                userPermissionState?.getUserPermissionScreen?.result?.delete
            );
            setHandleEditSuggestion(
                userPermissionState?.getUserPermissionScreen?.result?.edit &&
                userPermissionState?.getUserPermissionScreen?.result?.view
            );
            setHandleDeleteSuggestion(
                userPermissionState?.getUserPermissionScreen?.result?.delete &&
                userPermissionState?.getUserPermissionScreen?.result?.view
            );
            setPermissionsChecked(true);
        }
        else if (!adminSettingsState.adminSettings.userPermissionEnabled) {
            setHandleViewSuggestion(true);
            setHandleEditSuggestion(true);
            setHandleDeleteSuggestion(true);
            setPermissionsChecked(true);
        }
    }, [userPermissionState?.getUserPermissionScreen?.result, adminSettingsState.adminSettings.userPermissionEnabled]);

    function handleGetScreenPermissions(group: string) {
        const data = { groupMemberShipClaims: group };
        dispatch(
            retrieveGetPermissionScreen(
                getAdminApiBaseUrl(),
                UserPermissionEnum.SearchSuggestion,
                data
            )
        );
    }

    const handleGetSuggestion = (search = "all", profile = "suggestions", page = 1, pageSize = 50) => {
        const data = { query: search, profile: profile, page: page, pageSize: pageSize };
        dispatch(retrieveSuggestion(getAdminApiBaseUrl(), data));
    };

    function sortSuggestions(listSortState: IListSortState): void {
        // Toggle the sort.
        let isAscending: boolean = !listSortState.isAscending;

        // Save it in state.
        setSuggestionsListSortState({
            ...suggestionsListSortState,
            [listSortState.fieldName]: {
                fieldName: listSortState.fieldName,
                isAscending: !listSortState.isAscending,
            },
        });

        let sortedSuggestions: ISuggestion[] = suggestionState.suggestionList.body?.result;

        let sortType: boolean | "asc" | "desc" = isAscending ? "asc" : "desc";
        sortedSuggestions = _.orderBy(
            sortedSuggestions,
            [(suggestion) => listSortState.fieldName !== "count" ? (suggestion[listSortState.fieldName as keyof ISuggestion] as string)?.toLowerCase() : suggestion[listSortState.fieldName as keyof ISuggestion]],
            [sortType]
        );

        suggestionState.suggestionList.body.result = sortedSuggestions;

    }

    function deleteSuggestionAction(id: any, name: any) {
        setDeleteConfirmationModalShow(true);
        setIdSuggestion(id);
        setNameSuggestion(name);
        var localCount = suggestionState.suggestionCount
        let countSuggestion = localStorage.getItem('CountSuggestion');
        if (countSuggestion === null) {
            localCount--;
            countSuggestion = localCount.toString();
            localStorage.setItem('CountSuggestion', countSuggestion);
        }
        else {
            countSuggestion = (parseInt(countSuggestion) - 1).toString();
            localStorage.setItem('CountSuggestion', countSuggestion);
        }
    }

    function handleGetSuggestionToUpdate(suggestion: ISuggestion) {
        if (handleEditSuggestion) {
            dispatch(getSuggestionUpdate(suggestion));
            setSuggestionModalShow(true);
        }
    }

    // Delete confirmation modal.
    function onCancelDeleteConfirmationModal(): void {
        setDeleteConfirmationModalShow(false);
    }
    async function onConfirmQueryRuleDeletion(): Promise<void> {
        if (localStorage !== null) {
            for (const [key, itemString] of Object.entries(localStorage)) {
                try {
                    const item = JSON.parse(itemString);
                    if (item.navName === nameSuggestion) {
                        localStorage.removeItem(key)
                    }
                } catch (e) { }

            }
        }
        await dispatch(deleteSuggestion(getAdminApiBaseUrl(), iDSuggestion));
        setDeleteConfirmationModalShow(false);
        setIdSuggestion("");
        setNameSuggestion("");
        handleGetSuggestion();
    }

    const getAdminApiBaseUrl = useCallback((): string => {
        return normalizeAdminApiUrl(adminSettingsState.adminSettings.searchAdminApiUrl);
    }, [adminSettingsState.adminSettings]);

    function FastLinkData(): JSX.Element {
        return (
            /*          className = "table-controlpain"*/
            <tbody className="table-controlpain">
                {permissionsChecked && handleViewSuggestion ? (
                    suggestionState?.suggestionList?.body?.result?.filter(suggestion => suggestion.query || suggestion.suggestion)
                        ?.map(
                            (suggestor: ISuggestion, index: number) => (
                                <tr key={index}>
                                    <td onClick={() => handleGetSuggestionToUpdate(suggestor)}>
                                        {suggestor?.query}
                                    </td>
                                    <td onClick={() => handleGetSuggestionToUpdate(suggestor)}>
                                        {suggestor?.suggestion}
                                    </td>
                                    <td onClick={() => handleGetSuggestionToUpdate(suggestor)}>
                                        {suggestor?.count}
                                    </td>


                                    <td onClick={() => handleGetSuggestionToUpdate(suggestor)}>
                                        {suggestor?.type}
                                    </td>
                                    <td onClick={() => handleGetSuggestionToUpdate(suggestor)}>
                                        {suggestor?.profile?.toString()}
                                    </td>
                                    {handleDeleteSuggestion && (
                                        <td>
                                            <div className="action-button-column text-center">
                                                <Button
                                                    key={index}
                                                    className="action-link-button link-button"
                                                    id={`delete-${index}`}
                                                    onClick={() =>
                                                        deleteSuggestionAction(suggestor?.id, suggestor?.query)
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
                        You do not have the permission to view Suggestion Information
                    </div>
                )}
            </tbody>
        );
    }

    return (
        <>
            {permissionsChecked ? (
                <div className="table-wrapper" >
                    <table className="table">
                        <thead className="thead-dark">
                            <tr>
                                <th scope="col" className="align-middle">
                                    Query
                                    <Button variant="secondary" size="sm" className="sort-button"  onClick={() =>
                                                    sortSuggestions(suggestionsListSortState.query)
                                                }>
                                        <i className="fas fa-sort"></i>
                                    </Button>
                                </th>
                                <th scope="col" className="align-middle">
                                    Suggestion
                                    <Button variant="secondary" size="sm" className="sort-button"  onClick={() =>
                                                    sortSuggestions(suggestionsListSortState.suggestion)
                                                }>
                                        <i className="fas fa-sort"></i>
                                    </Button>
                                </th>
                                <th scope="col" className="align-middle" style={{ minWidth: "150px" }}>
                                    Count
                                    <Button variant="secondary" size="sm" className="sort-button"  onClick={() =>
                                                    sortSuggestions(suggestionsListSortState.count)
                                                }>
                                        <i className="fas fa-sort"></i>
                                    </Button>
                                </th>

                                <th scope="col" className="align-middle" style={{ minWidth: "150px" }}>
                                    Type
                                    <Button variant="secondary" size="sm" className="sort-button"  onClick={() =>
                                                    sortSuggestions(suggestionsListSortState.type)
                                                }>
                                        <i className="fas fa-sort"></i>
                                    </Button>
                                </th>
                                <th scope="col" className="align-middle">
                                    Profile
                                </th>
                                {handleDeleteSuggestion && (
                                    <th scope="col" className="align-middle" style={{ minWidth: "90px" }}>
                                        Action
                                    </th>
                                )}
                            </tr>
                        </thead>
                        {FastLinkData()}
                    </table>
                </div>
            ) : (
                <div>Loading...</div>
            )}

            {suggestionModalShow && (
                <SuggestionModal
                    suggestionModalShow={suggestionModalShow}
                    title="Edit"
                    setSuggestionModalShow={setSuggestionModalShow}
                />
            )}

            <ConfirmDeletionModal
                showConfirmationModal={deleteConfirmationModalShow}
                onCancel={onCancelDeleteConfirmationModal}
                onConfirm={onConfirmQueryRuleDeletion}
                itemName={nameSuggestion}
                size="lg"
            ></ConfirmDeletionModal>
        </>
    );
};

export default Suggestion;
