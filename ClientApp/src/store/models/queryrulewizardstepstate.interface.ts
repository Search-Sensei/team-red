import { IQueryRuleFormState } from "../../common/types/Form.types";
import { IQueryRuleWizardStepProps } from "./queryrulewizardstepprops.interface";

export interface IQueryRuleWizardStepState extends IQueryRuleWizardStepProps {
    formState: IQueryRuleFormState;
    validationError: string;
}