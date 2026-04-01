import "bootstrap/dist/css/bootstrap.css";
import React, { Dispatch, useCallback, useEffect, useState } from "react";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { IStateType } from "../../store/models/root.interface";
import { useDispatch, useSelector } from "react-redux";
import {
    IFastLinksState,
    FastLinks,
    UpdateCategories,
    Categories,
    PutCategories,
    UpdateFastLinks,
} from "../../store/models/fastlinks";
import { IAdminSettingsState } from "../../store/models/adminsettingsstate.interface";
import {
    createFastLink,
    retrieveFastLink,
    updateFastLink,
    retrieveCategories,
    updateCategories,
} from "../../store/actions/fastlink.action";
import { forEach } from "lodash";
import { normalizeAdminApiUrl } from "../../store/actions/adminsettings.actions";

let options: Array<ICategories> = [];
interface ICategories {
    value: string;
    label: string;
}
interface IMyProps {
    fastLinkModalShow: boolean;
    setFastLinkModalShow: Function;
    title: string;
}

const FastLinksModal: React.FC<IMyProps> = (props: IMyProps) => {
    const [selectedOption, setSelectedOption] = useState<Array<ICategories>>();
    const dispatch: Dispatch<any> = useDispatch();
    const adminSettingsState: IAdminSettingsState = useSelector(
        (state: IStateType) => state.adminSettingsState
    );
    const fastLinkState: IFastLinksState = useSelector(
        (state: IStateType) => state.fastLinkStateState
    );
    const [fastLink, setFastLink] = useState<FastLinks>({
        id: "",
        navName: "",
        navDescription: "",
        navLink: "",
        sequence: 0,
        extensionKeywords: [],
        fastLinkId: "",
        descriptionCategory: "",
        linkType: "",
        rowKey: "",
    });
    const [popularLink, setPopularLink] = useState<boolean>(false);
    const [categoriesFastLinksString, setCategoriesFastLinksString] =
        useState<string>("");

    useEffect(() => {
        if (fastLinkState.fastLinkEdit.navName) {
            setFastLink(fastLinkState.fastLinkEdit);
        }
    }, [fastLinkState.fastLinkEdit]);

    const handleGetCategories = (search = "all") => {
        const data = { query: search };
        dispatch(retrieveCategories(getAdminApiBaseUrl(), data));
    };

    useEffect(() => {
        handleGetCategories();
    }, []);

    useEffect(() => {
        if (fastLinkState && fastLinkState.categories) {
            fastLinkState.categories.forEach((element) => {
                if (
                    options.findIndex((item) => item.value == element.categoryName) == -1
                ) {
                    let category: ICategories = {
                        value: element.categoryName,
                        label: element.categoryName,
                    };
                    options.push(category);
                }
            });
        }
    }, [fastLinkState]);

    const getAdminApiBaseUrl = useCallback((): string => {
        return normalizeAdminApiUrl(adminSettingsState.adminSettings.searchAdminApiUrl);
    }, [adminSettingsState.adminSettings]);

    const handleCreateFastLink = () => {
        setFastLink({
            ...fastLink,
        });

        if (fastLinkState.fastLinkEdit.navName) {
            dispatch(
                updateFastLink(getAdminApiBaseUrl(), {
                    ...fastLink,
                })
            );
        } else {
            dispatch(
                createFastLink(getAdminApiBaseUrl(), {
                    ...fastLink,
                })
            );
            dispatch(
                retrieveFastLink(getAdminApiBaseUrl(), {
                    query: "all",
                })
            );
        }
        props.setFastLinkModalShow(false);
        handleGetFastLink();
    };
    const getEditTitle = (title: string) => {
        if (title == "Edit" && popularLink) {
            return "Edit";
        }

        return "Create";
    };

    const enterSelectValue = (event: any) => {
        setSelectedOption(event);
    };

    const handleGetFastLink = (search = "all") => {
        const data = { query: search };
        dispatch(retrieveFastLink(getAdminApiBaseUrl(), data));
    };

    // On successful validation of each step set the wizard queryRule to pass to the next step
    // Set defaults for properties if not passed in.
    return (
        <Modal
            show={props.fastLinkModalShow}
            onHide={() => props.setFastLinkModalShow(false)}
        >
            {/* @ts-ignore */}
            <div>
                {/* @ts-ignore */}
                <Modal.Header closeButton>
                    {/* @ts-ignore */}
                    <Modal.Title>{getEditTitle(props.title)} Fast Link</Modal.Title>
                </Modal.Header>
                {/* @ts-ignore */}
                <Modal.Body>
                    <div>
                        <label>Nav Name</label>
                    <input
                        disabled
                        className="form-control"
                        placeholder=""
                        value={fastLink?.navName || ""}
                        onChange={(e) =>
                            setFastLink({ ...fastLink, navName: e.target.value })
                        }
                    />
                </div>
                <div>
                    <label>Nav Description</label>
                    <input
                        disabled
                        className="form-control"
                        placeholder=""
                        value={fastLink?.navDescription || ""}
                        onChange={(e) =>
                            setFastLink({ ...fastLink, navDescription: e.target.value })
                        }
                    />
                </div>
                <div>
                    <label>Nav Link</label>
                    <input
                        disabled
                        className="form-control"
                        placeholder=""
                        value={fastLink?.navLink || ""}
                        onChange={(e) =>
                            setFastLink({ ...fastLink, navLink: e.target.value })
                        }
                    />
                </div>
                <div>
                    <label>Sequence</label>
                    {(fastLink?.sequence > 0 && fastLinkState.disallowedSeq.indexOf(parseInt(fastLink?.sequence)) !== -1 && (
                        <div className='validation-error-message' style={{ color: 'red' }}>This sequence is already chosen by a different FastLink</div>
                    ))}
                    <input
                        className="form-control"
                        type="Number"
                        placeholder=""
                        value={fastLink?.sequence || ""}
                        onChange={(e) =>
                            setFastLink({ ...fastLink, sequence: e.target.value })
                        }
                    />
                    </div>
                {/* @ts-ignore */}
            </Modal.Body>
            {/* @ts-ignore */}
            <Modal.Footer>
                {/* @ts-ignore */}
                <Button
                    className="btn-modal-synonym"
                    variant="primary"
                    onClick={handleCreateFastLink}
                    disabled={(fastLink?.sequence > 0 && fastLinkState.disallowedSeq.indexOf(parseInt(fastLink?.sequence)) !== -1)}
                >
                    Save
                </Button>
            </Modal.Footer>
            </div>
        </Modal>
    );
};

export default FastLinksModal;
