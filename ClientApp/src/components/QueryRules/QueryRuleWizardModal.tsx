import React from 'react';
import Modal from 'react-bootstrap/Modal';
import { QueryRuleModificationStatus } from '../../store/models/queryrulemodificationstatus';
import { QueryRuleType } from '../../store/models/queryruletype';
import QueryRulesWizard from './QueryRulesWizard';
import { IQueryRule } from '../../store/models/queryrule.interface';

export type QueryRuleWizardModalProps = {
    wizardShow: boolean;
    onWizardHide: (updatedQueryRule?: IQueryRule) => void;
    queryRuleType: QueryRuleType;
    modificationStatus: QueryRuleModificationStatus;
    selectedQueryRule: IQueryRule;
    disallowedNames: string[];
}

const QueryRuleWizardModal: React.FC<QueryRuleWizardModalProps> = (props) => {
    const validate: boolean = true;

    function convertDateTimeToIsoString(datetime: string): string {
        let convertedDate = new Date(datetime).toISOString();
        return convertedDate;
    }

    function finishButtonClick(updatedQueryRule?: IQueryRule): void {
        if (updatedQueryRule) {
            // Ensure the dates are in the correct format.
            updatedQueryRule = {
                ...updatedQueryRule,
                datestart: convertDateTimeToIsoString(updatedQueryRule.datestart),
                dateend: convertDateTimeToIsoString(updatedQueryRule.dateend)
            }
        }

        props.onWizardHide(updatedQueryRule);
    }

    return (
        <Modal id="query-rule-wizard-modal" show={props.wizardShow} onHide={props.onWizardHide} className="wizard-modal" size="xl" aria-labelledby="contained-modal-title-vcenter" centered>
            <QueryRulesWizard queryRuleType={props.queryRuleType} modificationStatus={props.modificationStatus} color="primary" validate={validate} selectedQueryRule={props.selectedQueryRule} finishButtonClick={finishButtonClick} disallowedNames={props.disallowedNames}/> 
        </Modal>
    );
}

export default ({ wizardShow, onWizardHide, queryRuleType, modificationStatus, selectedQueryRule, disallowedNames }: { wizardShow: boolean, onWizardHide: (updatedQueryRule?: IQueryRule) => void, queryRuleType: QueryRuleType, modificationStatus: QueryRuleModificationStatus, selectedQueryRule: IQueryRule, disallowedNames: string[] }) => (
    <QueryRuleWizardModal wizardShow={wizardShow} onWizardHide={onWizardHide} queryRuleType={queryRuleType} modificationStatus={modificationStatus} selectedQueryRule={selectedQueryRule} disallowedNames={disallowedNames}></QueryRuleWizardModal>
)
