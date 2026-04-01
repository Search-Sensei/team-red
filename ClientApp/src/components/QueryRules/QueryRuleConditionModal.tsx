import React, { ChangeEvent, useEffect, useState, useCallback } from 'react';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import ModalBody from 'react-bootstrap/ModalBody';
import TextInput from '../../common/components/TextInput';
import { IFormStateField, OnChangeModel } from "../../common/types/Form.types";
import { IQueryRuleCondition } from '../../store/models/queryrulecondition.interface';
import { QueryRuleType } from '../../store/models/queryruletype';
import MessageAlert from '../../common/components/MessageAlert';
import { MessageAlertType } from '../../common/types/MessageAlert.types';

export type QueryRuleConditionModalProps = {
    modalShow: boolean;
    onModalHide: (condition?: IQueryRuleCondition) => void;
    selectedCondition: IQueryRuleCondition;

    /**
     * The type of the query rule. Boosts and blocks will always use an exact match condition.
     */
    queryRuleType: QueryRuleType;
}

const QueryRuleConditionModal: React.FC<QueryRuleConditionModalProps> = (props) => {
    // Default number of rows to display.
    let rows: number = 10;
    const defaultValidationError = "You must enter text for the search term";
    const [error, setError] = useState("");

    // Boosts and blocks are always exact matches so disable the checkbox.
    let isExactMatchDisabled: boolean = props.queryRuleType === QueryRuleType.Boost;
    
    const getInitialSearchTermsState = useCallback((): IFormStateField<string> => {
        let searchTermsInitialState: IFormStateField<string> = {
            error: "",
            value: props.selectedCondition.keywordexact.length > 0 ? props.selectedCondition.keywordexact : props.selectedCondition.keywords
        };

        return searchTermsInitialState;
    }, [props.selectedCondition.keywordexact, props.selectedCondition.keywords]);

    /**
     * Boosts and blocks will always be an exact match. Featured content will be set to true if there are keywordexact terms.
     */
    const getIsExactMatch = useCallback((): boolean => {
        const isExactMatch: boolean = props.queryRuleType === QueryRuleType.Boost ? true : props.selectedCondition.keywordexact.length > 0;
        return isExactMatch;
    }, [props.selectedCondition, props.queryRuleType]);

    let [isExactMatch, setIsExactMatch] = useState(getIsExactMatch());
    let [searchTermsState, setSearchTermsState] = useState(getInitialSearchTermsState());

    // This forces the form to update with the new values each time the form renders. Have to set the 
    // dependency in the array to the selectedCondition to force it to action when this value changes.
    useEffect(() => {
        setSearchTermsState(getInitialSearchTermsState());
        setIsExactMatch(getIsExactMatch());
    }, [props.selectedCondition, getInitialSearchTermsState, getIsExactMatch]);

    function cancelClick(): void {
        props.onModalHide();
    }

    function okClick(): void {
        if (searchTermsState.value && searchTermsState.value.trim().length > 0) {
            let condition: IQueryRuleCondition = {
                id: props.selectedCondition.id,
                isExactMatch: isExactMatch,
                keywordexact: isExactMatch ? searchTermsState.value : "",
                keywords: isExactMatch ? "" : searchTermsState.value
            };

            props.onModalHide(condition);
        }
        else {
            // Inform the user that they must enter text for the search term.
            setError(defaultValidationError);
        }
    }

    function onFormFieldChange(model: OnChangeModel): void {
        const value = model.value.toString();

        if (value && value.trim().length > 0) {
            // Update the validation error message as the user has entered text now.
            setError("");
        }

        setSearchTermsState({ ...searchTermsState, error: model.error, value: value });
    }

    function onInputValueChanged(event: ChangeEvent<HTMLInputElement>): void {
        let isChecked = event.target.checked;
        setIsExactMatch(isChecked);
    }

    return (
        <Modal id="query-rule-condition-modal" show={props.modalShow} onHide={props.onModalHide} dialogClassName="query-rule-condition-modal" aria-labelledby="contained-modal-title-vcenter" centered>
            <Modal.Header closeButton>
                <Modal.Title id="contained-modal-title-vcenter">
                    Search Terms
                </Modal.Title>
            </Modal.Header>
            <ModalBody>
                <div className="form-row" key={props.selectedCondition.id}>
                    <div className="form-group col-md-12">
                        <MessageAlert type={MessageAlertType.Error} message={error} />
                        <label htmlFor="input_isExactMatch">{isExactMatch ? "Exact match" : "Words"}<small> (required)</small></label>
                        <TextInput
                            id="input_searchTerms"
                            type="textarea"
                            value={searchTermsState.value}
                            field="keywords"
                            onChange={onFormFieldChange}
                            required={true}
                            label="Search Terms"
                            placeholder="Enter search terms..."
                            rows={rows}
                            autofocus={true}
                            hideLabel={true}
                        />
                    </div>
                    <div className="form-group col-md-12">
                        <label htmlFor="input_isExactMatch">
                            <input
                                id="input_isExactMatch"
                                name="input_isExactMatch"
                                type="checkbox"
                                defaultChecked={isExactMatch}
                                onChange={onInputValueChanged}
                                disabled={isExactMatchDisabled}
                            /> Exact Match
                        </label>
                    </div>
                </div>
            </ModalBody>
            <Modal.Footer>
                <Button className="btn btn-light" onClick={cancelClick}>Cancel</Button>
                <Button className="btn btn-secondary" onClick={okClick}>OK</Button>
            </Modal.Footer>
        </Modal>
    );
}

export default QueryRuleConditionModal;
