import React, { Fragment, useState, useEffect, Dispatch, useCallback } from "react";
import Button from "react-bootstrap/Button";
import { useDispatch, useSelector } from "react-redux";
import { getBaseUrl, normalizeAdminApiUrl } from "../../store/actions/adminsettings.actions";
import { addNotification } from "../../store/actions/notifications.action";
import { IStateType } from "../../store/models/root.interface";
import { IUserPermissionState } from "../../store/models/userpermission.interface";
import { UserPermissionEnum } from "../../store/models/queryruletype";
import { retrieveGetPermissionScreen } from "../../store/actions/userpermission.action";
import { IUserGroupsState } from "../../store/models/usergroups.interface";
import { IAdminSettingsState } from "../../store/models/adminsettingsstate.interface";
import fetcher from "../../components/Fetcher";
import { SearchSetting } from "../../store/models/adminsettings.interface";

interface ApiSetMaxResponse {
    id: string;
    key: string;
    value: any;
}

const Setting: React.FC = () => {
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
    const dispatch: Dispatch<any> = useDispatch();
    const baseApiUrl: string = getBaseUrl();

    const [navNameId, setNavNameId] = useState('');
    const [navDescId, setNavDescId] = useState('');
    const [accessibilityTitleId, setAccessibilityTitleId] = useState('');
    const [accessibilityDescriptionId, setAccessibilityDescriptionId] = useState('');
    const [navNameMaxLength, setNavNameMaxLength] = useState('');
    const [navDescMaxLength, setNavDescMaxLength] = useState('');
    const [accessibilityTitleMaxLength, setAccessibilityTitleMaxLength] = useState('');
    const [accessibilityDescriptionMaxLength, setAccessibilityDescriptionMaxLength] = useState('');

    const [defaultPageSizeId, setDefaultPageSizeId] = useState('');
    const [defaultControlPanelsPageSizeId, setDefaultControlPanelsPageSizeId] = useState('');
    const [defaultFastLinksPageSizeId, setDefaultFastLinksPageSizeId] = useState('');
    const [defaultNavigationPageSizeId, setDefaultNavigationPageSizeId] = useState('');
    const [defaultContentEnhancementPageSizeId, setDefaultContentEnhancementPageSizeId] = useState('');
    const [defaultSearchSuggestionPageSizeId, setDefaultSearchSuggestionPageSizeId] = useState('');

    const [defaultPageSize, setDefaultPageSize] = useState('');
    const [defaultControlPanelsPageSize, setDefaultControlPanelsPageSize] = useState('');
    const [defaultFastLinksPageSize, setDefaultFastLinksPageSize] = useState('');
    const [defaultNavigationPageSize, setDefaultNavigationPageSize] = useState('');
    const [defaultContentEnhancementPageSize, setDefaultContentEnhancementPageSize] = useState('');
    const [defaultSearchSuggestionPageSize, setDefaultSearchSuggestionPageSize] = useState('');

    const [allowSameSuggestionId, setAllowSameSuggestionId] = useState('');
    const [isSpellCheckCachedInSearchSuggestionsIndexId, setIsSpellCheckCachedInSearchSuggestionsIndexId] = useState('');
    const [relatedSearchesEnabledId, setRelatedSearchesEnabledId] = useState('');
    const [recentSearchesEnabledId, setRecentSearchesEnabledId] = useState('');
    //const [titleFileTypeEnabledId, setTitleFileTypeEnabledId] = useState('');

    const [allowSameSuggestion, setAllowSameSuggestion] = useState(false);
    const [isSpellCheckCachedInSearchSuggestionsIndex, setIsSpellCheckCachedInSearchSuggestionsIndex] = useState(false);
    const [relatedSearchesEnabled, setRelatedSearchesEnabled] = useState(false);
    const [recentSearchesEnabled, setRecentSearchesEnabled] = useState(false);
    //const [titleFileTypeEnabled, setTitleFileTypeEnabled] = useState(false);

    const isAccessibilityNavigationEnabled = adminSettingsState.adminSettings?.accessibilityNavigationEnabled;

    const [handleViewNavigationSetting, setHandleViewNavigationSetting] = useState(false);
    const [handleEditNavigationSetting, setHandleEditNavigationSetting] = useState(false);
    const [handleDeleteNavigationSetting, setHandleDeleteNavigationSetting] = useState(false);
    const [permissionsChecked, setPermissionsChecked] = useState(false);

    useEffect(() => {
        handleGetScreenPermissions(userGroupsState.groups);
    }, [userGroupsState.groups]);

    useEffect(() => {
        const checkPermissions = async () => {
            if (
                userPermissionState?.getUserPermissionScreen?.result?.name === "ControlPanelNavigationSetting" &&
                adminSettingsState.adminSettings.userPermissionEnabled
            ) {
                setHandleViewNavigationSetting(
                    userPermissionState?.getUserPermissionScreen?.result?.view ||
                    userPermissionState?.getUserPermissionScreen?.result?.edit ||
                    userPermissionState?.getUserPermissionScreen?.result?.delete
                );
                setHandleEditNavigationSetting(
                    userPermissionState?.getUserPermissionScreen?.result?.edit &&
                    userPermissionState?.getUserPermissionScreen?.result?.view
                );
                setHandleDeleteNavigationSetting(
                    userPermissionState?.getUserPermissionScreen?.result?.delete &&
                    userPermissionState?.getUserPermissionScreen?.result?.view
                );
                await setPermissionsChecked(true);
            } else if (!adminSettingsState.adminSettings.userPermissionEnabled) {
                setHandleViewNavigationSetting(true);
                setHandleEditNavigationSetting(true);
                setHandleDeleteNavigationSetting(true);
                await setPermissionsChecked(true);
            }
        };
        checkPermissions();
    }, [userPermissionState?.getUserPermissionScreen?.result, adminSettingsState.adminSettings.userPermissionEnabled]);

    function handleGetScreenPermissions(group: string) {
        const data = { groupMemberShipClaims: group };
        dispatch(
            retrieveGetPermissionScreen(
                getAdminApiBaseUrl(),
                UserPermissionEnum.ControlPanelNavigationSetting,
                data
            )
        );
    }

    useEffect(() => {
        if (permissionsChecked && handleViewNavigationSetting) {
            const fetchData = async () => {
                const url = `${getAdminApiBaseUrl()}/settings/search`;
                const data = { settings: "" };
                try {
                    const response = await fetcher(url, {
                        method: 'POST',
                        body: JSON.stringify(data),
                        headers: {
                            'Content-Type': 'application/json'
                        },
                    });
                    const result = await response.json();
                    // Now we expect 15 keys (10 numeric & 5 booleans)
                    const expectedKeysCount = 15;
                    if (result.length < expectedKeysCount) {
                        const createUrl = `${getAdminApiBaseUrl()}/settings/create`;
                        const missingKeys: string[] = [];
                        const requiredKeys: string[] = [
                            "navDescriptionMaxLength",
                            "navNameMaxLength",
                            "accessibilityTitleMaxLength",
                            "accessibilityDescriptionMaxLength",
                            "DefaultPageSize",
                            "DefaultControlPanelsPageSize",
                            "DefaultFastLinksPageSize",
                            "DefaultNavigationPageSize",
                            "DefaultContentEnhancementPageSize",
                            "DefaultSearchSuggestionPageSize",
                            "AllowSameSuggestion",
                            "IsSpellCheckCachedInSearchSuggestionsIndex",
                            "RelatedSearchesEnabled",
                            "RecentSearchesEnabled",
                            //"TitleFileTypeEnabled"
                        ];
                        requiredKeys.forEach(requiredKey => {
                            if (!result.some((obj: ApiSetMaxResponse) => obj.key === requiredKey)) {
                                missingKeys.push(requiredKey);
                            }
                        });
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        try {
                            const booleanKeys = new Set([
                                "AllowSameSuggestion",
                                "IsSpellCheckCachedInSearchSuggestionsIndex",
                                "RelatedSearchesEnabled",
                                "RecentSearchesEnabled",
                                //"TitleFileTypeEnabled"
                            ]);
                            const pageSizeKeys = new Set([
                                "DefaultPageSize",
                                "DefaultControlPanelsPageSize",
                                "DefaultFastLinksPageSize",
                                "DefaultNavigationPageSize",
                                "DefaultContentEnhancementPageSize",
                                "DefaultSearchSuggestionPageSize",
                            ]);
                            await Promise.all(
                                missingKeys.map(async (key) => {
                                    const prop = (key.charAt(0).toLowerCase() + key.slice(1)) as keyof SearchSetting;
                                    const newKey = {
                                        key: key,
                                        value: booleanKeys.has(key) ? false : (pageSizeKeys.has(key) ? adminSettingsState.adminSettings.searchSettings[prop] : 20)
                                    };
                                    await fetch(createUrl, {
                                        method: 'POST',
                                        body: JSON.stringify(newKey),
                                        headers: {
                                            'Content-Type': 'application/json'
                                        },
                                    });
                                })
                            );
                        } catch (createError) {
                            console.error(createError);
                        }
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        // Fetch again after creating missing settings
                        const response2 = await fetcher(url, {
                            method: 'POST',
                            body: JSON.stringify(data),
                            headers: {
                                'Content-Type': 'application/json'
                            },
                        });
                        const result2 = await response2.json();
                        result2.forEach(handleResponse);
                    } else {
                        result.forEach(handleResponse);
                    }
                } catch (error) {
                    console.error(error);
                }
            };
            fetchData();
        }
    }, [permissionsChecked, handleViewNavigationSetting]);

    const handleResponse = (item: ApiSetMaxResponse) => {
        switch (item.key) {
            case "navDescriptionMaxLength":
                setNavDescId(item.id);
                setNavDescMaxLength(item.value.toString());
                break;
            case "navNameMaxLength":
                setNavNameId(item.id);
                setNavNameMaxLength(item.value.toString());
                break;
            case "accessibilityTitleMaxLength":
                if (isAccessibilityNavigationEnabled) {
                    setAccessibilityTitleId(item.id);
                    setAccessibilityTitleMaxLength(item.value.toString());
                }
                break;
            case "accessibilityDescriptionMaxLength":
                if (isAccessibilityNavigationEnabled) {
                    setAccessibilityDescriptionId(item.id);
                    setAccessibilityDescriptionMaxLength(item.value.toString());
                }
                break;
            case "DefaultPageSize":
                setDefaultPageSizeId(item.id);
                setDefaultPageSize(item.value.toString());
                break;
            case "DefaultControlPanelsPageSize":
                setDefaultControlPanelsPageSizeId(item.id);
                setDefaultControlPanelsPageSize(item.value.toString());
                break;
            case "DefaultFastLinksPageSize":
                setDefaultFastLinksPageSizeId(item.id);
                setDefaultFastLinksPageSize(item.value.toString());
                break;
            case "DefaultNavigationPageSize":
                setDefaultNavigationPageSizeId(item.id);
                setDefaultNavigationPageSize(item.value.toString());
                break;
            case "DefaultContentEnhancementPageSize":
                setDefaultContentEnhancementPageSizeId(item.id);
                setDefaultContentEnhancementPageSize(item.value.toString());
                break;
            case "DefaultSearchSuggestionPageSize":
                setDefaultSearchSuggestionPageSizeId(item.id);
                setDefaultSearchSuggestionPageSize(item.value.toString());
                break;
            // Boolean settings: convert the value to a boolean
            case "AllowSameSuggestion":
                setAllowSameSuggestionId(item.id);
                setAllowSameSuggestion(item.value.toString() === "true");
                break;
            case "IsSpellCheckCachedInSearchSuggestionsIndex":
                setIsSpellCheckCachedInSearchSuggestionsIndexId(item.id);
                setIsSpellCheckCachedInSearchSuggestionsIndex(item.value.toString() === "true");
                break;
            case "RelatedSearchesEnabled":
                setRelatedSearchesEnabledId(item.id);
                setRelatedSearchesEnabled(item.value.toString() === "true");
                break;
            case "RecentSearchesEnabled":
                setRecentSearchesEnabledId(item.id);
                setRecentSearchesEnabled(item.value.toString() === "true");
                break;
            //case "TitleFileTypeEnabled":
            //    setTitleFileTypeEnabledId(item.id);
            //    setTitleFileTypeEnabled(item.value.toString() === "true");
            //    break;
            default:
                break;
        }
    };

    const handleSaveSetting = () => {
        if (permissionsChecked && handleViewNavigationSetting) {

            const updateData: any[] = [
                {
                    "id": navDescId,
                    "key": "navDescriptionMaxLength",
                    "value": navDescMaxLength
                },
                {
                    "id": navNameId,
                    "key": "navNameMaxLength",
                    "value": navNameMaxLength
                }
            ];
            if (isAccessibilityNavigationEnabled) {
                updateData.push(
                    {
                        "id": accessibilityTitleId,
                        "key": "accessibilityTitleMaxLength",
                        "value": accessibilityTitleMaxLength
                    },
                    {
                        "id": accessibilityDescriptionId,
                        "key": "accessibilityDescriptionMaxLength",
                        "value": accessibilityDescriptionMaxLength
                    }
                );
            }
            updateData.push(
                {
                    "id": defaultPageSizeId,
                    "key": "DefaultPageSize",
                    "value": defaultPageSize
                },
                {
                    "id": defaultControlPanelsPageSizeId,
                    "key": "DefaultControlPanelsPageSize",
                    "value": defaultControlPanelsPageSize
                },
                {
                    "id": defaultFastLinksPageSizeId,
                    "key": "DefaultFastLinksPageSize",
                    "value": defaultFastLinksPageSize
                },
                {
                    "id": defaultNavigationPageSizeId,
                    "key": "DefaultNavigationPageSize",
                    "value": defaultNavigationPageSize
                },
                {
                    "id": defaultContentEnhancementPageSizeId,
                    "key": "DefaultContentEnhancementPageSize",
                    "value": defaultContentEnhancementPageSize
                },
                {
                    "id": defaultSearchSuggestionPageSizeId,
                    "key": "DefaultSearchSuggestionPageSize",
                    "value": defaultSearchSuggestionPageSize
                },
                {
                    "id": allowSameSuggestionId,
                    "key": "AllowSameSuggestion",
                    "value": allowSameSuggestion ? "true" : "false"
                },
                {
                    "id": isSpellCheckCachedInSearchSuggestionsIndexId,
                    "key": "IsSpellCheckCachedInSearchSuggestionsIndex",
                    "value": isSpellCheckCachedInSearchSuggestionsIndex ? "true" : "false"
                },
                {
                    "id": relatedSearchesEnabledId,
                    "key": "RelatedSearchesEnabled",
                    "value": relatedSearchesEnabled ? "true" : "false"
                },
                {
                    "id": recentSearchesEnabledId,
                    "key": "RecentSearchesEnabled",
                    "value": recentSearchesEnabled ? "true" : "false"
                    //},
                    //{
                    //    "id": titleFileTypeEnabledId,
                    //    "key": "",
                    //    "value": titleFileTypeEnabled ? "true" : "false"
                }
            );
            const url = `${getAdminApiBaseUrl()}/settings/updateMultiple`;
            fetcher(url, {
                method: 'PUT',
                body: JSON.stringify(updateData),
                headers: {
                    'Content-Type': 'application/json'
                },
            })
                .then(response => response.json())
                .then(response => {
                    dispatch(addNotification('Settings saved successfully', `All saved`));
                })
                .catch(error => {
                    console.error("Error updating settings:", error);
                });
        }
    };

    return (
        <>
            {!permissionsChecked ? (
                <div>Loading...</div>
            ) : (
                <>
                    {handleViewNavigationSetting ? (
                        <>
                            <h1 className="h3 mb-2 text-gray-800">Setting</h1>
                            <h2 className="h5 mt-4">Search Result Size Settings:</h2>
                            <div>
                                <label>Default Search Result Size</label>
                                {handleEditNavigationSetting ? (
                                    <input
                                        className="form-control"
                                        type="number"
                                        value={defaultPageSize === '0' ? "" : defaultPageSize}
                                        onChange={(e) => {
                                            const newValue = e.target.value === "" ? "" : parseInt(e.target.value);
                                            setDefaultPageSize(newValue.toString());
                                        }}
                                        placeholder=""
                                    />
                                ) : (
                                    <input
                                        className="form-control"
                                        value={defaultPageSize}
                                        readOnly
                                    />
                                )}
                            </div>
                            <div>
                                <label>Default Search Result Size Control Panels</label>
                                {handleEditNavigationSetting ? (
                                    <input
                                        className="form-control"
                                        type="number"
                                        value={defaultControlPanelsPageSize === '0' ? "" : defaultControlPanelsPageSize}
                                        onChange={(e) => {
                                            const newValue = e.target.value === "" ? "" : parseInt(e.target.value);
                                            setDefaultControlPanelsPageSize(newValue.toString());
                                        }}
                                        placeholder=""
                                    />
                                ) : (
                                    <input
                                        className="form-control"
                                        value={defaultControlPanelsPageSize}
                                        readOnly
                                    />
                                )}
                            </div>
                            <div>
                                <label>Default Fast Links Search Result Size</label>
                                {handleEditNavigationSetting ? (
                                    <input
                                        className="form-control"
                                        type="number"
                                        value={defaultFastLinksPageSize === '0' ? "" : defaultFastLinksPageSize}
                                        onChange={(e) => {
                                            const newValue = e.target.value === "" ? "" : parseInt(e.target.value);
                                            setDefaultFastLinksPageSize(newValue.toString());
                                        }}
                                        placeholder=""
                                    />
                                ) : (
                                    <input
                                        className="form-control"
                                        value={defaultFastLinksPageSize}
                                        readOnly
                                    />
                                )}
                            </div>
                            <div>
                                <label>Default Navigation Search Result Size</label>
                                {handleEditNavigationSetting ? (
                                    <input
                                        className="form-control"
                                        type="number"
                                        value={defaultNavigationPageSize === '0' ? "" : defaultNavigationPageSize}
                                        onChange={(e) => {
                                            const newValue = e.target.value === "" ? "" : parseInt(e.target.value);
                                            setDefaultNavigationPageSize(newValue.toString());
                                        }}
                                        placeholder=""
                                    />
                                ) : (
                                    <input
                                        className="form-control"
                                        value={defaultNavigationPageSize}
                                        readOnly
                                    />
                                )}
                            </div>
                            <div>
                                <label>Default Content Enhancement Search Result Size</label>
                                {handleEditNavigationSetting ? (
                                    <input
                                        className="form-control"
                                        type="number"
                                        value={defaultContentEnhancementPageSize === '0' ? "" : defaultContentEnhancementPageSize}
                                        onChange={(e) => {
                                            const newValue = e.target.value === "" ? "" : parseInt(e.target.value);
                                            setDefaultContentEnhancementPageSize(newValue.toString());
                                        }}
                                        placeholder=""
                                    />
                                ) : (
                                    <input
                                        className="form-control"
                                        value={defaultContentEnhancementPageSize}
                                        readOnly
                                    />
                                )}
                            </div>
                            <div>
                                <label>Default Search Suggestion Search Result Size</label>
                                {handleEditNavigationSetting ? (
                                    <input
                                        className="form-control"
                                        type="number"
                                        value={defaultSearchSuggestionPageSize === '0' ? "" : defaultSearchSuggestionPageSize}
                                        onChange={(e) => {
                                            const newValue = e.target.value === "" ? "" : parseInt(e.target.value);
                                            setDefaultSearchSuggestionPageSize(newValue.toString());
                                        }}
                                        placeholder=""
                                    />
                                ) : (
                                    <input
                                        className="form-control"
                                        value={defaultSearchSuggestionPageSize}
                                        readOnly
                                    />
                                )}
                            </div>
                            <h2 className="h5 mt-4">Boolean Settings</h2>
                            <div className="form-check mb-2">
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    id="allowSameSuggestion"
                                    checked={allowSameSuggestion}
                                    onChange={(e) => setAllowSameSuggestion(e.target.checked)}
                                    disabled={!handleEditNavigationSetting}
                                />
                                <label className="form-check-label" htmlFor="allowSameSuggestion">
                                    Show Search Query as Suggestion 
                                </label>
                            </div>

                            <div className="form-check mb-2">
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    id="isSpellCheckCached"
                                    checked={isSpellCheckCachedInSearchSuggestionsIndex}
                                    onChange={(e) => setIsSpellCheckCachedInSearchSuggestionsIndex(e.target.checked)}
                                    disabled={!handleEditNavigationSetting}
                                />
                                <label className="form-check-label" htmlFor="isSpellCheckCached">
                                    Search Suggestion Cache
                                </label>
                            </div>

                            <h2 className="h5 mt-4">Search Setting:</h2>

                            <div className="form-check mb-2">
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    id="relatedSearchesEnabled"
                                    checked={relatedSearchesEnabled}
                                    onChange={(e) => setRelatedSearchesEnabled(e.target.checked)}
                                    disabled={!handleEditNavigationSetting}
                                />
                                <label className="form-check-label" htmlFor="relatedSearchesEnabled">
                                    Related Searches Enabled
                                </label>
                            </div>

                            <div className="form-check mb-2">
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    id="recentSearchesEnabled"
                                    checked={recentSearchesEnabled}
                                    onChange={(e) => setRecentSearchesEnabled(e.target.checked)}
                                    disabled={!handleEditNavigationSetting}
                                />
                                <label className="form-check-label" htmlFor="recentSearchesEnabled">
                                    Recent Searches Enabled
                                </label>
                            </div>

                            <h2 className="h5 mt-4">Navigation Settings</h2>
                            <div>
                                <label>Max Length of Name</label>
                                {handleEditNavigationSetting ? (
                                    <input
                                        className="form-control"
                                        type="number"
                                        placeholder=""
                                        value={navNameMaxLength === '0' ? "" : navNameMaxLength}
                                        onChange={(e) => {
                                            const newValue = e.target.value === "" ? "" : parseInt(e.target.value);
                                            setNavNameMaxLength(newValue.toString())
                                        }}
                                    />
                                ) : (
                                    <input
                                        className="form-control"
                                        placeholder=""
                                        value={navNameMaxLength}
                                        readOnly
                                    />
                                )}
                            </div>
                            <div>
                                <label>Max Length of Description</label>
                                {handleEditNavigationSetting ? (
                                    <input
                                        className="form-control"
                                        type="number"
                                        value={navDescMaxLength === '0' ? "" : navDescMaxLength}
                                        onChange={(e) => {
                                            const newValue = e.target.value === "" ? "" : parseInt(e.target.value);
                                            setNavDescMaxLength(newValue.toString());
                                        }}
                                        placeholder=""
                                    />
                                ) : (
                                    <input
                                        className="form-control"
                                        placeholder=""
                                        value={navDescMaxLength}
                                        readOnly
                                    />
                                )}
                            </div>
                            {isAccessibilityNavigationEnabled && (
                                <>
                                    <div>
                                        <label>Max Length of Accessibility Title</label>
                                        <input
                                            className="form-control"
                                            type="number"
                                            value={accessibilityTitleMaxLength === '0' ? "" : accessibilityTitleMaxLength}
                                            onChange={(e) => {
                                                const newValue = e.target.value === "" ? "" : parseInt(e.target.value);
                                                setAccessibilityTitleMaxLength(newValue.toString())
                                            }}
                                            placeholder=""
                                        />
                                    </div>
                                    <div>
                                        <label>Max Length of Accessibility Description</label>
                                        <input
                                            className="form-control"
                                            type="number"
                                            value={accessibilityDescriptionMaxLength === '0' ? "" : accessibilityDescriptionMaxLength}
                                            onChange={(e) => {
                                                const newValue = e.target.value === "" ? "" : parseInt(e.target.value);
                                                setAccessibilityDescriptionMaxLength(newValue.toString());
                                            }}
                                            placeholder=""
                                        />
                                    </div>
                                </>
                            )}
                            {/* New Section for Default Page Size Settings */}

                            {
                                //    <div className="form-check mb-3">
                                //        <input
                                //            type="checkbox"
                                //            className="form-check-input"
                                //            id="titleFileTypeEnabled"
                                //            checked={titleFileTypeEnabled}
                                //            onChange={(e) => setTitleFileTypeEnabled(e.target.checked)}
                                //            disabled={!handleEditNavigationSetting}
                                //        />
                                //        <label className="form-check-label" htmlFor="titleFileTypeEnabled">
                                //            Title File Type Enabled
                                //        </label>
                                //    </div>
                                //
                            }
                            {handleEditNavigationSetting && (
                                <Button
                                    className="btn btn-secondary mt-3"
                                    variant="primary"
                                    onClick={handleSaveSetting}
                                >
                                    Save
                                </Button>
                            )}
                        </>
                    ) : (
                        <div className="p-4">
                            You do not have the permission to view Setting Information
                        </div>
                    )}
                </>
            )}
        </>
    );
}

export default Setting;
