import { IQueryRule } from "./queryrule.interface";
import { QueryRuleWizardStepType } from "./queryrulewizardsteptype";

export interface IQueryRuleWizardStepProps {
    selectedQueryRule: IQueryRule;
    onStepValidated: (queryRule: IQueryRule, wizardStep: QueryRuleWizardStepType) => void;
    wizardStep: QueryRuleWizardStepType;
    disallowedNames : string[];
}