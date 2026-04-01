import * as _ from "lodash";
import React, {
    Dispatch,
    KeyboardEvent,
    useCallback,
    useEffect,
    useState,
} from "react";
import Button from "react-bootstrap/Button";
import { useDispatch, useSelector } from "react-redux";

import ConfirmDeletionModal from "../../common/components/ConfirmDeletionModal";
import TextInput from "../../common/components/TextInput";
import { OnChangeModel } from "../../common/types/Form.types";
import {
    changeSelectedQueryRule,
    deleteQueryRule,
    deleteQueryRule2Silent,
    setQueryRuleModificationState,
} from "../../store/actions/queryrules.actions";
import { retrieveSynonym } from "../../store/actions/synonym.action";
import { retrieveFastLink } from "../../store/actions/fastlink.action";
import { retrieveContent } from "../../store/actions/content.action";
import { normalizeAdminApiUrl } from "../../store/actions/adminsettings.actions";
import { IQueryRule } from "../../store/models/queryrule.interface";
import { QueryRuleModificationStatus } from "../../store/models/queryrulemodificationstatus";
import { IQueryRulesState } from "../../store/models/queryrulesstate.interface";
import {
    QueryRuleType,
    UserPermissionEnum,
} from "../../store/models/queryruletype";
import { IStateType } from "../../store/models/root.interface";
import {
    INavigationState,
    FeaturedContent as IFeaturedContent,
} from "../../store/models/navigation";
import {
    IFastLinksState,
    FeaturedContent as IFeaturedContentFastLink,
} from "../../store/models/fastlinks";
import Synonym from "../Synonym/Synonym";

import {
    getDocumentCount,
    retrieveControlPain,
} from "../../store/actions/controlPain.action";
import { IAdminSettingsState } from "../../store/models/adminsettingsstate.interface";
import ControlPanel from "../ControlPanel/ControlPanel";
import FastLink from "../FastLinks/FastLinks";
import Navigation from "../Navigation/Navigation";
import { retrieveNavigation } from "../../store/actions/navigation.action";
import UserPermission from "../UserPermission/UserPermission";
import { IUserPermissionState } from "../../store/models/userpermission.interface";
import { retrieveGetPermissionScreen } from "../../store/actions/userpermission.action";
import UserGroup from "../UserGroups/UserGroup";
import { retrieveUserGroups } from "../../store/actions/usergroups.action";
import { IUserGroupsState } from "../../store/models/usergroups.interface";
import { useLocation } from 'react-router-dom';
import ContentEnhancement from "../ContentEnhancement/ContentEnhancement";
import ContentEnhancementDetail from "../ContentEnhancement/ContentEnhancementDetail";
import Suggestion from "../Suggestion/Suggestion";
import { retrieveSuggestion } from "../../store/actions/suggestion.action"
import { ISuggestionState } from "../../store/models/suggestion";
import { searchQueryRules } from "../../store/actions/queryrules.actions"

export interface IListSortState {
    fieldName: string;
    isAscending: boolean;
}

export interface IQueryRulesListSortState {
    name: IListSortState;
    datestart: IListSortState;
    dateend: IListSortState;
}

export type queryRulesListProps = {
    onSelect?: (queryRule: IQueryRule) => void;
    children?: React.ReactNode;
    queryRuleType: QueryRuleType;
    actionCreate?: boolean;
    baseApiUrl?: string;
    isReadOnly?: boolean;
    page?: string;
};
function QueryRulesList(props: queryRulesListProps): JSX.Element {
    const dispatch: Dispatch<any> = useDispatch();
    const adminSettingsState: IAdminSettingsState = useSelector(
        (state: IStateType) => state.adminSettingsState
    );
    const navigationState: INavigationState = useSelector(
        (state: IStateType) => state.navigationState
    );
    const fastLinkState: IFastLinksState = useSelector(
        (state: IStateType) => state.fastLinkStateState
    );
    const queryRulesState: IQueryRulesState = useSelector(
        (state: IStateType) => state.queryRulesState
    );
    const userGroupsState: IUserGroupsState = useSelector(
        (state: IStateType) => state.userGroupsState
    );
    const suggestionState: ISuggestionState = useSelector(
        (state: IStateType) => state.suggestionState
    );

    const isFeature: number = props.queryRuleType;
    const [searchValue, setSearchValue] = useState("");
    // Use currentPage from Redux state for Navigation, fallback to local state for other types
    const [pageNumber, setPageNumber] = useState(
        props.queryRuleType === 5 ? (navigationState?.currentPage || 1) : 1
    );
    const [selectedProfile, setSelectedProfile] = useState<string>(
        props.queryRuleType === 5 ? (navigationState?.currentProfile || "") : ""
    );
    const [queryRuleTypeTitle, setQueryRuleTypeTitle] = useState("");
    const [handleViewBootsAndBlock, setHandleViewBootsAndBlock] = useState(false);
    const [handleEditBootsAndBlock, setHandleEditBootsAndBlock] = useState(false);
    const [handleDeleteBootsAndBlock, setHandleDeleteBootsAndBlock] =
        useState(false);
    const [handleViewFeature, setHandleViewFeature] = useState(false);
    const [handleEditFeature, setHandleEditFeature] = useState(false);
    const [handleDeleteFeature, setHandleDeleteFeature] = useState(false);

    // Modals.
    const [deleteConfirmationModalShow, setDeleteConfirmationModalShow] =
        useState(false);

    const getQueryRules = useCallback((): IQueryRule[] => {
        return queryRulesState.queryRules.filter(
            (queryRule) => queryRule.type === props.queryRuleType
        );
    }, [queryRulesState.queryRules, props.queryRuleType]);
    const userPermissionState: IUserPermissionState = useSelector(
        (state: IStateType) => state.permissionState
    );

    // Only display QueryRules for the type specified.
    let [queryRules, setQueryRules] = useState(getQueryRules());

    // Sorting.
    let initialQueryRulesListSortState: IQueryRulesListSortState = {
        name: { fieldName: "name", isAscending: false },
        dateend: { fieldName: "dateend", isAscending: false },
        datestart: { fieldName: "datestart", isAscending: false },
    };
    let [queryRulesListSortState, setQueryRulesListSortState] =
        useState<IQueryRulesListSortState>(initialQueryRulesListSortState);

    const getAdminApiBaseUrl = useCallback((): string => {
        return normalizeAdminApiUrl(adminSettingsState.adminSettings.searchAdminApiUrl);
    }, [adminSettingsState.adminSettings]);
    const [permissionsChecked, setPermissionsChecked] = useState(false);

    // Sync pageNumber and selectedProfile with Redux state for Navigation
    useEffect(() => {
        if (props.queryRuleType === 5) {
            const reduxPage = navigationState?.currentPage || 1;
            const reduxProfile = navigationState?.currentProfile || "";
            if (reduxPage !== pageNumber) {
                setPageNumber(reduxPage);
            }
            if (reduxProfile !== selectedProfile) {
                setSelectedProfile(reduxProfile);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigationState?.currentPage, navigationState?.currentProfile, props.queryRuleType]);

    // Filter table when profile dropdown changes
    useEffect(() => {
        let filteredRules = getQueryRules();
        if (selectedProfile && selectedProfile !== "") {
            filteredRules = filteredRules.filter(
                (queryRule) =>
                    queryRule.profiles &&
                    queryRule.profiles.includes(selectedProfile)
            );
        }

        setQueryRules(filteredRules);
    }, [selectedProfile, getQueryRules]);

    useEffect(() => {
        let baseApiUrl = adminSettingsState.adminSettings.searchAdminApiUrl;
        if (baseApiUrl?.length > 0) {
        }
    }, []);

    useEffect(() => {
        if (queryRulesState.queryRulesSuccess && adminSettingsState.adminSettings.userPermissionEnabled) {
            if (window.location.pathname.includes('/Home') || window.location.pathname === "/" || window.location.pathname === "/adminui") {
                handleGetScreenPermissionsFeature(userGroupsState.groups);
                handleGetScreenPermissionsBootsAndBlock(userGroupsState.groups);
            }
        }
    }, [queryRulesState.queryRulesSuccess]);

    useEffect(() => {
        setSearchValue("");
    }, [window.location.href]);


    useEffect(() => {
        const fetchPermissions = async () => {
            if (userPermissionState?.getUserPermissionScreen?.result?.name === "Boost" && adminSettingsState.adminSettings.userPermissionEnabled) {
                setHandleViewBootsAndBlock(
                    userPermissionState?.getUserPermissionScreen?.result?.view ||
                    userPermissionState?.getUserPermissionScreen?.result?.edit ||
                    userPermissionState?.getUserPermissionScreen?.result?.delete
                );
                setHandleEditBootsAndBlock(
                    userPermissionState?.getUserPermissionScreen?.result?.edit &&
                    userPermissionState?.getUserPermissionScreen?.result?.view
                );
                setHandleDeleteBootsAndBlock(
                    userPermissionState?.getUserPermissionScreen?.result?.delete &&
                    userPermissionState?.getUserPermissionScreen?.result?.view
                );
                setPermissionsChecked(true);
            } else if (userPermissionState?.getUserPermissionScreen?.result?.name === "Feature" && adminSettingsState.adminSettings.userPermissionEnabled) {
                setHandleViewFeature(
                    userPermissionState?.getUserPermissionScreen?.result?.view ||
                    userPermissionState?.getUserPermissionScreen?.result?.edit ||
                    userPermissionState?.getUserPermissionScreen?.result?.delete
                );
                setHandleEditFeature(
                    userPermissionState?.getUserPermissionScreen?.result?.edit &&
                    userPermissionState?.getUserPermissionScreen?.result?.view
                );
                setHandleDeleteFeature(
                    userPermissionState?.getUserPermissionScreen?.result?.delete &&
                    userPermissionState?.getUserPermissionScreen?.result?.view
                );
                setPermissionsChecked(true);
            } else if (!adminSettingsState.adminSettings.userPermissionEnabled) {
                setHandleViewBootsAndBlock(true);
                setHandleEditBootsAndBlock(true);
                setHandleDeleteBootsAndBlock(true);
                setHandleViewFeature(true);
                setHandleEditFeature(true);
                setHandleDeleteFeature(true);
                setPermissionsChecked(true);

            }
        }
        fetchPermissions();
    }, [userPermissionState?.getUserPermissionScreen?.result, userGroupsState.groups, adminSettingsState.adminSettings.userPermissionEnabled]);




    useEffect(() => {
        if (isFeature === 0) {
            setQueryRuleTypeTitle("Featured Content");
        } else if (isFeature === 1) {
            setQueryRuleTypeTitle("Boosts and Blocks");
        } else if (isFeature === 2) {
            setQueryRuleTypeTitle("Synonym name");
        } else if (isFeature == 3) {
            setQueryRuleTypeTitle("Control Panel Name");
        } else if (isFeature == 4) {
            setQueryRuleTypeTitle("Fast Link");
        } else if (isFeature == 5) {
            setQueryRuleTypeTitle("Navigation");
        } else if (isFeature == 8) {
            setQueryRuleTypeTitle("Content Enhancement");
        } else if (isFeature == 9) {
            setQueryRuleTypeTitle("Question Answer");
        } else if (isFeature == 10) {
            setQueryRuleTypeTitle("Suggestion");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.queryRuleType]);
    const handleGetControlPain = (search?: string | null) => {
        const data = { url: search };
        dispatch(retrieveControlPain(getAdminApiBaseUrl(), data));
    };

    useEffect(() => {
        let baseApiUrl = adminSettingsState.adminSettings.searchAdminApiUrl;
        if (baseApiUrl?.length > 0) {
            handleGetControlPain();
            dispatch(getDocumentCount(getAdminApiBaseUrl()));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Delete confirmation modal.
    function onCancelDeleteConfirmationModal(): void {
        setDeleteConfirmationModalShow(false);
    }

    async function onConfirmQueryRuleDeletion(): Promise<void> {
        if (
            !queryRulesState.selectedQueryRule ||
            props.isReadOnly ||
            !props.baseApiUrl
        ) {
            return;
        }
        let index2 = queryRulesState.queryRules.findIndex((qr) => qr.id === queryRulesState?.selectedQueryRule?.id2);
        if (queryRulesState.selectedQueryRule.id2 && index2 !== -1) {
            queryRulesState.queryRules = queryRulesState.queryRules.filter((qr) => qr.id !== queryRulesState?.selectedQueryRule?.id2);
            await dispatch(deleteQueryRule2Silent(props.baseApiUrl, queryRulesState.selectedQueryRule));
        }

        await dispatch(
            deleteQueryRule(props.baseApiUrl, queryRulesState.selectedQueryRule)
        );
        setDeleteConfirmationModalShow(false);
    }

    function onDeleteButtonClick(id: string): void {
        // Ensure the current item is selected before confirming deletion.
        const queryRule: IQueryRule | undefined = queryRules.find(
            (q) => q.id === id
        );

        if (queryRule !== null && queryRule !== undefined) {
            dispatch(changeSelectedQueryRule(queryRule));
            dispatch(
                setQueryRuleModificationState(QueryRuleModificationStatus.Delete)
            );
            setDeleteConfirmationModalShow(true);
        }
    }
    function handleGetScreenPermissionsBootsAndBlock(group: string) {
        const data = { groupMemberShipClaims: group };
        dispatch(
            retrieveGetPermissionScreen(
                getAdminApiBaseUrl(),
                UserPermissionEnum.Boost,
                data
            )
        );
    }
    function handleGetScreenPermissionsFeature(group: string) {
        const data = { groupMemberShipClaims: group };
        dispatch(
            retrieveGetPermissionScreen(
                getAdminApiBaseUrl(),
                UserPermissionEnum.Feature,
                data
            )
        );
    }
    function isQueryRuleSelected(queryRule: IQueryRule): boolean {
        return queryRulesState.selectedQueryRule?.id === queryRule.id;
    }

    function onTableRowClick(queryRule: IQueryRule): void {
        if (props.queryRuleType === 0 && handleEditFeature) {
            if (!props.isReadOnly && props.onSelect) {
                props.onSelect(queryRule);
            }
        }
        if (props.queryRuleType === 1 && handleEditBootsAndBlock) {
            if (!props.isReadOnly && props.onSelect) {
                props.onSelect(queryRule);
            }
        }
    }

    function handleNextPage(): void {
        let newPage = pageNumber + 1;
        setPageNumber(newPage);
        searchFunction(newPage);
    }

    function handlePrevPage(): void {
        let newPage = pageNumber - 1;
        setPageNumber(newPage);
        searchFunction(newPage);
    }

    function searchFunction(pageNumber: number = 1, profileParam?: string): void {
        // Use passed profileParam if provided, otherwise fall back to selectedProfile state
        const currentProfile = profileParam !== undefined ? profileParam : selectedProfile;

        if (props.queryRuleType === 0) {
            const data = { query: searchValue, queryRuleType: 0 };
            dispatch(searchQueryRules(getAdminApiBaseUrl(), data));
        } else if (props.queryRuleType === 2) {
            const data = { synonyms: searchValue };
            dispatch(retrieveSynonym(getAdminApiBaseUrl(), data));
        } else if (props.queryRuleType === 4) {
            if (fastLinkState.actionCreate) {
                const data = { query: searchValue == "" ? "all" : searchValue };
                dispatch(retrieveFastLink(getAdminApiBaseUrl(), data));
            } else {
                const data = {
                    query: searchValue == "" ? "all" : searchValue,
                    isCreateOrGetFastLink: true,
                };
                dispatch(retrieveFastLink(getAdminApiBaseUrl(), data));
            }
        } else if (props.queryRuleType === 5) {
            const data = {
                query: searchValue == "" ? "all" : searchValue,
                page: pageNumber,
                profile: currentProfile
            };
            dispatch(retrieveNavigation(getAdminApiBaseUrl(), data));
        } else if (props.queryRuleType === 7) {
            const data = { query: searchValue == "" ? "" : searchValue };
            dispatch(retrieveUserGroups(getAdminApiBaseUrl(), data));
        } else if (props.queryRuleType === 8) {
            const data = { query: searchValue == "" ? "all" : searchValue };
            dispatch(retrieveContent(getAdminApiBaseUrl(), data));
        } else if (props.queryRuleType === 9) {
            const data = { query: searchValue == "" ? "all" : searchValue };
            dispatch(retrieveContent(getAdminApiBaseUrl(), data));
        } else if (props.queryRuleType === 10) {
            const data = { query: searchValue == "" ? "all" : searchValue };
            dispatch(retrieveSuggestion(getAdminApiBaseUrl(), data));
        }
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
        if (event.keyCode === 13) {
            setPageNumber(1);
            searchFunction()
        }
    }
    function deleteButtonColumn(
        index: number,
        queryRule: IQueryRule
    ): JSX.Element | null {
        if (props.isReadOnly) {
            return null;
        }

        return (
            <td>
                <div className="action-button-column text-center">
                    <Button
                        key={index}
                        className="action-link-button link-button"
                        id={`delete-${index}`}
                        onClick={() => onDeleteButtonClick(queryRule.id)}
                    >
                        <i className="fas fa-times-circle"></i>
                    </Button>
                </div>
            </td>
        );
    }

    function deleteButtonColumnHeader(): JSX.Element | null {
        if (props.isReadOnly) {
            return null;
        }
        if (props.queryRuleType === 0 && handleDeleteFeature) {
            return (
                <th scope="col" className="text-center align-middle">
                    Delete
                </th>
            );
        }
        if (props.queryRuleType === 1 && handleDeleteBootsAndBlock) {
            return (
                <th scope="col" className="text-center align-middle">
                    Delete
                </th>
            );
        }
        return <></>;
    }
    function removeParenthesesData(str: string): string {
        return (str || '').replace(/\((.*?)\)/g, '');
    }

    const queryRuleElements: (JSX.Element | null)[] = queryRules.map(
        (queryRule, index) => {
            if (!queryRule) {
                return null;
            }
            return (
                <tr
                    className={`table-row ${isQueryRuleSelected(queryRule) ? "selected" : ""
                        }`}
                    key={`${queryRule.id}`}
                >
                    <td
                        onClick={() => {
                            onTableRowClick(queryRule);
                        }}
                    >
                        {queryRule.name}
                    </td>
                    {isFeature ? (
                        <td
                            onClick={() => {
                                onTableRowClick(queryRule);
                            }}
                            title={queryRule.payload}
                            className="content-column"
                        >
                            {removeParenthesesData(queryRule.payload)}
                        </td>
                    ) : null}
                    <td
                        onClick={() => {
                            onTableRowClick(queryRule);
                        }}
                    >
                        {new Date(queryRule.datestart).toLocaleDateString()}
                    </td>
                    <td
                        onClick={() => {
                            onTableRowClick(queryRule);
                        }}
                    >
                        {new Date(queryRule.dateend).toLocaleDateString()}
                    </td>
                    {props.queryRuleType === 0 &&
                        handleDeleteFeature &&
                        deleteButtonColumn(index, queryRule)}
                    {props.queryRuleType === 1 &&
                        handleDeleteBootsAndBlock &&
                        deleteButtonColumn(index, queryRule)}
                </tr>
            );
        }
    );

    const boostblockElements: (JSX.Element | null)[] = queryRules.reduce<JSX.Element[]>((acc, queryRule, index) => {
        if (!queryRule || queryRule.type != QueryRuleType.Boost) return acc;

        // Find duplicate queryRule based on name, startDate, endDate, and conditions
        const duplicateQueryRule = queryRules.find(
            (qr, i) =>
                i !== index &&
                qr.name === queryRule.name &&
                qr.profiles !== queryRule.profiles &&
                qr.profiles[0] !== queryRule.profiles[0] &&
                qr.type === QueryRuleType.Boost &&
                new Date(qr.datestart).getTime() === new Date(queryRule.datestart).getTime() &&
                new Date(qr.dateend).getTime() === new Date(queryRule.dateend).getTime() &&
                JSON.stringify(qr.conditions) === JSON.stringify(queryRule.conditions)
        );

        // If duplicate is found, modify the current queryRule's properties
        if (duplicateQueryRule) {
            if (duplicateQueryRule?.id2) return acc;
            queryRule = {
                ...queryRule,
                payload2: duplicateQueryRule.payload,
                id2: duplicateQueryRule.id,
                profiles: [queryRule.profiles[0], duplicateQueryRule.profiles[0]],
            };
            queryRules[index] = queryRule;

        }

        // Render the queryRule if it's not a duplicate
        acc.push(
            <tr
                className={`table-row ${isQueryRuleSelected(queryRule) ? "selected" : ""}`}
                key={`${queryRule.id}`}
            >
                <td
                    onClick={() => {
                        onTableRowClick(queryRule);
                    }}
                >
                    {queryRule.profiles.length > 1 ? `${queryRule.name} (${queryRule.profiles[0]} + ${queryRule.profiles[1]})` : queryRule.name}
                </td>
                {isFeature ? (
                    <td
                        onClick={() => {
                            onTableRowClick(queryRule);
                        }}
                        title={queryRule.payload}
                        className="content-column"
                    >
                        {removeParenthesesData(queryRule.payload)}
                    </td>
                ) : null}
                <td
                    onClick={() => {
                        onTableRowClick(queryRule);
                    }}
                >
                    {new Date(queryRule.datestart).toLocaleDateString()}
                </td>
                <td
                    onClick={() => {
                        onTableRowClick(queryRule);
                    }}
                >
                    {new Date(queryRule.dateend).toLocaleDateString()}
                </td>
                {props.queryRuleType === 0 && handleDeleteFeature && deleteButtonColumn(index, queryRule)}
                {props.queryRuleType === 1 && handleDeleteBootsAndBlock && deleteButtonColumn(index, queryRule)}
            </tr>
        );

        return acc;
    }, []);


    function onFormFieldChange(model: OnChangeModel): void {
        let value = model.value.toString();
        setSearchValue(value);

        // Filter the list of QueryRules to those matching the name typed into the search field.
        let queryRules = queryRulesState.queryRules.filter(
            (queryRule) =>
                queryRule.type === props.queryRuleType &&
                queryRule.name.toLowerCase().indexOf(value.toLowerCase()) >= 0
        );

        if (selectedProfile && selectedProfile !== "") {
            queryRules = queryRules.filter(
                (queryRule) =>
                    queryRule.profiles &&
                    queryRule.profiles.includes(selectedProfile)
            );
        }

        setQueryRules(queryRules);
    }

    function getQueryRuleTypeTitle(title: number): string {
        let queryTitle: string = "";
        if (title === 0) {
            queryTitle = "Featured Content";
        } else if (title === 1) {
            queryTitle = "Boosts and Blocks";
        } else if (title === 2) {
            queryTitle = "Control Panel";
        } else if (title === 3) {
            queryTitle = "Fast Links";
        } else if (title === 4) {
            queryTitle = "Navigation";
        } else if (title === 6) {
            queryTitle = "Group Permission";
        } else {
            queryTitle = "User Groups";
        }
        return queryTitle;
    }

    // Get list of profiles actually used in the data (kept for legacy use)
    const getAvailableProfilesFromData = (): string[] => {
        const profilesSet = new Set<string>();

        queryRulesState.queryRules.forEach((q) => {
            if (q.profiles && Array.isArray(q.profiles)) {
                q.profiles.forEach(p => {
                    profilesSet.add(p);
                });
            }
        });

        const result = Array.from(profilesSet).sort();
        return ["", ...result];
    };
    const getAvailableProfilesFromSettings = (): { name: string; title: string }[] => {
        const settingsProfiles = adminSettingsState?.adminSettings?.availableProfiles || [];
        const options = settingsProfiles.map(p => ({ name: p.name, title: p.title || p.name }));
        const allEntry = options.find(o => o.name === "");
        if (allEntry) {
            const rest = options.filter(o => o.name !== "");
            const seen = new Set<string>();
            const uniqueRest: { name: string; title: string }[] = [];
            rest.forEach(o => {
                if (!seen.has(o.name)) {
                    seen.add(o.name);
                    uniqueRest.push(o);
                }
            });
            return [allEntry, ...uniqueRest];
        }

        const rest = options.filter(o => o.name !== "");
        const seen = new Set<string>();
        const uniqueRest: { name: string; title: string }[] = [];
        rest.forEach(o => {
            if (!seen.has(o.name)) {
                seen.add(o.name);
                uniqueRest.push(o);
            }
        });
        return [{ name: '', title: 'Default Profile' }, ...uniqueRest];
    };

    function searchFieldContent(page?: string): JSX.Element | null {
        if (props.isReadOnly || props.queryRuleType === 9) {

            return null;

        }

        return (
            <div className="form-row">
                <div
                    className={
                        "form-group col-md-12 " +
                        (page ? "control-search d-flex justify-content-between" : "")
                    }
                    style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}
                >
                    <div style={{ flex: 1 }}>
                        <TextInput
                            id="input_search"
                            value={searchValue}
                            onKeyDown={handleKeyDown}
                            field="search"
                            onChange={onFormFieldChange}
                            required={false}
                            maxLength={250}
                            placeholder={`Search for ${page ? "URL" : queryRuleTypeTitle + "..."
                                }`}
                            autofocus={true}
                            hideLabel
                        />
                    </div>

                    {queryRuleTypeTitle === "Navigation" && (
                        <div style={{ minWidth: 220 }}>
                            <select
                                className="form-control"
                                value={selectedProfile}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setSelectedProfile(val);
                                    setPageNumber(1);
                                    // Pass profile value directly to searchFunction to avoid async state delay
                                    searchFunction(1, val);
                                }}
                            >
                                {getAvailableProfilesFromSettings().map((profile) => (
                                    <option key={profile.name} value={profile.name}>
                                        {profile.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {page === "control-pane" && (
                        <div>
                            <button
                                className="btn btn-secondary"
                                onClick={() => handleGetControlPain(searchValue)}
                            >
                                Search
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    function sortQueryRules(listSortState: IListSortState): void {
        // Toggle the sort.
        let isAscending: boolean = !listSortState.isAscending;

        // Save it in state.
        setQueryRulesListSortState({
            ...queryRulesListSortState,
            [listSortState.fieldName]: {
                fieldName: listSortState.fieldName,
                isAscending: !listSortState.isAscending,
            },
        });

        let sortedQueryRules: IQueryRule[] = [...queryRulesState.queryRules].filter(
            (q) => q.type === props.queryRuleType
        );

        let sortType: boolean | "asc" | "desc" = isAscending ? "asc" : "desc";
        sortedQueryRules = _.orderBy(
            sortedQueryRules,
            [listSortState.fieldName],
            [sortType]
        );

        setQueryRules(sortedQueryRules);
    }

    return (

        <div>
            {props.queryRuleType !== 6 && searchFieldContent(props.page)}
            {/*{props.queryRuleType == 5 &&*/}
            {/*  navigationState?.navigationList?.body?.featured?.map(*/}
            {/*    (featured: IFeaturedContent) => (*/}
            {/*      <div className="mb-3">*/}
            {/*        <label className="font-weight-bold">Featured Content:</label>{" "}*/}
            {/*        {featured.content}*/}
            {/*      </div>*/}
            {/*    )*/}
            {/*  )}*/}
            <div className="table-responsive shadow portlet">
                {props.queryRuleType === 2 && <Synonym />}
                {props.queryRuleType === 3 && <ControlPanel />}
                {props.queryRuleType === 4 && <FastLink />}
                {props.queryRuleType === 5 && <Navigation />}
                {props.queryRuleType === 6 && <UserPermission />}
                {props.queryRuleType === 7 && <UserGroup />}
                {props.queryRuleType === 8 && <ContentEnhancement />}
                {props.queryRuleType === 9 && <ContentEnhancementDetail />}
                {props.queryRuleType === 10 && <Suggestion />}
                {props.queryRuleType === 0 && (
                    <table className="table">

                        {permissionsChecked && handleViewFeature ? (

                            <>
                                <thead className="thead-dark">
                                    <tr>
                                        <th scope="col" className="align-middle">
                                            Name
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="sort-button"
                                                onClick={() =>
                                                    sortQueryRules(queryRulesListSortState.name)
                                                }
                                            >
                                                <i className="fas fa-sort"></i>
                                            </Button>
                                        </th>
                                        <th scope="col" className="align-middle">
                                            Start Date
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="sort-button"
                                                onClick={() =>
                                                    sortQueryRules(queryRulesListSortState.datestart)
                                                }
                                            >
                                                <i className="fas fa-sort"></i>
                                            </Button>
                                        </th>
                                        <th scope="col" className="align-middle">
                                            End Date
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="sort-button"
                                                onClick={() =>
                                                    sortQueryRules(queryRulesListSortState.dateend)
                                                }
                                            >
                                                <i className="fas fa-sort"></i>
                                            </Button>
                                        </th>
                                        {deleteButtonColumnHeader()}
                                    </tr>
                                </thead>
                                <tbody>{queryRuleElements}</tbody>
                            </>
                        ) : (
                            <div className="p-4">
                                You do not have the permission to view Feature Content Information
                            </div>
                        )}
                    </table>
                )}

                {props.queryRuleType === 1 && (
                    <table className="table">
                        {permissionsChecked && handleViewBootsAndBlock ? (
                            <>
                                <thead className="thead-dark">
                                    <tr>
                                        <th scope="col" className="align-middle">
                                            Name
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="sort-button"
                                                onClick={() =>
                                                    sortQueryRules(queryRulesListSortState.name)
                                                }
                                            >
                                                <i className="fas fa-sort"></i>
                                            </Button>
                                        </th>
                                        {isFeature && (
                                            <th scope="col" className="align-middle">
                                                Content
                                            </th>
                                        )}
                                        <th scope="col" className="align-middle">
                                            Start Date
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="sort-button"
                                                onClick={() =>
                                                    sortQueryRules(queryRulesListSortState.datestart)
                                                }
                                            >
                                                <i className="fas fa-sort"></i>
                                            </Button>
                                        </th>
                                        <th scope="col" className="align-middle">
                                            End Date
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="sort-button"
                                                onClick={() =>
                                                    sortQueryRules(queryRulesListSortState.dateend)
                                                }
                                            >
                                                <i className="fas fa-sort"></i>
                                            </Button>
                                        </th>
                                        {deleteButtonColumnHeader()}
                                    </tr>
                                </thead>
                                <tbody>{boostblockElements}</tbody>
                            </>
                        ) : (
                            <div className="p-4">
                                You do not have the permission to view Boost And Block Information
                            </div>
                        )}
                    </table>
                )}

                <ConfirmDeletionModal
                    key={queryRulesState.selectedQueryRule?.id}
                    showConfirmationModal={deleteConfirmationModalShow}
                    onCancel={onCancelDeleteConfirmationModal}
                    onConfirm={onConfirmQueryRuleDeletion}
                    itemName={queryRulesState.selectedQueryRule?.name}
                    size="lg"
                ></ConfirmDeletionModal>
            </div>

        </div>
    );
}

export default ({
    onSelect,
    queryRuleType,
    baseApiUrl,
    isReadOnly,
    page,
}: {
    onSelect?: (queryRule: IQueryRule) => void;
    queryRuleType: QueryRuleType;
    baseApiUrl?: string;
    isReadOnly?: boolean;
    setSynonymModalShow?: Function;
    page?: string;
}) => (
    <QueryRulesList
        queryRuleType={queryRuleType}
        onSelect={onSelect}
        baseApiUrl={baseApiUrl}
        isReadOnly={isReadOnly}
        page={page}
    ></QueryRulesList>
);
