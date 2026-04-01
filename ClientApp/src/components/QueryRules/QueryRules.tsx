import React, {
    Dispatch,
    useCallback,
    useEffect,
    useState,
    KeyboardEvent,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import * as uuid from "uuid";
import LoadingIndicator from "../../common/components/LoadingIndicator";
import TopCard from "../../common/components/TopCard";
import { MessageAlertType } from "../../common/types/MessageAlert.types";
import {
    changeSelectedQueryRule,
    clearSelectedQueryRule,
    getQueryRules,
    getQueryRuleTitle,
    saveQueryRule,
    deleteQueryRule2Silent,
    setQueryRuleModificationState,
} from "../../store/actions/queryrules.actions";
import { updateCurrentPath } from "../../store/actions/root.actions";
import {
    removeSynonymUpdate,
    getDocumentCount,
} from "../../store/actions/synonym.action";
import { normalizeAdminApiUrl } from "../../store/actions/adminsettings.actions";
import {
    getDocumentCountFast,
    retrieveFastLinkAddCategories,
    updateCategories,
} from "../../store/actions/fastlink.action";
import {
    removeNavigationUpdate,
    getDocumentCountNavigation,
} from "../../store/actions/navigation.action";
import {
    removeSuggestionUpdate,
    getDocumentCountSuggestion
} from "../../store/actions/suggestion.action";
import {
    getDocumentCountContent,
} from "../../store/actions/content.action";
import { IAdminSettingsState } from "../../store/models/adminsettingsstate.interface";
import { IQueryRule } from "../../store/models/queryrule.interface";
import { QueryRuleModificationStatus } from "../../store/models/queryrulemodificationstatus";
import { IQueryRulesState } from "../../store/models/queryrulesstate.interface";
import {
    QueryRuleType,
    UserPermissionEnum,
} from "../../store/models/queryruletype";
import { IStateType } from "../../store/models/root.interface";
import { ISynonymState } from "../../store/models/synonym.interface";
import { IContentState } from "../../store/models/content.interface";
import QueryRulesMessageAlert from "../QueryRules/QueryRuleMessageAlert";
import SynonymModal from "../Synonym/SynonymModal";
import "./QueryRules.css";
import QueryRulesList from "./QueryRulesList";
import QueryRuleWizardModal from "./QueryRuleWizardModal";
import FastLinksModal from "../FastLinks/FastLinksModal";
import SuggestionModal from "../Suggestion/SuggestionModal"
import {
    IFastLinksState,
    FastLinks as IFastLink,
    PutCategories,
    UpdateFastLinks,
    UpdateCategories,
    FastLinks,
} from "../../store/models/fastlinks";
import NavigationModal from "../Navigation/NavigationModal";
import { INavigationState } from "../../store/models/navigation";
import {
    retrieveFastLink,
    actionCreate,
    retrieveCategories,
} from "../../store/actions/fastlink.action";
import { Button } from "react-bootstrap";
import TextInput from "../../common/components/TextInput";
import { OnChangeModel } from "../../common/types/Form.types";
import CategoriesModal from "../FastLinks/CategoriesModal";
import { IUserPermissionState } from "../../store/models/userpermission.interface";
import { retrieveGetPermissionScreen } from "../../store/actions/userpermission.action";
import { IUserGroupsState } from "../../store/models/usergroups.interface";
import {
    getDocumentCountUserGroups,
    removeUserGroupUpdate,
} from "../../store/actions/usergroups.action";
import UserGroupModal from "../UserGroups/UserGroupModal";
import { IControlPaneState } from "../../store/models/controlPanel";
import ContentEnhancementInfo from "../ContentEnhancement/ContentEnhancementInfo";
import { ISuggestionState } from "../../store/models/suggestion";

export type QueryRulesProps = {
    queryRuleType: QueryRuleType;
    description?: string;
    setSynonymModalShow?: Function;
    setUserGroupModalShow?: Function;
    setCategories?: Function;
    page?: string;
};

export interface IFastLinkSequence {
    id: string;
    value: Number;
}

interface ShowAdminSidebar {
    featuredContent: IsEnabled;
    boostsAndBlocks: IsEnabled;
    synonym: IsEnabled;
    fastLinks: IsEnabled;
    navigation: IsEnabled;
    controlPanel: IsEnabled;
    contentEnhancement: IsEnabled;
    searchSuggestion: IsEnabled;
}

interface IsEnabled {
    isEnabled: boolean;
}

const QueryRules: React.FC<QueryRulesProps> = (props) => {
    const dispatch: Dispatch<any> = useDispatch();
    const documentCount: number = useSelector(
        (state: IStateType) => state.controlPain.documentCount
    );

    // AdminSettings.
    // Gets the API base URL from configuration.
    const adminSettingsState: IAdminSettingsState = useSelector(
        (state: IStateType) => state.adminSettingsState
    );

    // Query Rules
    const queryRulesState: IQueryRulesState = useSelector(
        (state: IStateType) => state.queryRulesState
    );
    const synonymState: ISynonymState = useSelector(
        (state: IStateType) => state.synonymStateState
    );
    const fastLinkState: IFastLinksState = useSelector(
        (state: IStateType) => state.fastLinkStateState
    );
    const navigationState: INavigationState = useSelector(
        (state: IStateType) => state.navigationState
    );
    const actionCreateState: boolean = useSelector(
        (state: IStateType) => state.fastLinkStateState.actionCreate
    );
    const userPermissionState: IUserPermissionState = useSelector(
        (state: IStateType) => state.permissionState
    );
    const userGroupsState: IUserGroupsState = useSelector(
        (state: IStateType) => state.userGroupsState
    );
    const controlPain: IControlPaneState = useSelector(
        (state: IStateType) => state.controlPain
    );
    const contentState: IContentState = useSelector(
        (state: IStateType) => state.contentState
    );
    const suggestionState: ISuggestionState = useSelector(
        (state: IStateType) => state.suggestionState
    );

    const showAdminSidebarData: ShowAdminSidebar = {
        featuredContent: { isEnabled: false },
        boostsAndBlocks: { isEnabled: false },
        synonym: { isEnabled: false },
        fastLinks: { isEnabled: false },
        navigation: { isEnabled: false },
        controlPanel: { isEnabled: false },
        contentEnhancement: { isEnabled: false },
        searchSuggestion: { isEnabled: false }
    };
    const [showAdminSidebar, setShowAdminSidebar] =
        useState(showAdminSidebarData);

    useEffect(() => {
        let showAdminSidebar = adminSettingsState.adminSettings.showAdminSidebar;

        if (showAdminSidebar) {
            setShowAdminSidebar(showAdminSidebar);
        }
    }, [adminSettingsState.adminSettings.showAdminSidebar]);
    // Filter the query rules by type e.g. feature or boost.
    const queryRules: IQueryRule[] = queryRulesState.queryRules.filter(
        (queryRule) => queryRule.type === props.queryRuleType
    );
    const numberItemsCount: number = queryRules.length;
    const queryRuleType: QueryRuleType = props.queryRuleType;
    const isFeature: boolean = queryRuleType === QueryRuleType.Feature;
    const queryRuleTypeTitle: string = getQueryRuleTitle(queryRuleType);
    const queryRuleTypeText: string = QueryRuleType[queryRuleType];
    const topCardIcon: string = isFeature ? "newspaper" : "arrow-circle-up";

    // Loading spinner text.
    const loadingIndicatorText: string = `${queryRulesState.isLoading ? "Loading" : "Updating"
        } ${queryRuleTypeTitle}...`;
    const isLoadingOrUpdating: boolean =
        queryRulesState.isLoading || queryRulesState.isUpdating;

    // Modals.
    const [wizardModalShow, setWizardModalShow] = useState(false);
    const [synonymModalShow, setSynonymModalShow] = useState(false);
    const [userGroupModalShow, setUserGroupModalShow] = useState(false);
    const [fastLinkModalShow, setFastLinkModalShow] = useState(false);
    const [navigationModalShow, setNavigationModalShow] = useState(false);
    const [suggestionModalShow, setSuggestionModalShow] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [selectedQueryRule, setSelectedQueryRule] = useState<IQueryRule>(
        getDefaultQueryRule()
    );
    const [searchValue, setSearchValue] = useState("");
    const [searched, setSearched] = useState(false);
    const [categoriesModalShow, setCategoriesModalShow] = useState(false);
    const [checkAddFastLinkShow, setCheckAddFastLinkShow] = useState<string[]>(
        []
    );

    const [listFastLinksData, setListFastLinksData] = useState<Array<FastLinks>>(
        []
    );
    const [listValueSequence, setListValueSequence] = useState<
        IFastLinkSequence[]
    >([]);

    const [categoryName, setCategoryName] = useState("");
    const [categoryDescription, setCategoryDescription] = useState("");
    const [handleAddNavigation, setHandleAddNavigation] = useState(false);
    const [handleAddSynonym, setHandleAddSynonym] = useState(false);
    const [handleAddSuggestion, setHandleAddSuggestion] = useState(false);
    const [handleAddFastLinks, setHandleAddFastLinks] = useState(false);
    const [handleAddBootsAndBlock, setHandleBootsAndBlock] = useState(false);
    const [handleAddFeature, setHandleAddFeature] = useState(false);
    const [handleAddControlPanelUserGroups, setHandleAddControlPanelUserGroups] =
        useState(false);

    // Get the URL by retrieving from the Configuration Settings API.
    const getAdminApiBaseUrl = useCallback((): string => {
        return normalizeAdminApiUrl(adminSettingsState.adminSettings.searchAdminApiUrl);
    }, [adminSettingsState.adminSettings]);

    const handleGetCategories = (search = "all") => {
        const data = { query: search };
        let baseApiUrl = adminSettingsState?.adminSettings?.searchAdminApiUrl;
        dispatch(retrieveCategories(baseApiUrl, data));
    };

    // This is effectively the constructor fired when the component is loaded the first time.
    useEffect(() => {
        let baseApiUrl = adminSettingsState.adminSettings.searchAdminApiUrl;

        if (baseApiUrl?.length > 0) {
            dispatch(getQueryRules(baseApiUrl));
            dispatch(getDocumentCount(baseApiUrl));
            dispatch(clearSelectedQueryRule());
            dispatch(getDocumentCountFast(baseApiUrl));
            dispatch(getDocumentCountUserGroups(baseApiUrl));
            dispatch(getDocumentCountNavigation(baseApiUrl));
            {
                showAdminSidebar?.contentEnhancement?.isEnabled && (
                    dispatch(getDocumentCountContent(baseApiUrl))
                )
            }
            dispatch(getDocumentCountSuggestion(baseApiUrl));
            dispatch(updateCurrentPath(`${queryRuleTypeText.toLowerCase()}`, "list"));
            handleGetCategories();
            if (window.location.pathname.includes("/feature")) {
                handleGetScreenPermissionsFeature(userGroupsState.groups);
            }
            else if (window.location.pathname.includes("/boost")) {
                handleGetScreenPermissionsBootsAndBlock(userGroupsState.groups);
            }
        }
    }, [
        dispatch,
        queryRuleType,
        queryRuleTypeText,
        adminSettingsState.adminSettings.searchAdminApiUrl,
        userGroupsState.groups
    ]);

    useEffect(() => {
        if (!searched && fastLinkState?.fastLinkData?.body?.result) {
            if (fastLinkState?.fastLinkListUpdate?.fastLinks) {
                let resultList = fastLinkState?.fastLinkData?.body?.result;
                let updateList = fastLinkState?.fastLinkListUpdate?.fastLinks;
                const transformedList1 = updateList?.map(item => ({
                    ...item,
                    rowKey: item.fastLinkId!,
                    id: item.fastLinkId!,
                }));
                const toAdd = transformedList1?.filter(item1 =>
                    !resultList.some(item2 => item2.id === item1.id)
                );
                setListFastLinksData([...fastLinkState?.fastLinkData?.body?.result, ...toAdd]);
            }
            else {
                setListFastLinksData([...fastLinkState?.fastLinkData?.body?.result]);
            }
        }
    }, [fastLinkState]);

    useEffect(() => {
        if (fastLinkState && fastLinkState?.fastLinkListUpdate) {
            if (!categoryName) {
                setCategoryName(fastLinkState?.fastLinkListUpdate.categoryName);
            }
            if (!categoryDescription) {
                setCategoryDescription(
                    fastLinkState?.fastLinkListUpdate.categoryDescription
                );
            }
            if (!searched && fastLinkState?.fastLinkListUpdate?.fastLinks) {
                let listIdFastLinks = fastLinkState?.fastLinkListUpdate?.fastLinks?.map(
                    (item) => {
                        return item.fastLinkId;
                    }
                );
                setCheckAddFastLinkShow(listIdFastLinks);
                let listValueSequence =
                    fastLinkState?.fastLinkListUpdate?.fastLinks?.map((item) => {
                        return {
                            id: item.fastLinkId,
                            value: item.sequence,
                        };
                    });
                setListValueSequence(listValueSequence);
            }
        }
    }, [fastLinkState]);

    useEffect(() => {
        if (
            userPermissionState?.getUserPermissionScreen?.result?.name == "Navigation" && adminSettingsState.adminSettings.userPermissionEnabled
        ) {
            setHandleAddNavigation(
                userPermissionState?.getUserPermissionScreen?.result?.view &&
                userPermissionState?.getUserPermissionScreen?.result?.edit
            );
        }
        if (
            userPermissionState?.getUserPermissionScreen?.result?.name == "Synonym" && adminSettingsState.adminSettings.userPermissionEnabled
        ) {
            setHandleAddSynonym(
                userPermissionState?.getUserPermissionScreen?.result?.view &&
                userPermissionState?.getUserPermissionScreen?.result?.edit
            );
        }
        if (
            userPermissionState?.getUserPermissionScreen?.result?.name == "SearchSuggestion" && adminSettingsState.adminSettings.userPermissionEnabled
        ) {
            setHandleAddSuggestion(
                userPermissionState?.getUserPermissionScreen?.result?.view &&
                userPermissionState?.getUserPermissionScreen?.result?.edit
            );
        }
        if (
            userPermissionState?.getUserPermissionScreen?.result?.name == "FastLinks" && adminSettingsState.adminSettings.userPermissionEnabled
        ) {
            setHandleAddFastLinks(
                userPermissionState?.getUserPermissionScreen?.result?.view &&
                userPermissionState?.getUserPermissionScreen?.result?.edit
            );
        }
        if (
            userPermissionState?.getUserPermissionScreen?.result?.name == "Feature" && adminSettingsState.adminSettings.userPermissionEnabled
        ) {
            setHandleAddFeature(
                userPermissionState?.getUserPermissionScreen?.result?.view &&
                userPermissionState?.getUserPermissionScreen?.result?.edit
            );
        }
        if (userPermissionState?.getUserPermissionScreen?.result?.name == "Boost" && adminSettingsState.adminSettings.userPermissionEnabled) {
            setHandleBootsAndBlock(
                userPermissionState?.getUserPermissionScreen?.result?.view &&
                userPermissionState?.getUserPermissionScreen?.result?.edit
            );
        }
        if (
            userPermissionState?.getUserPermissionScreen?.result?.name ==
            "ControlPanelUserGroups" && adminSettingsState.adminSettings.userPermissionEnabled
        ) {
            setHandleAddControlPanelUserGroups(
                userPermissionState?.getUserPermissionScreen?.result?.view &&
                userPermissionState?.getUserPermissionScreen?.result?.edit
            );
        }
        else if (!adminSettingsState.adminSettings.userPermissionEnabled) {
            setHandleAddNavigation(true);
            setHandleAddSynonym(true);
            setHandleAddSuggestion(true);
            setHandleAddFastLinks(true);
            setHandleAddFeature(true);
            setHandleBootsAndBlock(true);
            setHandleAddControlPanelUserGroups(true);
        }
    }, [userPermissionState?.getUserPermissionScreen?.result, adminSettingsState.adminSettings.userPermissionEnabled]);

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

    function onQueryRuleSelect(queryRule: IQueryRule): void {
        // Make a deep copy of the object. Previously this was updating the object stored in redux store state.
        // See #2911 for details: https://dev.azure.com/Search365/Azure%20Search365%20Platform/_workitems/edit/2911
        let queryRuleSelected = JSON.parse(JSON.stringify(queryRule));

        setSelectedQueryRule(queryRuleSelected);
        setIsEdit(true);
        dispatch(changeSelectedQueryRule(queryRule));
        dispatch(setQueryRuleModificationState(QueryRuleModificationStatus.Edit));
        setWizardModalShow(true);
    }

    // Bootstrap Modal.
    function getDefaultQueryRule(): IQueryRule {
        let now = new Date();
        let yesterday = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - 1
        );

        // Set the dateStart to yesterday to ensure creating a QueryRule will be active today when generating a range value
        // that can be compared to a GMT datetime value in the search index.
        let dateStart = yesterday.toISOString();
        // Adds a year to the current date.
        let dateEnd = new Date(
            now.getFullYear() +
            adminSettingsState.adminSettings.defaultEndDateYearIncrement,
            now.getMonth(),
            now.getDate()
        ).toISOString();

        // Create a Guid for the initial ID.
        let id = uuid.v4();

        // Initialise a new query rule.
        const queryRule = {
            id: id,
            id2: "",
            name: "",
            type: queryRuleType,
            payload: "",
            payload2: "",
            datestart: dateStart,
            dateend: dateEnd,
            profiles: [],
            conditions: [],
        };

        return queryRule;
    }

    function addQueryRule(): void {
        let queryRule = getDefaultQueryRule();
        setSelectedQueryRule(queryRule);
        setIsEdit(false);
        dispatch(setQueryRuleModificationState(QueryRuleModificationStatus.Create));
        setWizardModalShow(true);
    }

    function handleOpenModal(): void {
        queryRuleTypeTitle === "Synonym"
            ? addSynonym()
            : queryRuleTypeTitle === "Navigation"
                ? addNavigation()
                : queryRuleTypeTitle === "Fast Links"
                    ? addFastLinks()
                    : queryRuleTypeTitle === "User Groups"
                        ? addUserGroups()
                        : queryRuleTypeTitle === "Suggestion"
                            ? addSuggestion()
                            : addQueryRule();
    }


    function addSynonym(): void {
        if (handleAddSynonym) {
            dispatch(removeSynonymUpdate());
            setSynonymModalShow(true);
        }
    }

    function addCategories(): void {
        if (handleAddSynonym) {
            dispatch(removeNavigationUpdate());
            setCategoriesModalShow(true);
        }
    }

    function addNavigation(): void {
        if (handleAddSynonym) {
            dispatch(removeNavigationUpdate());
            setNavigationModalShow(true);
        }
    }

    function addSuggestion(): void {
        dispatch(removeSuggestionUpdate());
        setSuggestionModalShow(true);
    }

    function addFastLinks(): void {
        const data = { query: "all" };
        dispatch(retrieveFastLinkAddCategories(getAdminApiBaseUrl(), data));
        dispatch(actionCreate(!actionCreateState));
    }
    function addUserGroups(): void {
        const data = { query: "all" };
        dispatch(removeUserGroupUpdate());
        setUserGroupModalShow(true);
    }
    function closeWizardModal(updatedQueryRule?: IQueryRule): void {
        if (updatedQueryRule) {
            // Only receive the updateQueryRule if the finish button has been clicked in the wizard.
            // Save the QueryRule.
            if (updatedQueryRule?.type === QueryRuleType.Boost && updatedQueryRule.payload2 && updatedQueryRule?.profiles.length > 1) {
                let index2 = queryRulesState.queryRules.findIndex((qr) => qr.id === updatedQueryRule.id2)
                if (index2 > -1) {
                    queryRulesState.queryRules[index2].profiles = [updatedQueryRule.profiles[1]];
                    queryRulesState.queryRules[index2].payload = updatedQueryRule.payload2;
                } else {
                    updatedQueryRule.id2 = uuid.v4();
                    let extraQueryRule = { ...updatedQueryRule, profiles: [updatedQueryRule.profiles[1]], id2: '', id: updatedQueryRule.id2 === '' ? uuid.v4() : updatedQueryRule.id2, payload: updatedQueryRule.payload2 };
                    queryRulesState.queryRules.push(extraQueryRule);
                }
            }
            if (updatedQueryRule?.type === QueryRuleType.Boost && updatedQueryRule.id2 && updatedQueryRule?.profiles.length === 1) {
                let profileIndex = queryRules.find((qr) => qr.id === updatedQueryRule.id)?.profiles.findIndex((profile) => profile === updatedQueryRule?.profiles[0])
                queryRulesState.queryRules = queryRulesState.queryRules.filter((qr) => qr.id !== (profileIndex === 1 ? queryRulesState?.selectedQueryRule?.id : queryRulesState?.selectedQueryRule?.id2));
                dispatch(deleteQueryRule2Silent(getAdminApiBaseUrl(), updatedQueryRule));
                let currentQRindex = queryRulesState.queryRules.findIndex((qr) => qr.id === updatedQueryRule.id);
                queryRulesState.queryRules[currentQRindex] = updatedQueryRule;
            }
            dispatch(
                saveQueryRule(
                    getAdminApiBaseUrl(),
                    updatedQueryRule,
                    queryRulesState.modificationState
                )
            );
        }

        // Close the dialog.
        setWizardModalShow(false);
    }

    function getModificationStatus(): QueryRuleModificationStatus {
        return isEdit
            ? QueryRuleModificationStatus.Edit
            : QueryRuleModificationStatus.Create;
    }

    function onFormFieldChange(model: OnChangeModel): void {
        let value = model.value.toString();
        setSearchValue(value);
    }

    function updateSequence(id: string, value: Number): void {
        let sequence: IFastLinkSequence = {
            id,
            value,
        };
        if (listValueSequence.findIndex((item) => item.id == id) == -1) {
            setListValueSequence((prevState) => [...prevState, sequence]);
        } else {
            const newState = listValueSequence.map((obj) => {
                if (obj.id === id) {
                    return { ...obj, value: value };
                }
                return obj;
            });
            setListValueSequence(newState);
        }
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
        if (event.keyCode === 13) {
            if (props.queryRuleType === 4) {
                setSearched(true);
                const data = { query: searchValue == "" ? "all" : searchValue };
                dispatch(retrieveFastLinkAddCategories(getAdminApiBaseUrl(), data));
            }
        }
    }

    function toggleFastLinkButton(id: string): void {
        let addedFastLink = fastLinkState.fastLinkData?.body?.result.find((item) => item.id == id);
        if (checkAddFastLinkShow.findIndex((item) => item == id) == -1) {
            setCheckAddFastLinkShow((prevState) => [...prevState, id]);
            if (!listFastLinksData.some((item) => item.id == addedFastLink?.id)) setListFastLinksData((prevState) => addedFastLink ? [...prevState, addedFastLink] : [...prevState]);
        } else {
            setCheckAddFastLinkShow(
                checkAddFastLinkShow.filter((item) => item != id)
            );
        }
    }

    function FastLinkData(): JSX.Element {
        return (
            <tbody className="table-controlpain" style={{ background: "#faf5ec" }}>
                {fastLinkState?.fastLinkData?.body?.result?.map(
                    (fastLink: IFastLink, index: number) => (
                        <tr key={index}>
                            <td>{fastLink?.navName}</td>
                            <td>{fastLink.navDescription}</td>
                            <td>{fastLink.navLink}</td>
                            <td>{fastLink.linkType}</td>
                            <td className="action-button-column text-center d-flex justify-content-center">
                                {checkAddFastLinkShow.findIndex(
                                    (item) => item == fastLink?.id
                                ) == -1 ? (
                                    <Button
                                        variant="secondary"
                                        className="boost link-button action-link-button"
                                        onClick={() => toggleFastLinkButton(fastLink?.id)}
                                        title="Add"
                                    >
                                        <i className="fa fa-plus-circle" aria-hidden="true"></i>
                                    </Button>
                                ) : (
                                    <Button
                                        variant="secondary"
                                        className="block link-button action-link-button"
                                        onClick={() => toggleFastLinkButton(fastLink?.id)}
                                        title="Delete"
                                    >
                                        <i className="fa fa-ban" aria-hidden="true"></i>
                                    </Button>
                                )}
                            </td>
                        </tr>
                    )
                )}
            </tbody>
        );
    }

    function DataFastLinksAdd(): JSX.Element {
        return (
            <tbody className="table-controlpain" style={{ background: "#faf5ec" }}>
                {listFastLinksData?.map(
                    (fastLink: IFastLink, index: number) =>
                        checkAddFastLinkShow.findIndex((item) => item == fastLink.id) !=
                        -1 && (
                            <tr key={index}>
                                <td>{fastLink?.navName}</td>
                                <td>{fastLink.navDescription}</td>
                                <td>{fastLink.navLink}</td>
                                <td>{fastLink.linkType}</td>
                                <td>
                                    <input
                                        className="form-control"
                                        placeholder=""
                                        type="number"
                                        value={
                                            fastLinkState?.fastLinkListUpdate?.fastLinks?.find(
                                                (item) => item.fastLinkId == fastLink.id
                                            )?.sequence
                                        }
                                        min={1}
                                        onChange={(e) =>
                                            updateSequence(fastLink?.id, Number(e.target.value))
                                        }
                                    />
                                </td>
                            </tr>
                        )
                )}
            </tbody>
        );
    }

    const handleGetFastLink = async (search = "all") => {
        const data = { query: search };
        await dispatch(retrieveFastLink(getAdminApiBaseUrl(), data));
    };

    const handleCreateCategories = async () => {
        let categoryData: PutCategories = {
            categoryName: categoryName,
            description: categoryDescription,
        };

        let fastLinkList: Array<UpdateFastLinks> = [];

        listFastLinksData?.forEach((fastLinkItem) => {
            if (
                checkAddFastLinkShow.findIndex((item) => item == fastLinkItem.id) != -1
            ) {
                let sequence =
                    listValueSequence?.find((item) => item.id == fastLinkItem.id)
                        ?.value ?? 0;
                let fastLink: UpdateFastLinks = {
                    id: fastLinkItem.id,
                    navName: fastLinkItem.navName,
                    navDescription: fastLinkItem.navDescription,
                    navLink: fastLinkItem.navLink,
                    linkType: fastLinkItem.linkType,
                    sequence: Number(sequence),
                };
                fastLinkList.push(fastLink);
            }
        });

        let data: UpdateCategories = {
            categories: [categoryData],
            fastLink: fastLinkList,
        };

        if (fastLinkList.length > 0) {
            setSearchValue("");
            await dispatch(updateCategories(getAdminApiBaseUrl(), data, true));
            setListFastLinksData([]);
            await handleGetFastLink();
            dispatch(actionCreate(!actionCreateState));
            setCheckAddFastLinkShow([]);
            setListValueSequence([]);
            setCategoryName("");
            setCategoryDescription("");
        }
    };

    const handleCancelAddFastLinks = () => {
        window.location.reload();
    };

    function getPageBody(page?: string): JSX.Element {
        return (
            <div>
                {synonymModalShow && (
                    <SynonymModal
                        title="Create"
                        synonymModalShow={synonymModalShow}
                        setSynonymModalShow={setSynonymModalShow}
                    />
                )}
                {fastLinkModalShow && (
                    <FastLinksModal
                        title="Create"
                        fastLinkModalShow={fastLinkModalShow}
                        setFastLinkModalShow={setFastLinkModalShow}
                    />
                )}
                {navigationModalShow && (
                    <NavigationModal
                        title="Create"
                        navigationModalShow={navigationModalShow}
                        setNavigationModalShow={setNavigationModalShow}
                    />
                )}
                {suggestionModalShow && (
                    <SuggestionModal
                        title="Create"
                        suggestionModalShow={suggestionModalShow}
                        setSuggestionModalShow={setSuggestionModalShow}
                    />
                )}
                {categoriesModalShow && (
                    <CategoriesModal
                        title="Create"
                        categoriesModalShow={categoriesModalShow}
                        setCategoriesModalShow={setCategoriesModalShow}
                    />
                )}
                {userGroupModalShow && (
                    <UserGroupModal
                        title="Create"
                        userGroupModalShow={userGroupModalShow}
                        setUserGroupModalShow={setUserGroupModalShow}
                    />
                )}
                {fastLinkState.actionCreate && props.queryRuleType == 4 ? (
                    <div>
                        <div>
                            <div>
                                <h5 className="m-0 font-weight-bold mb-2">Category Info</h5>
                            </div>
                            <div>
                                <label>Category Name</label>
                                <input
                                    className="form-control"
                                    value={categoryName || ""}
                                    onChange={(e) => setCategoryName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label>Category Description</label>
                                <input
                                    className="form-control"
                                    value={categoryDescription || ""}
                                    onChange={(e) => setCategoryDescription(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="mt-4">
                            <div>
                                <h5 className="m-0 font-weight-bold mb-2">Choose Fast Links</h5>
                            </div>
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
                            <div className="table-responsive shadow portlet mb-3 heightTable">
                                <table className="table">
                                    <thead className="thead-dark">
                                        <tr>
                                            <th scope="col" className="align-middle">
                                                Nav Name
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    className="sort-button"
                                                >
                                                    <i className="fas fa-sort"></i>
                                                </Button>
                                            </th>
                                            <th scope="col" className="align-middle">
                                                Nav Description
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    className="sort-button"
                                                >
                                                    <i className="fas fa-sort"></i>
                                                </Button>
                                            </th>
                                            <th scope="col" className="align-middle">
                                                Nav Link
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    className="sort-button"
                                                >
                                                    <i className="fas fa-sort"></i>
                                                </Button>
                                            </th>
                                            <th scope="col" className="align-middle" style={{ minWidth: "150px" }}>
                                                Link Type
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    className="sort-button"
                                                >
                                                    <i className="fas fa-sort"></i>
                                                </Button>
                                            </th>
                                            <th scope="col" className="align-middle text-center">
                                                Action
                                            </th>
                                        </tr>
                                    </thead>
                                    {FastLinkData()}
                                </table>
                            </div>
                        </div>

                        {checkAddFastLinkShow.length > 0 && (
                            <div className="mt-4">
                                <div>
                                    <h5 className="m-0 font-weight-bold mb-2">Set Sequence</h5>
                                </div>
                                <div className="table-responsive shadow portlet mb-3">
                                    <table className="table">
                                        <thead className="thead-dark">
                                            <tr>
                                                <th scope="col" className="align-middle">
                                                    Nav Name
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        className="sort-button"
                                                    >
                                                        <i className="fas fa-sort"></i>
                                                    </Button>
                                                </th>
                                                <th scope="col" className="align-middle">
                                                    Nav Description
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        className="sort-button"
                                                    >
                                                        <i className="fas fa-sort"></i>
                                                    </Button>
                                                </th>
                                                <th scope="col" className="align-middle">
                                                    Nav Link
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        className="sort-button"
                                                    >
                                                        <i className="fas fa-sort"></i>
                                                    </Button>
                                                </th>
                                                <th scope="col" className="align-middle" style={{ minWidth: "150px" }}>
                                                    Link Type
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        className="sort-button"
                                                    >
                                                        <i className="fas fa-sort"></i>
                                                    </Button>
                                                </th>
                                                <th
                                                    scope="col"
                                                    className="align-middle"
                                                    style={{ minWidth: "250px" }}
                                                >
                                                    Sequence
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        className="sort-button"
                                                    >
                                                        <i className="fas fa-sort"></i>
                                                    </Button>
                                                </th>
                                            </tr>
                                        </thead>
                                        {DataFastLinksAdd()}
                                    </table>
                                </div>
                            </div>
                        )}
                        <div className="mb-5 mr-4 d-flex justify-content-end">
                            <div className="mb-5 d-flex justify-content-end mr-3">
                                <Button
                                    className="btn-modal-synonym"
                                    variant="primary"
                                    onClick={handleCreateCategories}
                                >
                                    Save
                                </Button>
                            </div>
                            <div className="mb-5 d-flex justify-content-end align-items-center">
                                <a
                                    href="/adminui/fast-links"
                                    className="btn-modal-synonym"
                                    onClick={handleCancelAddFastLinks}
                                >
                                    Cancel
                                </a>
                            </div>
                        </div>
                    </div>
                ) : (props.queryRuleType === 9 ? (
                    <ContentEnhancementInfo />
                ) : (
                    props.queryRuleType !== 6 && (
                        <div className="row">
                            <TopCard
                                title={`${page ? "Document " : queryRuleTypeTitle} Count`}
                                text={
                                    page === "control-pane"
                                        ? documentCount?.toLocaleString()
                                        : queryRuleTypeTitle === "Synonym"
                                            ? synonymState.synonymCount
                                            : queryRuleTypeTitle === "Content Enhancement"
                                                ? contentState.contentCount
                                                : queryRuleTypeTitle === "Fast Links"
                                                    ? fastLinkState.fastLinkCount
                                                    : queryRuleTypeTitle === "User Groups"
                                                        ? userGroupsState.userGroupsCount
                                                        : queryRuleTypeTitle === "Navigation"
                                                            ? (localStorage.getItem('CountNavigation') === navigationState.navigationCount.toString()
                                                                ? navigationState.navigationCount
                                                                : localStorage.getItem('CountNavigation') !== "0"
                                                                    ? localStorage.getItem('CountNavigation') || navigationState.navigationCount
                                                                    : navigationState.navigationCount)
                                                            : queryRuleTypeTitle === "Suggestion"
                                                                ? (localStorage.getItem('CountSuggestion') === suggestionState.suggestionCount.toString()
                                                                    ? suggestionState.suggestionCount
                                                                    : localStorage.getItem('CountSuggestion') !== "0"
                                                                        ? localStorage.getItem('CountSuggestion') || suggestionState.suggestionCount
                                                                        : suggestionState.suggestionCount)
                                                                : `${numberItemsCount}`
                                }
                                icon={topCardIcon}
                                class="primary"
                            />
                        </div>
                    )
                )
                )}

                {page === "control-pane" ? (
                    <div className="row">
                        <div className="col-xl-12 col-lg-12">
                            <div className="card shadow mb-4">
                                <div className="card-header py-3">
                                    <h6 className="m-0 font-weight-bold">{queryRuleTypeTitle}</h6>
                                </div>
                                <div className="card-body">
                                    <QueryRulesList
                                        onSelect={onQueryRuleSelect}
                                        page={page}
                                        queryRuleType={props.queryRuleType}
                                        baseApiUrl={getAdminApiBaseUrl()}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="row">
                        <div className="col-xl-12 col-lg-12">
                            {(!actionCreateState && props.queryRuleType == 4) ||
                                props.queryRuleType !== 4 ? (
                                <div className="card shadow mb-4">
                                    {props.queryRuleType !== 6 && (
                                        <div className="card-header py-3">
                                            {queryRuleTypeTitle === "Fast Links" ? (
                                                <h6 className="m-0 font-weight-bold">
                                                    {actionCreateState
                                                        ? "Create Fast Links"
                                                        : queryRuleTypeTitle}
                                                </h6>
                                            ) : (
                                                <h6 className="m-0 font-weight-bold">
                                                    {queryRuleTypeTitle}
                                                </h6>
                                            )}
                                            <div className="header-buttons">
                                                {((props.queryRuleType === 2 && handleAddSynonym) ||
                                                    (props.queryRuleType === 5 && handleAddNavigation) ||
                                                    (props.queryRuleType === 10 && handleAddSuggestion) ||
                                                    (props.queryRuleType === 0 && handleAddFeature) ||
                                                    (props.queryRuleType === 1 &&
                                                        handleAddBootsAndBlock) ||
                                                    (props.queryRuleType === 4 && handleAddFastLinks) ||
                                                    (props.queryRuleType === 7 &&
                                                        handleAddControlPanelUserGroups)) && (
                                                        <button
                                                            id="addQueryRuleButton"
                                                            className="btn btn-secondary"
                                                            onClick={() => {
                                                                handleOpenModal();
                                                            }}
                                                        >
                                                            {actionCreateState && props.queryRuleType == 4 ? (
                                                                "Cancel Create Fast Links"
                                                            ) : (
                                                                <i className="fas fa fa-plus"></i>
                                                            )}
                                                        </button>
                                                    )}
                                            </div>
                                        </div>
                                    )}
                                    <div className={props.queryRuleType == 6 ? "" : "card-body"}>
                                        <QueryRulesList
                                            onSelect={onQueryRuleSelect}
                                            queryRuleType={props.queryRuleType}
                                            baseApiUrl={getAdminApiBaseUrl()}
                                        />
                                    </div>
                                </div>
                            ) : (
                                ""
                            )}
                        </div>
                    </div>
                )
                }

                <QueryRuleWizardModal
                    key={selectedQueryRule.id}
                    wizardShow={wizardModalShow}
                    onWizardHide={closeWizardModal}
                    queryRuleType={props.queryRuleType}
                    modificationStatus={getModificationStatus()}
                    selectedQueryRule={selectedQueryRule}
                    disallowedNames={queryRulesState.queryRules.filter((qr) => qr.type === 1).map(obj => obj.name)}
                ></QueryRuleWizardModal>
            </div >
        );
    }

    return (
        <div className="query-rule">
            {(queryRuleType !== 8 && queryRuleType !== 9 &&
                <h1 className="h3 mb-2 text-gray-800">{queryRuleTypeTitle}</h1>
            )}
            <p className="mb-4">{props.description}</p>

            <QueryRulesMessageAlert
                key={queryRulesState.error}
                type={MessageAlertType.Error}
                message={queryRulesState.error}
            />
            {queryRulesState.error == null && props.queryRuleType == 5 && (
                <QueryRulesMessageAlert
                    key={navigationState.error}
                    type={MessageAlertType.Error}
                    message={navigationState.error}
                />
            )}
            {queryRulesState.error == null && props.queryRuleType == 3 && (
                <QueryRulesMessageAlert
                    key={controlPain.error}
                    type={MessageAlertType.Error}
                    message={controlPain.error}
                />
            )}
            {queryRulesState.error == null && props.queryRuleType == 4 && (
                <QueryRulesMessageAlert
                    key={fastLinkState.error}
                    type={MessageAlertType.Error}
                    message={fastLinkState.error}
                />
            )}

            {isLoadingOrUpdating || queryRulesState.queryRules.length === 0 ? (
                <LoadingIndicator
                    text={loadingIndicatorText}
                    isLoading={isLoadingOrUpdating}
                />
            ) : null}

            {isLoadingOrUpdating ? null : getPageBody(props.page)}
        </div>
    );
};

export default ({
    queryRuleType,
    description,
    setSynonymModalShow,
    page,
}: {
    queryRuleType: QueryRuleType;
    description?: string;
    setSynonymModalShow?: Function;
    page?: string;
}) => (
    <QueryRules
        queryRuleType={queryRuleType}
        description={description}
        setSynonymModalShow={setSynonymModalShow}
        page={page}
    ></QueryRules>
);
