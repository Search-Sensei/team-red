// @ts-nocheck
import "bootstrap/dist/css/bootstrap.css";
import React, { Dispatch, useCallback, useEffect, useState, useRef } from "react";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { IStateType } from "../../store/models/root.interface";
import { useDispatch, useSelector } from "react-redux";
import { IAdminSettingsState } from "../../store/models/adminsettingsstate.interface";
import {
    retrieveFastLink,
} from "../../store/actions/fastlink.action";
import { INavigationState, Navigation } from "../../store/models/navigation";
import {
    createNavigation,
    updateNavigation,
} from "../../store/actions/navigation.action";
import { retrieveNavigation } from "../../store/actions/navigation.action";
import { getBaseUrl, normalizeAdminApiUrl } from "../../store/actions/adminsettings.actions";
import { addNotification } from "../../store/actions/notifications.action";
import ConfirmCancelModal from "../../common/components/ConfirmCancelModal";
import fetcher from "../../components/Fetcher";
import LoadingIndicator from "../../common/components/LoadingIndicator";

interface IMyProps {
    navigationModalShow: boolean;
    setNavigationModalShow: Function;
    title: string;
}
interface ApiSetMaxResponse {
    id: string;
    key: string;
    value: number;
}
// Helper function to process extensionKeywords - filter out empty strings
const processExtensionKeywords = (keywordsString: string): string[] => {
    if (!keywordsString || keywordsString.trim() === "") {
        return [];
    }
    return keywordsString.split(",")
        .map(k => k.trim())
        .filter(k => k !== "");
};

const NavigationModal: React.FC<IMyProps> = (props: IMyProps) => {
    const dispatch: Dispatch<any> = useDispatch();
    const baseApiUrl: string = getBaseUrl();
    const adminSettingsState: IAdminSettingsState = useSelector(
        (state: IStateType) => state.adminSettingsState
    );
    const navigationState: INavigationState = useSelector(
        (state: IStateType) => state.navigationState
    );
    const [navigation, setNavigation] = useState<Navigation>({
        id: "",
        navName: "",
        navLink: "",
        navDescription: "",
        extensionKeywords: [],
        linkType: "",
        profile: "",
        accessibilityTitle: "",
        accessibilityDescription: ""
    });
    const [extensionKeywordsString, setExtensionKeywordString] = useState<string>("");
    const [extensionModalShow, setExtensionModalShow] = useState<boolean>(false);
    const [tempKeywords, setTempKeywords] = useState<string[]>([]);
    const [cancelConfirmationModalShow, setCancelConfirmationModalShow] =
        useState(false);

    const isAccessibilityNavigationEnabled = adminSettingsState.adminSettings?.accessibilityNavigationEnabled;
    const isMobileNavigationEnabled = adminSettingsState?.adminSettings?.mobileNavigationEnabled;

    const availableProfiles = adminSettingsState?.adminSettings?.availableProfiles || [];
    const getAvailableProfilesFromSettings = () => {
        const options: Array<{ name: string; title: string }> = availableProfiles.map(p => ({ name: p.name, title: p.title || p.name }));
        const allEntry = options.find(o => o.name === "");
        if (allEntry) {
            const rest = options.filter(o => o.name !== "");
            const seen = new Set<string>();
            const uniqueRest: Array<{ name: string; title: string }> = [];
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
        const uniqueRest: Array<{ name: string; title: string }> = [];
        rest.forEach(o => {
            if (!seen.has(o.name)) {
                seen.add(o.name);
                uniqueRest.push(o);
            }
        });
        return [{ name: '', title: 'Default Profile' }, ...uniqueRest];
    };
    const [navNameMaxLength, setNavNameMaxLength] = useState(25);
    const [navDescriptionMaxLength, setNavDescriptionMaxLength] = useState(45);
    const [accessibilityTitleMaxLength, setAccessibilityTitleMaxLength] = useState(5);
    const [accessibilityDescriptionMaxLength, setAccessibilityDescriptionMaxLength] = useState(5);
    const [saveClicked, setSaveClicked] = useState(false);
    const [isMaxLengthVisible, setIsMaxLengthVisible] = useState(false);
    const [load, isLoad] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    useEffect(() => {
        const isMaxLengthEnabled = adminSettingsState?.adminSettings?.navigationSettingEnabled;
        if (isMaxLengthEnabled) {
            setIsMaxLengthVisible(true);
            const url = `${getAdminApiBaseUrl()}/settings/search`;
            const data = { settings: "MaxLength" };
            //Internal_Call: Making a POST request to the specified URL
            //Sending_Data: Sending the `data` object, converted to a JSON string, in the request body
            //Receiving_Data: Receiving the response as JSON and checking for errors
            fetcher(url, {
                method: 'POST', body: JSON.stringify(data), headers: {
                    'Content-Type': 'application/json'
                },
            })
                .then(response => response.json())
                .then(response => {
                    if (response.error) {
                        throw (response.error);
                    }
                    if (response.length === 0) {
                        const createUrlNavDesc = `${getAdminApiBaseUrl()}/settings/create`;
                        const createUrlNavName = `${getAdminApiBaseUrl()}/settings/create`;
                        const createAccessibilityTitle = `${getAdminApiBaseUrl()}/settings/create`;
                        const createAccessibilityDescription = `${getAdminApiBaseUrl()}/settings/create`;

                        const newDataNavDesc = { key: "navDescriptionMaxLength", value: "45" };
                        const newDataNavName = { key: "navNameMaxLength", value: "25" };
                        const newAccessibilityTitle = { key: "accessibilityTitleMaxLength", value: "5" }
                        const newAccessibilityDescription = { key: "accessibilityDescriptionMaxLength", value: "5" }

                        //Internal_Call: Making a POST request to endpoint 'createUrlNavDesc'
                        //Sending_Data: Sending `newDataNavDesc` to create the setting
                        fetcher(createUrlNavDesc, {
                            method: 'POST',
                            body: JSON.stringify(newDataNavDesc),
                            headers: {
                                'Content-Type': 'application/json'
                            },
                        })
                            .catch(createErrorNavDesc => {
                            });
                        //Internal_Call: Making a POST request to endpoint 'createUrlNavName'
                        //Sending_Data: Sending `newDataNavName` to create the setting
                        fetcher(createUrlNavName, {
                            method: 'POST',
                            body: JSON.stringify(newDataNavName),
                            headers: {
                                'Content-Type': 'application/json'
                            },
                        })
                            .catch(createErrorNavName => {
                            });
                        if (isAccessibilityNavigationEnabled) {
                            //Internal_Call: Making a POST request to endpoint 'createAccessibilityTitle'
                            //Sending_Data: Sending `newAccessibilityTitle` to create the setting
                            fetcher(createAccessibilityTitle, {
                                method: 'POST',
                                body: JSON.stringify(newAccessibilityTitle),
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                            })
                                .catch(createErrorAccessibilityTitle => {
                                });
                            //Internal_Call: Making a POST request to endpoint 'createAccessibilityDescription'
                            //Sending_Data: Sending `newAccessibilityDescription` to create the setting
                            fetcher(createAccessibilityDescription, {
                                method: 'POST',
                                body: JSON.stringify(newAccessibilityDescription),
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                            })
                                .catch(createErrorAccessibilityDescription => {
                                });
                        }
                    } else {
                        response.forEach((item: ApiSetMaxResponse) => {
                            if (item.key === "navDescriptionMaxLength") {
                                setNavDescriptionMaxLength(item.value);
                            } else if (item.key === "navNameMaxLength") {
                                setNavNameMaxLength(item.value);
                            } else if (item.key === "accessibilityTitleMaxLength" && isAccessibilityNavigationEnabled) {
                                setAccessibilityTitleMaxLength(item.value);
                            } else if (item.key === "accessibilityDescriptionMaxLength" && isAccessibilityNavigationEnabled) {
                                setAccessibilityDescriptionMaxLength(item.value);
                            }
                        });
                    }
                })
                .catch(error => {
                })
        }
    }, []);


    useEffect(() => {
        if (navigationState.navigationEdit.navName) {
            setNavigation(navigationState.navigationEdit);
            setExtensionKeywordString(
                navigationState.navigationEdit.extensionKeywords.join(",")
            );
        }
    }, [navigationState.navigationEdit]);
    const [isLinkTypeVisible, setIsLinkTypeVisible] = useState(true);
    const [isProfileVisible, setIsProfileVisible] = useState(true);
    useEffect(() => {
        const isMobileNavigationEnabled = adminSettingsState?.adminSettings?.mobileNavigationEnabled;
        if (!isMobileNavigationEnabled) {
            setIsLinkTypeVisible(false);
            setIsProfileVisible(false);
        }
    }, [adminSettingsState]);

    const getAdminApiBaseUrl = useCallback((): string => {
        return normalizeAdminApiUrl(adminSettingsState.adminSettings.searchAdminApiUrl);
    }, [adminSettingsState.adminSettings]);

    const handleCreateNavigation = async (): Promise<void> => {
        if ((!isAccessibilityNavigationEnabled && (!navigation.navName || !navigation.navLink || !navigation.navDescription))
            || (isAccessibilityNavigationEnabled && (!navigation.navName || !navigation.navLink || !navigation.navDescription || !navigation.accessibilityDescription || !navigation.accessibilityTitle))) {
            setSaveClicked(true);
            return;
        }
        else {
            isLoad(true)
            setNavigation({
                ...navigation,
                extensionKeywords: processExtensionKeywords(extensionKeywordsString),
            });

            if (navigationState.navigationEdit.navName) {
                if (isLinkTypeVisible) {
                    const newData = {
                        ...navigation,
                        extensionKeywords: processExtensionKeywords(extensionKeywordsString),
                        linkType: navigation.linkType == "" ? "App Link" : navigation.linkType,
                        profile: navigation.profile == "" ? "Both" : navigation.profile,
                    };
                    if (localStorage !== null) {
                        for (const [key, itemString] of Object.entries(localStorage)) {
                            try {
                                const item = JSON.parse(itemString);
                                if (item.navName === newData.navName || item.navDescription === newData.navDescription || item.navLink === newData.navLink) {
                                    localStorage.removeItem(key)
                                }
                            } catch (e) { }

                        }
                    }
                    await dispatch(updateNavigation(getAdminApiBaseUrl(), newData));
                }
                else {
                    const newData = {
                        ...navigation,
                        extensionKeywords: processExtensionKeywords(extensionKeywordsString),
                    };
                    if (localStorage !== null) {
                        for (const [key, itemString] of Object.entries(localStorage)) {
                            try {
                                const item = JSON.parse(itemString);
                                if (item.navName === newData.navName || item.navDescription === newData.navDescription || item.navLink === newData.navLink) {
                                    localStorage.removeItem(key)
                                }
                            } catch (e) { }

                        }
                    }
                    await dispatch(updateNavigation(getAdminApiBaseUrl(), newData));
                }
                setTimeout(() => {
                    props.setNavigationModalShow(false);
                    handleGetNavigation("all", navigationState.currentProfile);
                }, 500);
            } else {
                if (isLinkTypeVisible) {
                    const newData = {
                        ...navigation,
                        extensionKeywords: processExtensionKeywords(extensionKeywordsString),
                        linkType: navigation.linkType == "" ? "App Link" : navigation.linkType,
                        profile: navigation.profile == "" ? "Both" : navigation.profile,
                    };
                    localStorage.setItem(Date.now().toString(), JSON.stringify(newData));
                    await dispatch(createNavigation(getAdminApiBaseUrl(), newData));
                    await dispatch(retrieveFastLink(getAdminApiBaseUrl(), { query: "all" }));
                    var localCount = navigationState.navigationCount
                    let countNavigation = localStorage.getItem('CountNavigation');
                    if (countNavigation === null) {
                        localCount++;
                        countNavigation = localCount.toString();
                        localStorage.setItem('CountNavigation', countNavigation);
                    }
                    else {
                        countNavigation = (parseInt(countNavigation) + 1).toString();
                        localStorage.setItem('CountNavigation', countNavigation);
                    }
                }
                else {
                    const newData = {
                        ...navigation,
                        extensionKeywords: processExtensionKeywords(extensionKeywordsString),
                    };
                    localStorage.setItem(Date.now().toString(), JSON.stringify(newData));
                    await dispatch(createNavigation(getAdminApiBaseUrl(), newData));
                    await dispatch(retrieveFastLink(getAdminApiBaseUrl(), { query: "all" }));
                    var localCount = navigationState.navigationCount
                    let countNavigation = localStorage.getItem('CountNavigation');
                    if (countNavigation === null) {
                        localCount++;
                        countNavigation = localCount.toString();
                        localStorage.setItem('CountNavigation', countNavigation);
                    }
                    else {
                        countNavigation = (parseInt(countNavigation) + 1).toString();
                        localStorage.setItem('CountNavigation', countNavigation);
                    }
                }
            }
            if (!navigationState.navigationEdit.navName) {
                setTimeout(() => {
                    props.setNavigationModalShow(false);
                    handleGetNavigation("all", navigationState.currentProfile);
                }, 500);
            }
            dispatch(addNotification("Updating navigation", `Updating navigation ${navigation.navName}`));
            localStorage.setItem('isUpdating', `${navigation.navName}`);
        }
    };

    const handleGetNavigation = (search = "all", profile?: string) => {
        const currentProfile = profile !== undefined ? profile : navigationState.currentProfile || "";
        const data = {
            query: search,
            profile: currentProfile
        };
        dispatch(retrieveNavigation(getAdminApiBaseUrl(), data));
    };

    useEffect(() => {
        if (extensionModalShow) {
            setTempKeywords(processExtensionKeywords(extensionKeywordsString));
        }
    }, [extensionModalShow, extensionKeywordsString]);

    function cancelAction(): void {
        setCancelConfirmationModalShow(true);
        //setCategoriesIdFastLinks(id);
        //setShouldCallDeletion(false);
    }

    function onCancelCancelConfirmationModal(): void {
        setCancelConfirmationModalShow(false);
    }

    function handleConfirmCancel() {
        setTempKeywords(extensionKeywordsString ? extensionKeywordsString.split(",") : []);
        setCancelConfirmationModalShow(false);
        setExtensionModalShow(false);
    }

    const handleSaveExtensionKeywords = () => {
        setExtensionKeywordString(tempKeywords.join(","));
        setExtensionModalShow(false);
    };

    const handleDelete = (index: number) => {
        const updatedKeywords = tempKeywords.filter((_, i) => i !== index);
        setTempKeywords(updatedKeywords);
    };
    const inputRefs = useRef<HTMLInputElement[]>([]);

    const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (event.key === 'Enter' && index === tempKeywords.length - 1) {
            setIsAdding(true);
            setTempKeywords((prevKeywords) => [...prevKeywords, ""]);
        }
    };

    useEffect(() => {
        if (isAdding && tempKeywords.length > 0) {
            const lastInput = inputRefs.current[tempKeywords.length - 1];
            if (lastInput) lastInput.focus();
            setIsAdding(false);
        }
    }, [tempKeywords, isAdding]);




    // On successful validation of each step set the wizard queryRule to pass to the next step
    // Set defaults for properties if not passed in.
    return (
        <>
            <div className="modal-container" style={{ display: 'flex', height: '80vh', overflow: 'hidden' }}>
                <div style={{ flex: '1', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Modal
                        show={props.navigationModalShow}
                        onHide={() => props.setNavigationModalShow(false)}
                    >
                        {/* @ts-ignore */}
                        <div>
                            {/* @ts-ignore */}
                            <Modal.Header closeButton>
                                {/* @ts-ignore */}
                                <Modal.Title>{props.title} Navigation</Modal.Title>
                            </Modal.Header>
                            {/* @ts-ignore */}
                            <Modal.Body className="d-flex" style={{ height: '100%', overflowY: 'auto' }}>
                            {/* @ts-ignore */}
                            {load ? (<LoadingIndicator
                                text={'Loading'}
                                isLoading={load}
                            />) :
                                (<div className="p-3" style={{ height: '100%', width: '100%' }}>
                                    <div>
                                        <label>Nav Name</label>
                                        {navigation?.navName.length > navNameMaxLength && (
                                            <div className='validation-error-message' style={{ color: 'red' }}>Limit Exceeds (only upto {navNameMaxLength} characters accepted)</div>
                                        )}
                                        {(saveClicked && !navigation.navName) && (
                                            <div className='validation-error-message' style={{ color: 'red' }}>Nav Name is required</div>
                                        )}
                                        <input
                                            className="form-control"
                                            placeholder=""
                                            value={navigation?.navName || ""}
                                            onChange={(e) =>
                                                setNavigation({ ...navigation, navName: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div>
                                        <label>Nav Link</label>
                                        {(saveClicked && !navigation.navLink) && (
                                            <div className='text-danger'>Nav Link is required</div>
                                        )}
                                        <input
                                            className="form-control"
                                            placeholder=""
                                            value={navigation?.navLink || ""}
                                            onChange={(e) =>
                                                setNavigation({ ...navigation, navLink: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div>
                                        <label>Nav Description</label>
                                        {isMaxLengthVisible && (navigation?.navDescription.length > navDescriptionMaxLength && (
                                            <div className='validation-error-message' style={{ color: 'red' }}>Limit Exceeds (only upto {navDescriptionMaxLength} characters accepted)</div>
                                        ))}
                                        {(saveClicked && !navigation.navDescription) && (
                                            <div className='validation-error-message' style={{ color: 'red' }}>Nav Description is required</div>
                                        )}
                                        <input
                                            className="form-control"
                                            placeholder=""
                                            value={navigation?.navDescription || ""}
                                            onChange={(e) =>
                                                setNavigation({ ...navigation, navDescription: e.target.value })
                                            }
                                        />
                                    </div>
                                    {isLinkTypeVisible && (
                                        <div>
                                            {/* @ts-ignore */}
                                            <Form.Group>
                                                <Form.Label>Link Type</Form.Label>
                                                <Form.Control
                                                    as="select"
                                                    value={navigation.linkType}
                                                    onChange={(e) =>
                                                        setNavigation({ ...navigation, linkType: e.target.value })
                                                    }
                                                >
                                                    <option value="App Link">App Link</option>
                                                    <option value="External">External</option>
                                                </Form.Control>
                                            </Form.Group>
                                        </div>
                                    )}

                                    <div>
                                        <Form.Group>
                                            <Form.Label>Profile</Form.Label>
                                            <Form.Control
                                                as="select"
                                                value={navigation.profile}
                                                onChange={(e) =>
                                                    setNavigation({ ...navigation, profile: e.target.value })
                                                }
                                            >
                                                {isMobileNavigationEnabled && (
                                                    <>
                                                        <option value="Both">Both</option>
                                                        <option value="IOS">IOS</option>
                                                        <option value="Android">Android</option>
                                                    </>
                                                )}
                                                {getAvailableProfilesFromSettings().map(profile => (
                                                    <option key={profile.name} value={profile.name}>{profile.title}</option>
                                                ))}
                                            </Form.Control>
                                        </Form.Group>
                                    </div>

                                    {isAccessibilityNavigationEnabled && (
                                        <div>
                                            <label>Accessibility Title</label>
                                            {isMaxLengthVisible && (navigation?.accessibilityTitle?.length > accessibilityTitleMaxLength && (
                                                <div className='validation-error-message' style={{ color: 'red' }}>Limit Exceeds (only upto {accessibilityTitleMaxLength} characters accepted)</div>
                                            ))}
                                            {(saveClicked && !navigation.accessibilityTitle) && (
                                                <div className='validation-error-message' style={{ color: 'red' }}>Accessibility Title is required</div>
                                            )}
                                            <input
                                                className="form-control"
                                                placeholder=""
                                                value={navigation?.accessibilityTitle || ""}
                                                onChange={(e) =>
                                                    setNavigation({ ...navigation, accessibilityTitle: e.target.value })
                                                }
                                            />
                                        </div>
                                    )}
                                    {isAccessibilityNavigationEnabled && (
                                        <div>
                                            <label>Accessibility Description</label>
                                            {isMaxLengthVisible && (navigation?.accessibilityDescription?.length > accessibilityDescriptionMaxLength && (
                                                <div className='validation-error-message' style={{ color: 'red' }}>Limit Exceeds (only upto {accessibilityDescriptionMaxLength} characters accepted)</div>
                                            ))}
                                            {(saveClicked && !navigation.accessibilityDescription) && (
                                                <div className='validation-error-message' style={{ color: 'red' }}>Accessibility Description is required</div>
                                            )}
                                            <input
                                                className="form-control"
                                                placeholder=""
                                                value={navigation?.accessibilityDescription || ""}
                                                onChange={(e) =>
                                                    setNavigation({ ...navigation, accessibilityDescription: e.target.value })
                                                }
                                            />
                                        </div>
                                    )}
                                    <Button
                                        variant="secondary"
                                        onClick={() => setExtensionModalShow(true)}
                                    >
                                        Edit Extension Keyword
                                    </Button>
                                </div>)}
                            {/* @ts-ignore */}
                        </Modal.Body>
                        {/* @ts-ignore */}
                        <Modal.Footer>
                            {/* @ts-ignore */}
                            <Button
                                className="btn-modal-synonym"
                                variant="primary"
                                onClick={handleCreateNavigation}
                                disabled={(adminSettingsState?.adminSettings?.navigationSettingEnabled &&
                                    (navigation?.navName.length > navDescriptionMaxLength ||
                                        navigation?.navDescription.length > navDescriptionMaxLength ||
                                        (isAccessibilityNavigationEnabled && (
                                            navigation?.accessibilityTitle?.length > accessibilityTitleMaxLength ||
                                            navigation?.accessibilityDescription?.length > accessibilityDescriptionMaxLength)
                                        )) || load
                                )}

                            >
                                Save
                            </Button>
                        </Modal.Footer>
                        </div>
                    </Modal>
                </div>

                {extensionModalShow && (
                    <div style={{ flex: '1', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <Modal
                            show={extensionModalShow}
                            onHide={() => handleConfirmCancel()}
                            dialogClassName="modal-right"
                            style={{ width: '100%', height: '100vh', marginLeft: '0' }}
                        >
                            <Modal.Header closeButton>
                                <Modal.Title>Extension Keywords</Modal.Title>
                            </Modal.Header>
                            <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                                <div>
                                    {tempKeywords.length > 0 ? (
                                        tempKeywords.map((keyword, index) => (
                                            <div
                                                key={index}
                                                style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '8px' }}
                                            >
                                                <input
                                                    key={index}
                                                    type="text"
                                                    className="form-control"
                                                    value={keyword}
                                                    onChange={(e) => {
                                                        const updatedKeywords = [...tempKeywords];
                                                        updatedKeywords[index] = e.target.value;
                                                        setTempKeywords(updatedKeywords);
                                                    }}
                                                    onKeyDown={(e) => handleKeyPress(e, index)}
                                                    ref={(el) => (inputRefs.current[index] = el!)}
                                                    style={{ flex: '1', marginRight: '10px' }}
                                                />
                                                <Button
                                                    variant="danger"
                                                    size="sm"
                                                    onClick={() => handleDelete(index)}
                                                >
                                                    {/* @ts-ignore */}
                                                    <i className="fas fa-trash"></i>
                                                </Button>
                                            </div>
                                        ))
                                    ) : (
                                        <div>Please add a keyword.</div>
                                    )}
                                    <Button
                                        variant="secondary"
                                        onClick={() => {
                                            setTempKeywords([...tempKeywords, ""]);
                                        }}
                                        style={{ width: 'auto', padding: '5px 10px', marginTop: '10px', float: 'left' }}
                                    >
                                        Add
                                    </Button>
                                </div>
                            </Modal.Body>
                            <Modal.Footer style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                                <Button
                                    variant="secondary"
                                    //onClick={() => setExtensionModalShow(false)}
                                    onClick={() => cancelAction()}
                                    style={{ width: 'auto', padding: '5px 10px', marginRight: '10px' }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => handleSaveExtensionKeywords()}
                                    style={{ width: 'auto', padding: '5px 10px' }}
                                >
                                    Save
                                </Button>
                            </Modal.Footer>
                        </Modal>
                    </div>
                )}
            </div>
            <ConfirmCancelModal
                showConfirmationModal={cancelConfirmationModalShow}
                onCancel={onCancelCancelConfirmationModal}
                onConfirm={handleConfirmCancel}
                size="lg"
            ></ConfirmCancelModal>

        </>
    );
};

export default NavigationModal;
