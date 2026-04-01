import "bootstrap/dist/css/bootstrap.css";
import React, { Dispatch, useCallback, useEffect, useState } from "react";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import "./Synonym.css";
import { IStateType } from "../../store/models/root.interface";
import { useDispatch, useSelector } from "react-redux";
import { ISynonymState, Synonym } from "../../store/models/synonym.interface";
import { IAdminSettingsState } from "../../store/models/adminsettingsstate.interface";
import {
    createSynonym,
    updateSynonym,
    removeSynonymUpdate,
    retrieveSynonym,
} from "../../store/actions/synonym.action";
import LoadingIndicator from "../../common/components/LoadingIndicator";
import { normalizeAdminApiUrl } from "../../store/actions/adminsettings.actions";

interface IMyProps {
    synonymModalShow: boolean;
    setSynonymModalShow: Function;
    title: string;
}

const SynonymModal: React.FC<IMyProps> = (props: IMyProps) => {
    const dispatch: Dispatch<any> = useDispatch();
    const adminSettingsState: IAdminSettingsState = useSelector(
        (state: IStateType) => state.adminSettingsState
    );
    const synonymState: ISynonymState = useSelector(
        (state: IStateType) => state.synonymStateState
    );
    const [load, isLoad] = useState(false);

    const [synonym, setSynonym] = useState<Synonym>({
        id: "",
        word: "",
        synonyms: "",
        is: "Replaced With",
    });
    const [saveClicked, setSaveClicked] = useState(false);
    useEffect(() => {
        if (synonymState.synonymEdit.id) {
            setSynonym(synonymState.synonymEdit);
        }
    }, [synonymState.synonymEdit]);

    const getAdminApiBaseUrl = useCallback((): string => {
        return normalizeAdminApiUrl(adminSettingsState.adminSettings.searchAdminApiUrl);
    }, [adminSettingsState.adminSettings]);

    const handleCreateSynonym = async (): Promise<void> => {
        if (!synonym.synonyms || !synonym.word) {
            setSaveClicked(true);
            return;
        }
        else {
            isLoad(true)
            if (synonymState.synonymEdit.id) {
                await dispatch(updateSynonym(getAdminApiBaseUrl(), synonym));
            } else {
                await dispatch(createSynonym(getAdminApiBaseUrl(), synonym));
            }
            setTimeout(()=>{
                props.setSynonymModalShow(false);
                dispatch(retrieveSynonym(getAdminApiBaseUrl(), { synonyms: "" }));
            },250)
            
            await dispatch(removeSynonymUpdate());
        }
    };

    // On successful validation of each step set the wizard queryRule to pass to the next step
    // Set defaults for properties if not passed in.
    return (
        <Modal
            show={props.synonymModalShow}
            onHide={() => props.setSynonymModalShow(false)}
        >
            <Modal.Header closeButton>
                <Modal.Title>{props.title} Synonym</Modal.Title>
            </Modal.Header>
            <Modal.Body>
            {load? (<LoadingIndicator
                            text={'Loading'}
                            isLoading={load}
                        />) :
            (<div>
                <div>
                    <label>Synonym Name</label>
                    {(saveClicked && !synonym.synonyms) && (
                        <div className='validation-error-message' style={{ color: 'red' }}>Synonym Name is required</div>
                    )}
                    <input
                        className="form-control"
                        placeholder=""
                        value={synonym?.synonyms || ""}
                        onChange={(e) =>
                            setSynonym({ ...synonym, synonyms: e.target.value })
                        }
                    />
                </div>
                <div>
                    <label>IS</label>
                    <div className="d-flex field-is">
                        <Form.Check
                            className="form-synonym"
                            checked={synonym.is === "Replaced With"}
                            type="radio"
                            id="Replace-With"
                            onChange={(e: any) =>
                                setSynonym({ ...synonym, is: e.target.value })
                            }
                            name="is"
                            label="Replaced With"
                            value={"Replaced With"}
                        />
                        <Form.Check
                            className="form-synonym"
                            checked={synonym.is === "Either / OR"}
                            type="radio"
                            id="Either-Or"
                            onChange={(e: any) =>
                                setSynonym({ ...synonym, is: e.target.value })
                            }
                            name="is"
                            label="Either / OR"
                            value={"Either / OR"}
                        />
                    </div>
                </div>
                <div>
                    <label>Word</label>
                    {(saveClicked && !synonym.word) && (
                        <div className='validation-error-message' style={{ color: 'red' }}>Word is required</div>
                    )}
                    <input
                        className="form-control"
                        value={synonym?.word || ""}
                        onChange={(e) => setSynonym({ ...synonym, word: e.target.value })}
                        placeholder=""
                    />
                </div>
            </div>)}
                </Modal.Body>
            <Modal.Footer>
                <Button
                    className="btn-modal-synonym"
                    variant="primary"
                    onClick={handleCreateSynonym}
                    disabled={load}
                >
                    Save
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default SynonymModal;
