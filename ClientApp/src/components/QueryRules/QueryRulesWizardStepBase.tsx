import React from "react";

import { IFormStateField, IQueryRuleFormState, OnChangeModel } from "../../common/types/Form.types";
import { IQueryRuleWizardStepProps } from "../../store/models/queryrulewizardstepprops.interface";
import { IQueryRuleWizardStepState } from "../../store/models/queryrulewizardstepstate.interface";

class QueryRulesWizardStepBase<P extends IQueryRuleWizardStepProps, S extends IQueryRuleWizardStepState> extends React.Component<P, S> {
    protected defaultValidationError: string = "";

    /**
     * This static property has been added because for some reason the this.state.formState.profiles is not persisting between
     * wizard steps. This is a temporary solution to overcome this issue. This property is used for Boosts and Blocks
     * to be able to determine if the user has changed the profile in the conditions wizard step to be able retrieve 
     * search results using the updated profile.
     */
    protected static currentProfile: string = "";

    constructor(props: IQueryRuleWizardStepProps) {
        super(props as P);

        this.state = this.getInitialState();
    }

    protected getInitialState(): S {
        let formState: IQueryRuleFormState = {
            // Details.
            name: { error: "", value: this.props.selectedQueryRule.name },
            type: { error: "", value: this.props.selectedQueryRule.type },
            datestart: { error: "", value: this.props.selectedQueryRule.datestart },
            dateend: { error: "", value: this.props.selectedQueryRule.dateend },

            // Conditions.
            conditions: { error: "", value: this.props.selectedQueryRule.conditions },
            profiles: { error: "", value: this.props.selectedQueryRule.profiles },

            // Content.
            payload: { error: "", value: this.props.selectedQueryRule.payload },
            payload2: { error: "", value: this.props.selectedQueryRule.payload2 },
        };

        let state: IQueryRuleWizardStepState = {
            ...this.state,
            onStepValidated: this.props.onStepValidated,
            selectedQueryRule: this.props.selectedQueryRule,
            wizardStep: this.props.wizardStep,
            formState: formState,
            validationError: ""
        };

        // Initialise this field with the top profile passed to the control i.e. the profile that has been previously 
        // selected and saved to the QueryRules.
        QueryRulesWizardStepBase.currentProfile = this.getProfile(this.props.selectedQueryRule && this.props.selectedQueryRule.profiles ? this.props.selectedQueryRule.profiles : []);

        return state as S;
    }

    /**
     * Selects the first profile from the list of profile names because Boosts and Blocks requires a single 
     * profile to be able retrieve search results for the search term/profile selected in the Conditions wizard step.
     * @param profiles A collection of profile names to select from.
     */
    protected getProfile(profiles: string[]): string {
        let profile: string = "";

        if (profiles && profiles.length > 0) {
            // Select the first item as Boosts and Blocks only uses one profile..
            profile = profiles[0];
        }

        return profile;
    }

    protected isValidated = (): boolean => {
        var isValid = this.isFormValid();

        if (isValid) {
            // Call the parent callback function to return the queryRule.    
            this.state.onStepValidated({
                ...this.state.selectedQueryRule,
                name: this.state.formState.name.value,
                type: this.state.formState.type.value,
                payload: this.state.formState.payload.value,
                payload2: this.state.formState.payload2.value,
                datestart: this.state.formState.datestart.value,
                dateend: this.state.formState.dateend.value,
                profiles: this.state.formState.profiles.value,
                conditions: this.state.formState.conditions.value,
            }, this.state.wizardStep);

            // Setting the profile here because the profiles are correct when the user changes their selection
            // in the Conditions wizard step to be able to use in the final wizard 'Content' step.
            QueryRulesWizardStepBase.currentProfile = this.getProfile(this.state.formState.profiles.value);
        }

        return isValid;
    }

    protected onFormFieldChange = (model: OnChangeModel): void => {
        this.setState({ ...this.state, formState: { ...this.state.formState, [model.field]: { error: model.error, value: model.value } } });
    }

    protected updateFormState(methodName: string, queryRuleFormState: IQueryRuleFormState): void {
        this.setState({
            ...this.state,
            formState: queryRuleFormState
        });
    }

    protected isFormFieldValid<T>(field: IFormStateField<T>, isRequiredField: boolean = false): boolean {
        let isValid = field.error.length === 0;

        if (isRequiredField) {
            isValid = isValid && field.value !== null && field.value !== undefined;

            if (isValid && typeof field.value === "string") {
                let stringValue: string = field.value;
                isValid = isValid && stringValue.length > 0;
            }
        }

        return isValid;
    }

    // Check that the form fields don't have errors and that the name has been completed.
    // Override this function in steps deriving from this base class to implement validation 
    // per step.
    protected isFormValid = (): boolean => {
        // Override this logic to validate the wizard step.
        return true;
    }

    protected errorAlertContent(): JSX.Element | null {
        if (this.state.validationError.length === 0) {
            return null;
        }

        return (
            <div className="row">
                <div className="col-md-12">
                    <div className="alert alert-danger" role="alert">{this.state.validationError}</div>
                </div>
            </div>
        );
    }
};

export default QueryRulesWizardStepBase;
