import Button from "react-bootstrap/Button";
import React, { useCallback, useEffect, useState, Dispatch } from "react";
import { IAdminSettingsState } from "../../store/models/adminsettingsstate.interface";
import { useDispatch, useSelector } from "react-redux";
import { IStateType } from "../../store/models/root.interface";
import {
    retrieveSynonym,
    deleteSynonym,
    getSynonymUpdate,
} from "../../store/actions/synonym.action";
import {
    IFastLinksState,
    FastLinks as IFastLink,
    ResultFastLinks as IResultFastLinks,
    FastLinks,
    ResponseFastLinks,
    ResultFastLinks,
    PutCategories,
    CategoryData,
} from "../../store/models/fastlinks";
import {
    actionCreate,
    deleteCategoryFastLink,
    deleteFastLink,
    fastLinkListUpdate,
    getCategoryDataUpdate,
    getFastLinkUpdate,
    retrieveFastLink,
    retrieveFastLinkAddCategories,
    updateCategoriesSequence
} from "../../store/actions/fastlink.action";
import FastLinksModal from "./FastLinksModal";
import { Collapse } from "react-bootstrap";
import { getBaseUrl } from "../../store/actions/adminsettings.actions";
import ConfirmDeletionModal from "../../common/components/ConfirmDeletionModal";
import CategoryDataModal from "./CategoryDataModal";
import { normalizeAdminApiUrl } from "../../store/actions/adminsettings.actions";
import { IUserPermissionState } from "../../store/models/userpermission.interface";
import { retrieveGetPermissionScreen } from "../../store/actions/userpermission.action";
import { UserPermissionEnum } from "../../store/models/queryruletype";
import { IUserGroupsState } from "../../store/models/usergroups.interface";
import * as _ from "lodash";

const FastLink: React.FC = () => {
    const adminSettingsState: IAdminSettingsState = useSelector(
        (state: IStateType) => state.adminSettingsState
    );
    const fastLinkState: IFastLinksState = useSelector(
        (state: IStateType) => state.fastLinkStateState
    );
    const userPermissionState: IUserPermissionState = useSelector(
        (state: IStateType) => state.permissionState
    );
    const userGroupsState: IUserGroupsState = useSelector(
        (state: IStateType) => state.userGroupsState
    );

    const initialBoosts: string[] = [];
    const [boosts, setBoosts] = useState(initialBoosts);

    const defaultPosition: number | undefined = undefined;

    const [fastLinkModalShow, setFastLinkModalShow] = useState(false);
    const [categoryDataModalShow, setCategoryDataModalShow] = useState(false);
    const dispatch: Dispatch<any> = useDispatch();

    const [iDFastLinks, setIdFastLinks] = useState("");
    const [nameFastLinks, setNameFastLinks] = useState("");

    const [iDCategoriesFastLinks, setCategoriesIdFastLinks] = useState("");
    const [shouldCallDeletion, setShouldCallDeletion] = useState(true);
    const [handleViewFastLinks, setHandleViewFastLinks] = useState(false);
    const [handleEditFastLinks, setHandleEditFastLinks] = useState(false);
    const [handleDeleteFastLinks, setHandleDeleteFastLinks] = useState(false);
    const [isUp, setIsUp] = useState(false);
    const [permissionsChecked, setPermissionsChecked] = useState(false);

    // Delete Modal.
    const [deleteConfirmationModalShow, setDeleteConfirmationModalShow] =
        useState(false);

    useEffect(() => {
        if (permissionsChecked && handleViewFastLinks) {
            let baseApiUrl = adminSettingsState.adminSettings.searchAdminApiUrl;
            if (baseApiUrl?.length > 0) {
                handleGetFastLink();
            }
        }
    }, [permissionsChecked, handleViewFastLinks]);

    useEffect(() => {
        if (userGroupsState.groups && adminSettingsState.adminSettings.userPermissionEnabled) {
            handleGetScreenPermissions(userGroupsState.groups);
        }
    }, [userGroupsState.groups]);

    useEffect(() => {
        if (
            userPermissionState?.getUserPermissionScreen?.result?.name == "FastLinks" && adminSettingsState.adminSettings.userPermissionEnabled
        ) {
            setHandleViewFastLinks(
                userPermissionState?.getUserPermissionScreen?.result?.view ||
                userPermissionState?.getUserPermissionScreen?.result?.edit ||
                userPermissionState?.getUserPermissionScreen?.result?.delete
            );
            setHandleEditFastLinks(
                userPermissionState?.getUserPermissionScreen?.result?.edit &&
                userPermissionState?.getUserPermissionScreen?.result?.view
            );
            setHandleDeleteFastLinks(
                userPermissionState?.getUserPermissionScreen?.result?.delete &&
                userPermissionState?.getUserPermissionScreen?.result?.view
            );
            setPermissionsChecked(true);
        }
        else if (!adminSettingsState.adminSettings.userPermissionEnabled) {
            setHandleViewFastLinks(true);
            setHandleEditFastLinks(true);
            setHandleDeleteFastLinks(true);
            setPermissionsChecked(true);
        }
    }, [userPermissionState?.getUserPermissionScreen?.result, adminSettingsState.adminSettings.userPermissionEnabled]);

    const handleGetFastLink = async (search = "all") => {
        const data = { query: search };
        await dispatch(retrieveFastLink(getAdminApiBaseUrl(), data));
    };

    async function changeSequence(categoryIndex: number, fastLinkIndex: number, isUp: boolean, request: ResultFastLinks, categoryData: CategoryData) {
        let category = fastLinkState?.fastLinkList?.body?.result[categoryIndex];
        let newIndex = fastLinkIndex + 1;
        if (isUp) {
            newIndex = fastLinkIndex - 1;
        }
        if (isUp === true && category.fastLinks[fastLinkIndex].sequence == category.fastLinks[fastLinkIndex - 1].sequence) {
            if (category.fastLinks[fastLinkIndex].sequence != 0) {
                category.fastLinks[fastLinkIndex - 1].sequence++;
            } else {
                category.fastLinks[fastLinkIndex].sequence += 2;
                category.fastLinks[fastLinkIndex - 1].sequence += 1;
            }

        }
        if (isUp === false && category.fastLinks[fastLinkIndex].sequence == category.fastLinks[fastLinkIndex + 1].sequence) {
            if (category.fastLinks[fastLinkIndex].sequence != 0) {
                category.fastLinks[fastLinkIndex].sequence++;
            } else {
                category.fastLinks[fastLinkIndex].sequence += 1;
                category.fastLinks[fastLinkIndex + 1].sequence += 2;
            }
        }
        //let tempSequence = category.fastLinks[fastLinkIndex].sequence;
        //category.fastLinks[fastLinkIndex].sequence = category.fastLinks[newIndex].sequence;
        //category.fastLinks[newIndex].sequence = tempSequence;
        let tempID = category.fastLinks[fastLinkIndex].id;
        category.fastLinks[fastLinkIndex].id = category.fastLinks[newIndex].id;
        category.fastLinks[newIndex].id = tempID;
        let tempFastLinkId = category.fastLinks[fastLinkIndex].fastLinkId;
        category.fastLinks[fastLinkIndex].fastLinkId = category.fastLinks[newIndex].fastLinkId;
        category.fastLinks[newIndex].fastLinkId = tempFastLinkId;
        let tempNavLink = category.fastLinks[fastLinkIndex].navLink;
        category.fastLinks[fastLinkIndex].navLink = category.fastLinks[newIndex].navLink;
        category.fastLinks[newIndex].navLink = tempNavLink;
        let tempNavName = category.fastLinks[fastLinkIndex].navName;
        category.fastLinks[fastLinkIndex].navName = category.fastLinks[newIndex].navName;
        category.fastLinks[newIndex].navName = tempNavName;
        let tempNavDescription = category.fastLinks[fastLinkIndex].navDescription;
        category.fastLinks[fastLinkIndex].navDescription = category.fastLinks[newIndex].navDescription;
        category.fastLinks[newIndex].navDescription = tempNavDescription;
        let tempLinkType = category.fastLinks[fastLinkIndex].linkType;
        category.fastLinks[fastLinkIndex].linkType = category.fastLinks[newIndex].linkType;
        category.fastLinks[newIndex].linkType = tempLinkType;
        let tempRowkey = category.fastLinks[fastLinkIndex].rowKey;
        category.fastLinks[fastLinkIndex].rowKey = category.fastLinks[newIndex].rowKey;
        category.fastLinks[newIndex].rowKey = tempRowkey;
        dispatch(fastLinkListUpdate(request));

        var categoryUpdate = {
            categories: [{ id: categoryData.id, categoryName: categoryData.categoryName, description: categoryData.description }],
            fastLink: request.fastLinks
        };
        await dispatch(updateCategoriesSequence(getAdminApiBaseUrl(), categoryUpdate));


    }
    function deleteFastLinkAction(id: any, name: any) {
        if (handleDeleteFastLinks) {
            setDeleteConfirmationModalShow(true);
            setIdFastLinks(id);
            setNameFastLinks(name);
            setShouldCallDeletion(true);
        }
    }
    function deleteCategoryFastLinkAction(id: any): void {
        if (handleDeleteFastLinks) {
            setDeleteConfirmationModalShow(true);
            setCategoriesIdFastLinks(id);
            setShouldCallDeletion(false);
        }
    }
    function handleGetFastLinkToUpdate(fastLink: IFastLink, seq: any) {
        if (handleEditFastLinks) {
            dispatch(getFastLinkUpdate(fastLink, seq));
            setFastLinkModalShow(true);
        }
    }

    function handleGetCategoryDataToUpdate(categoryData: CategoryData) {
        if (handleEditFastLinks) {
            dispatch(getCategoryDataUpdate(categoryData));
            setCategoryDataModalShow(true);
        }
    }


    function handleUpdateCategories(request: ResultFastLinks) {
        if (handleEditFastLinks) {
            const data = { query: "all" };
            dispatch(retrieveFastLinkAddCategories(getAdminApiBaseUrl(), data));
            dispatch(actionCreate(true));
            dispatch(fastLinkListUpdate(request));
        }
    }

    // Delete confirmation modal.
    function onCancelDeleteConfirmationModal(): void {
        setDeleteConfirmationModalShow(false);
    }

    async function onConfirmQueryRuleDeletion(): Promise<void> {
        await dispatch(deleteFastLink(getAdminApiBaseUrl(), iDFastLinks, nameFastLinks));
        setDeleteConfirmationModalShow(false);
        setIdFastLinks("");
        setNameFastLinks("");
        await handleGetFastLink();
    }

    async function onConfirmQueryRuleDeletionCategories(): Promise<void> {
        await dispatch(deleteCategoryFastLink(getAdminApiBaseUrl(), iDCategoriesFastLinks));
        setDeleteConfirmationModalShow(false);
        setCategoriesIdFastLinks("");
        await handleGetFastLink();
    }
    function handleGetScreenPermissions(group: string) {
        const data = { groupMemberShipClaims: group };
        dispatch(
            retrieveGetPermissionScreen(
                getAdminApiBaseUrl(),
                UserPermissionEnum.FastLinks,
                data
            )
        );
    }

    function getSequences(fastlink: IFastLink[], currentSequence: any) {
        if (handleEditFastLinks) {
            var seq: any[] = [];
            fastlink.map((item: IFastLink) => {
                if (item.sequence > 0 && item.sequence !== currentSequence) {
                    seq.push(item.sequence);
                }
            })
            return seq;
        }
    }
    function handleConfirmDeletion() {
        if (shouldCallDeletion) {
            onConfirmQueryRuleDeletion();
        } else {
            onConfirmQueryRuleDeletionCategories();
        }
    }
    const getAdminApiBaseUrl = useCallback((): string => {
        return normalizeAdminApiUrl(adminSettingsState.adminSettings.searchAdminApiUrl);
    }, [adminSettingsState.adminSettings]);

    function FastLinkData(): JSX.Element {
        return (
            <tbody className="table-controlpain">
                {handleViewFastLinks ? (
                    fastLinkState?.fastLinkList?.body?.result?.map(
                        (fastLink: IResultFastLinks, index: number) => (
                            <tr key={index}>
                                <td
                                    onClick={() => {
                                        var category = {
                                            id: fastLink.id,
                                            categoryName: fastLink.categoryName,
                                            description: fastLink.categoryDescription,
                                        };
                                        handleGetCategoryDataToUpdate(category);
                                    }}
                                >
                                    {fastLink.categoryName}
                                    {handleEditFastLinks && (
                                        <i
                                            className="fas fa-edit"
                                            style={{ fontSize: "small", paddingLeft: "5px" }}
                                        ></i>
                                    )}
                                </td>
                                <td
                                    onClick={() => {
                                        var category = {
                                            id: fastLink.id,
                                            categoryName: fastLink.categoryName,
                                            description: fastLink.categoryDescription,
                                        };
                                        handleGetCategoryDataToUpdate(category);
                                    }}
                                >
                                    {fastLink.categoryDescription}
                                    {handleEditFastLinks && (
                                        <i
                                            className="fas fa-edit"
                                            style={{ fontSize: "small", paddingLeft: "5px" }}
                                        ></i>
                                    )}
                                </td>
                                {handleDeleteFastLinks && (
                                    <td>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="btn btn-danger ml-2"
                                            onClick={() => deleteCategoryFastLinkAction(fastLink.id)}
                                        >
                                            {/* @ts-ignore */}
                                            <i className="fas fa-trash"></i>
                                        </Button>
                                    </td>
                                )}
                                {handleEditFastLinks && (
                                    <td>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="sort-button mt-3"
                                            onClick={() => handleUpdateCategories(fastLink)}
                                        >
                                            Link +
                                        </Button>
                                    </td>
                                )}

                                <td>
                                    {fastLink.fastLinks.map((item: FastLinks, key: number) =>
                                        key == 0 ? (
                                            <div
                                                onClick={() =>
                                                    handleGetFastLinkToUpdate(
                                                        item,
                                                        getSequences(fastLink.fastLinks, item.sequence)
                                                    )
                                                }
                                            >
                                                {item.navName}
                                            </div>
                                        ) : (
                                            <div
                                                className="mt-3"
                                                onClick={() =>
                                                    handleGetFastLinkToUpdate(
                                                        item,
                                                        getSequences(fastLink.fastLinks, item.sequence)
                                                    )
                                                }
                                            >
                                                {item.navName}
                                            </div>
                                        )
                                    )}
                                </td>

                                <td>
                                    {fastLink.fastLinks.map((item: FastLinks, key: number) =>
                                        key == 0 ? (
                                            <div
                                                onClick={() =>
                                                    handleGetFastLinkToUpdate(
                                                        item,
                                                        getSequences(fastLink.fastLinks, item.sequence)
                                                    )
                                                }
                                            >
                                                {item.navDescription}
                                            </div>
                                        ) : (
                                            <div
                                                className="mt-3"
                                                onClick={() =>
                                                    handleGetFastLinkToUpdate(
                                                        item,
                                                        getSequences(fastLink.fastLinks, item.sequence)
                                                    )
                                                }
                                            >
                                                {item.navDescription}
                                            </div>
                                        )
                                    )}
                                </td>

                                <td>
                                    {fastLink.fastLinks.map((item: FastLinks, key: number) =>
                                        key == 0 ? (
                                            <div
                                                onClick={() =>
                                                    handleGetFastLinkToUpdate(
                                                        item,
                                                        getSequences(fastLink.fastLinks, item.sequence)
                                                    )
                                                }
                                            >
                                                {item.navLink}
                                            </div>
                                        ) : (
                                            <div
                                                className="mt-3"
                                                onClick={() =>
                                                    handleGetFastLinkToUpdate(
                                                        item,
                                                        getSequences(fastLink.fastLinks, item.sequence)
                                                    )
                                                }
                                            >
                                                {item.navLink}
                                            </div>
                                        )
                                    )}
                                </td>
                                <td>
                                    {fastLink.fastLinks.map((item: FastLinks, key: number) =>
                                        key == 0 ? (
                                            <div onClick={() => handleGetFastLinkToUpdate(item, getSequences(fastLink.fastLinks, item.sequence))}>
                                                {item.linkType ?? "-"}
                                            </div>
                                        ) : (
                                            <div
                                                className="mt-3"
                                                onClick={() => handleGetFastLinkToUpdate(item, getSequences(fastLink.fastLinks, item.sequence))}
                                            >
                                                {item.linkType ?? "-"}
                                            </div>
                                        )
                                    )}
                                </td>
                                {handleEditFastLinks && (
                                    <td>
                                        {fastLink.fastLinks.map((item: FastLinks, key: number) =>
                                            key == 0 ? (
                                                <div
                                                    onClick={() =>
                                                        handleGetFastLinkToUpdate(
                                                            item,
                                                            getSequences(fastLink.fastLinks, item.sequence)
                                                        )
                                                    }
                                                >
                                                    {item.sequence}
                                                </div>
                                            ) : (
                                                <div
                                                    className="mt-3"
                                                    onClick={() =>
                                                        handleGetFastLinkToUpdate(
                                                            item,
                                                            getSequences(fastLink.fastLinks, item.sequence)
                                                        )
                                                    }
                                                >
                                                    {item.sequence}
                                                </div>
                                            )
                                        )}
                                    </td>
                                )}
                                {handleEditFastLinks && (
                                    <td>
                                        {fastLink.fastLinks.map((item: FastLinks, key: number) =>
                                            <>
                                                <div className="action-button-column text-center mb-2">
                                                    <Button
                                                        variant="secondary"
                                                        title="Move Up"
                                                        className={`moveup-${key} moveup link-button action-link-button`}
                                                        style={{ visibility: key >= 1 ? 'visible' : 'hidden' }}
                                                        id={`moveup-${index}`}
                                                        onClick={() => { var category = { id: fastLink.id, categoryName: fastLink.categoryName, description: fastLink.categoryDescription }; changeSequence(index, key, true, fastLink, category) }}
                                                    >
                                                        {/* @ts-ignore */}
                                                        <i className="fa fa-arrow-circle-up" aria-hidden="true"></i>
                                                    </Button>
                                                    <Button
                                                        variant="secondary"
                                                        title="Move Down"
                                                        className={`movedown-${key} link-button action-link-button`}
                                                        id={`movedown-${index}`}
                                                        style={{ visibility: key < fastLink.fastLinks.length - 1 ? 'visible' : 'hidden' }}
                                                        onClick={() => { var category = { id: fastLink.id, categoryName: fastLink.categoryName, description: fastLink.categoryDescription }; changeSequence(index, key, false, fastLink, category) }}
                                                    >
                                                        {/* @ts-ignore */}
                                                        <i className="fa fa-arrow-circle-down" aria-hidden="true"></i>
                                                    </Button>
                                                </div>
                                            </>
                                        )}
                                    </td>
                                )}

                                {handleDeleteFastLinks && (
                                    <td>
                                        {fastLink.fastLinks.map((item: FastLinks, key: number) =>
                                            key == 0 ? (
                                                <div className="action-button-column text-center mb-2">
                                                    <Button
                                                        key={index}
                                                        className="action-link-button link-button"
                                                        id={`delete-${index}`}
                                                        onClick={() =>
                                                            deleteFastLinkAction(item?.id, item.navName)
                                                        }
                                                    >
                                                        {/* @ts-ignore */}
                                                        <i className="fas fa-times-circle"></i>
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="action-button-column text-center mb-2">
                                                    <Button
                                                        key={index}
                                                        className="action-link-button link-button"
                                                        id={`delete-${index}`}
                                                        onClick={() =>
                                                            deleteFastLinkAction(item?.id, item.navName)
                                                        }
                                                    >
                                                        {/* @ts-ignore */}
                                                        <i className="fas fa-times-circle"></i>
                                                    </Button>
                                                </div>
                                            )
                                        )}
                                    </td>
                                )}
                            </tr>
                        )
                    )
                ) : (
                    <div className="p-4">
                        You do not have the permission to view Fast Links Information
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

                        <th
                            scope="col"
                            className="align-middle"
                            style={{ minWidth: "150px" }}
                        >
                            Categories Name
                            <Button variant="secondary" size="sm" className="sort-button">
                                {/* @ts-ignore */}
                                <i className="fas fa-sort"></i>
                            </Button>
                        </th>


                        <th
                            scope="col"
                            className="align-middle"
                            style={{ minWidth: "150px" }}
                        >
                            Category Description
                            <Button variant="secondary" size="sm" className="sort-button">
                                {/* @ts-ignore */}
                                <i className="fas fa-sort"></i>
                            </Button>
                        </th>

                        {handleDeleteFastLinks && (
                            <th
                                scope="col"
                                className="align-middle"
                                style={{ minWidth: "150px" }}
                            >
                                Delete Category
                            </th>
                        )}
                        {handleEditFastLinks && (
                            <th
                                scope="col"
                                className="align-middle"
                                style={{ minWidth: "150px" }}
                            >
                                Add Link
                            </th>
                        )}
                        <th
                            scope="col"
                            className="align-middle"
                            style={{ minWidth: "150px" }}
                        >
                            Nav Name
                        </th>
                        <th scope="col" className="align-middle">
                            Nav Description
                        </th>
                        <th scope="col" className="align-middle">
                            Nav Link
                        </th>
                        <th scope="col" className="align-middle" style={{ minWidth: "150px" }}>
                            Link Type
                        </th>
                        {handleEditFastLinks && (
                            <>
                                <th
                                    scope="col"
                                    className="align-middle"
                                    style={{ minWidth: "250px" }}
                                >
                                    Sequence
                                </th>
                                <th scope="col" className="align-middle">
                                    Change Sequence
                                </th>
                            </>
                        )}
                        {handleDeleteFastLinks && (
                            <th scope="col" className="align-middle">
                                Action
                            </th>
                        )}
                    </tr>
                </thead>
                {FastLinkData()}
            </table>
            {fastLinkModalShow && (
                <FastLinksModal
                    fastLinkModalShow={fastLinkModalShow}
                    title="Edit"
                    setFastLinkModalShow={setFastLinkModalShow}
                />
            )}
            {categoryDataModalShow && (
                <CategoryDataModal
                    categoryDataModalShow={categoryDataModalShow}
                    title="Edit"
                    setCategoryDataModalShow={setCategoryDataModalShow}
                />
            )}
            <ConfirmDeletionModal
                showConfirmationModal={deleteConfirmationModalShow}
                onCancel={onCancelDeleteConfirmationModal}
                onConfirm={handleConfirmDeletion}
                itemName={nameFastLinks}
                size="lg"
            ></ConfirmDeletionModal>
        </>
    );
};

export default FastLink;
