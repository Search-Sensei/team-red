import React, { useState } from "react";
import Button from "react-bootstrap/Button";
import * as uuid from "uuid";
import ConfirmDeletionModal from "../../common/components/ConfirmDeletionModal";
import { IQueryRuleCondition } from "../../store/models/queryrulecondition.interface";
import QueryRuleConditionModal from "./QueryRuleConditionModal";
import { QueryRuleType } from "../../store/models/queryruletype";

export type ConditionListProps = {
    /**
     * The type of the query rule. This is used to determine how many conditions can be added. Boosts and Blocks can only specify one condition.
     */
    queryRuleType: QueryRuleType;
    currentConditions: IQueryRuleCondition[];
    onUpdate: (selectedConditions: IQueryRuleCondition[]) => void;
};

const ConditionList: React.FC<ConditionListProps> = (props) => {
    const [selectedConditions, setSelectedConditions] = useState(props.currentConditions);
    const [selectedCondition, setSelectedCondition] = useState(getNewCondition());
    const [selectedIndex, setSelectedIndex] = useState(-1);

    // Delete Modal.
    const [deleteConfirmationModalShow, setDeleteConfirmationModalShow] = useState(false);

    // Add/Edit Modal.
    const [conditionModalShow, setConditionModalShow] = useState(false);

    // Add button disabled.
    const [addButtonDisabled, setAddButtonDisabled] = useState(isAddButtonDisabled());

    /**
     * If boosts and blocks only one condition can be added so we disable the Add button after one condition has been added.
     */
    function isAddButtonDisabled(): boolean {
        const isDisabled = props.queryRuleType === QueryRuleType.Feature ? false : selectedConditions.length >= 1;
        return isDisabled;
    }

    function getNewCondition(): IQueryRuleCondition {
        let newCondition: IQueryRuleCondition = {
            id: uuid.v4(),
            isExactMatch: false,
            keywordexact: "",
            keywords: ""
        };

        return newCondition;
    }

    function addConditionClick(): void {
        setSelectedIndex(-1);
        setSelectedCondition(getNewCondition());
        setConditionModalShow(true);
    }

    function onConditionClick(condition: IQueryRuleCondition, index: number): void {
        condition.isExactMatch = condition.keywordexact.length > 0;
        setSelectedIndex(index);
        setSelectedCondition(condition);
        setConditionModalShow(true);
    }

    function onConditionModalHide(condition?: IQueryRuleCondition): void {
        if (condition) {
            let conditions = selectedConditions;

            if (selectedIndex >= 0) {
                // Update the selected condition.
                setSelectedCondition(condition);
                conditions[selectedIndex] = condition;
            }
            else {
                // Add new condition.
                conditions.push(condition);
                setAddButtonDisabled(isAddButtonDisabled());
            }

            UpdateConditions(conditions);
        }

        // Hide the modal.
        setConditionModalShow(false);
    }

    function UpdateConditions(conditions: IQueryRuleCondition[]): void {
        // Store the updated conditions.
        setSelectedConditions(conditions);

        // Update the calling component i.e the wizard.
        props.onUpdate(conditions);
    }

    // Delete Modal.
    function onDeleteButtonClick(index: number): void {
        // Store the index selected.
        setSelectedIndex(index);
        setDeleteConfirmationModalShow(true);
    }

    // Delete confirmation modal.
    function onCancelDeleteConfirmationModal(): void {
        setDeleteConfirmationModalShow(false);
    }

    function onConfirmQueryRuleDeletion(): void {
        let conditions = selectedConditions;
        //var conditionIndex = conditions.findIndex(c => c.id === id);
        if (selectedIndex >= 0) {
            conditions.splice(selectedIndex, 1);
        }

        UpdateConditions(conditions);
        setAddButtonDisabled(isAddButtonDisabled());
        setDeleteConfirmationModalShow(false);
    }

    function keywordExactContent(condition: IQueryRuleCondition): JSX.Element {
        return (
            <div>
                <b>Exact Match: </b><span>{condition.keywordexact}</span>
            </div>
        );
    }

    function keywordsContent(condition: IQueryRuleCondition): JSX.Element {
        return (
            <div>
                <b>Words: </b><span>{condition.keywords}</span>
            </div>
        );
    }

    const conditionElements: (JSX.Element | null)[] = selectedConditions.map((condition, index) => {        
        if (!condition) { return null; }
        return (
            <tr className="table-row" key={index}>
                <td className="col-md-10" onClick={() => onConditionClick(condition, index)}>
                    {condition.isExactMatch ? keywordExactContent(condition) : keywordsContent(condition)}
                </td>
                <td className="col-md-2 action-button-column text-right">
                    <div className="text-center">
                        <Button key={index} className="action-link-button link-button" id={`delete-${index}`} onClick={() => onDeleteButtonClick(index)}><span><i className="fas fa-times-circle"></i></span></Button>
                    </div>
                </td>
            </tr>
        );
    });

    return (
        <div className="condition-list">
            <div className="row header-row">
                <div className="col-md-10 condition-title">
                    Search Terms
                </div>
                <div className="col-md-2 text-right">
                    <button id="addQueryRuleButton" className="btn btn-secondary condition-add-button" onClick={() => { addConditionClick(); }} disabled={addButtonDisabled}>
                        <i className="fas fa fa-plus"></i>
                    </button>
                </div>
            </div>

            <div className="table-responsive portlet">
                {selectedConditions.length === 0 ? <div className="alert alert-warning" role="alert">Please add search terms...</div> : null}

                <table className="table">
                    <tbody>
                        {conditionElements}
                    </tbody>
                </table>
            </div>

            <ConfirmDeletionModal showConfirmationModal={deleteConfirmationModalShow} onCancel={onCancelDeleteConfirmationModal} onConfirm={onConfirmQueryRuleDeletion} size="lg"></ConfirmDeletionModal>
            <QueryRuleConditionModal key={selectedCondition.id} modalShow={conditionModalShow} onModalHide={onConditionModalHide} selectedCondition={selectedCondition} queryRuleType={props.queryRuleType}></QueryRuleConditionModal>
        </div>
    );
}

export default ConditionList;
