import "bootstrap/dist/css/bootstrap.css";
import React, { Dispatch, useCallback, useEffect, useState } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { IStateType } from "../../store/models/root.interface";
import { useDispatch, useSelector } from "react-redux";
import { IAdminSettingsState } from "../../store/models/adminsettingsstate.interface";
import { normalizeAdminApiUrl } from "../../store/actions/adminsettings.actions";
import {
    retrieveFastLink,
} from "../../store/actions/fastlink.action";
import { ISuggestionState, Suggestion } from "../../store/models/suggestion";
import {
    createSuggestion,
    updateSuggestion,
} from "../../store/actions/suggestion.action";
import { retrieveSuggestion } from "../../store/actions/suggestion.action";
import { getBaseUrl } from "../../store/actions/adminsettings.actions";
import { addNotification } from "../../store/actions/notifications.action";

interface IMyProps {
    suggestionModalShow: boolean;
    setSuggestionModalShow: Function;
    title: string;
}
interface ApiSetMaxResponse {
    id: string;
    key: string;
    value: number;
}
const SuggestionModal: React.FC<IMyProps> = (props: IMyProps) => {
    const dispatch: Dispatch<any> = useDispatch();
    const baseApiUrl: string = getBaseUrl();
    const adminSettingsState: IAdminSettingsState = useSelector(
        (state: IStateType) => state.adminSettingsState
    );
    const suggestionState: ISuggestionState = useSelector(
        (state: IStateType) => state.suggestionState
    );
    const [suggestion, setSuggestion] = useState<Suggestion>({
        id: "",
        query: "",
        suggestion: "",
        profile: [],
        type: "",
        count: 0,
    });
    const [profileString, setProfileString] =
        useState<string>("");

    const selectedProfiles = profileString.split(",");

    const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>, profile: string) => {
        if (!e.target) {
            return;
        }

        const isChecked = e.target.checked;

        setProfileString(prevProfileString => {
            const profiles = prevProfileString ? prevProfileString.split(",") : [];

            if (isChecked) {
                if (!profiles.includes(profile)) {
                    profiles.push(profile);
                }
            } else {
                const index = profiles.indexOf(profile);
                if (index > -1) {
                    profiles.splice(index, 1);
                }
            }

            return profiles.join(",");
        });
    };

    const [saveClicked, setSaveClicked] = useState(false);

    useEffect(() => {
        if (suggestionState.suggestionEdit.query) {
            setSuggestion(suggestionState.suggestionEdit);
            setProfileString(
                suggestionState.suggestionEdit.profile.join(",")
            );
        }
    }, [suggestionState.suggestionEdit]);
    const [isLinkTypeVisible, setIsLinkTypeVisible] = useState(true);
    const [isProfileVisible, setIsProfileVisible] = useState(true);
    useEffect(() => {
        const isMobileSuggestionEnabled = adminSettingsState?.adminSettings?.mobileNavigationEnabled;
        if (!isMobileSuggestionEnabled) {
            setIsLinkTypeVisible(false);
            setIsProfileVisible(false);
        }
    }, [adminSettingsState]);

    const getAdminApiBaseUrl = useCallback((): string => {
        return normalizeAdminApiUrl(adminSettingsState.adminSettings.searchAdminApiUrl);
    }, [adminSettingsState.adminSettings]);

    const handleCreateSuggestion = async (): Promise<void> => {
        if (!suggestion.query || !suggestion.suggestion) {
            setSaveClicked(true);
            return;
        }
        else {
            setSuggestion({
                ...suggestion,
                profile: profileString.split(","),
                type: "suggestion"
            });

            if (suggestionState.suggestionEdit.query) {
                if (isLinkTypeVisible && suggestion.type == "") {
                    const newData = {
                        ...suggestion,
                        profile: profileString.split(","),
                        type: "suggestion"
                    };
                    if (localStorage !== null) {
                        for (const [key, itemString] of Object.entries(localStorage)) {
                            try {
                                const item = JSON.parse(itemString);
                                if (item.query === newData.query || item.suggestion === newData.suggestion) {
                                    localStorage.removeItem(key)
                                }
                            } catch (e) { }

                        }
                    }
                    await dispatch(updateSuggestion(getAdminApiBaseUrl(), newData));
                    handleGetSuggestion();
                }
                else {
                    const newData = {
                        ...suggestion,
                        profile: profileString.split(","),
                        type: "suggestion"
                    };
                    if (localStorage !== null) {
                        for (const [key, itemString] of Object.entries(localStorage)) {
                            try {
                                const item = JSON.parse(itemString);
                                if (item.query === newData.query || item.suggestion === newData.suggestion) {
                                    localStorage.removeItem(key)
                                }
                            } catch (e) { }

                        }
                    }
                    await dispatch(updateSuggestion(getAdminApiBaseUrl(), newData));
                    handleGetSuggestion();
                }
            } else {
                if (isLinkTypeVisible && suggestion.type == "") {
                    const newData = {
                        ...suggestion,
                        profile: profileString.split(","),
                        type: "suggestion",
                    };
                    localStorage.setItem(Date.now().toString(), JSON.stringify(newData));
                    await dispatch(createSuggestion(getAdminApiBaseUrl(), newData));
                    await dispatch(retrieveFastLink(getAdminApiBaseUrl(), { query: "all" }));
                    var localCount = suggestionState.suggestionCount
                    let countSuggestion = localStorage.getItem('CountSuggestion');
                    if (countSuggestion === null) {
                        localCount++;
                        countSuggestion = localCount.toString();
                        localStorage.setItem('CountSuggestion', countSuggestion);
                    }
                    else {
                        countSuggestion = (parseInt(countSuggestion) + 1).toString();
                        localStorage.setItem('CountSuggestion', countSuggestion);
                    }
                    handleGetSuggestion();
                }
                else {
                    const newData = {
                        ...suggestion,
                        profile: profileString.split(","),
                        type: "suggestion"
                    };
                    localStorage.setItem(Date.now().toString(), JSON.stringify(newData));
                    await dispatch(createSuggestion(getAdminApiBaseUrl(), newData));
                    await dispatch(retrieveFastLink(getAdminApiBaseUrl(), { query: "all" }));
                    var localCount = suggestionState.suggestionCount
                    let countSuggestion = localStorage.getItem('CountSuggestion');
                    if (countSuggestion === null) {
                        localCount++;
                        countSuggestion = localCount.toString();
                        localStorage.setItem('CountSuggestion', countSuggestion);
                    }
                    else {
                        countSuggestion = (parseInt(countSuggestion) + 1).toString();
                        localStorage.setItem('CountSuggestion', countSuggestion);
                    }
                    handleGetSuggestion();
                }
            }
            props.setSuggestionModalShow(false);
            dispatch(addNotification("Updating suggestion", `Updating suggestion ${suggestion.query}`));
            localStorage.setItem('isUpdating', `${suggestion.query}`);
        }
    };

    const handleGetSuggestion = (search = "all", profile = "suggestions", page = 1, pageSize = 50) => {
        const data = { query: search, profile: profile, page: page, pageSize: pageSize };
        dispatch(retrieveSuggestion(getAdminApiBaseUrl(), data));
    };

    // On successful validation of each step set the wizard queryRule to pass to the next step
    // Set defaults for properties if not passed in.
    return (
        <Modal
            show={props.suggestionModalShow}
            onHide={() => props.setSuggestionModalShow(false)}
        >
            <Modal.Header closeButton>
                <Modal.Title>{props.title} Suggestion</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div>
                    <label>Query</label>
                    <input
                        className="form-control"
                        placeholder=""
                        value={suggestion?.query || ""}
                        onChange={(e) =>
                            setSuggestion({ ...suggestion, query: e.target.value })
                        }
                    />
                </div>
                <div>
                    <label>Suggestion</label>
                    <input
                        className="form-control"
                        placeholder=""
                        value={suggestion?.suggestion || ""}
                        onChange={(e) =>
                            setSuggestion({ ...suggestion, suggestion: e.target.value })
                        }
                    />
                </div>

                <div>
                    <label>Count</label>
                    <input
                        className="form-control"
                        placeholder=""
                        value={suggestion?.count || ""}
                        onChange={(e) =>
                            setSuggestion({ ...suggestion, count: parseInt(e.target.value, 10) })
                        }
                    />
                </div>



                <div>
                    <label>Available Profiles</label>
                    {adminSettingsState?.adminSettings?.availableProfiles?.map((profile, index) => (
                        <div key={index} className="form-check">
                            <input
                                type="checkbox"
                                className="form-check-input"
                                id={`profileCheckbox-${index}`}
                                value={profile?.title}
                                onChange={(e) => handleProfileChange(e, profile?.name)}
                                checked={selectedProfiles.includes(profile?.name)}
                            />
                            <label className="form-check-label" htmlFor={`profileCheckbox-${index}`}>
                                {profile?.title}
                            </label>
                        </div>
                    ))}
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Button
                    className="btn-modal-synonym"
                    variant="primary"
                    onClick={handleCreateSuggestion}
                >
                    Save
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default SuggestionModal;
