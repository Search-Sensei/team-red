import React from "react";
import { IQueryRuleCondition } from "../../store/models/queryrulecondition.interface";
import { IQueryRuleWizardStepProps } from "../../store/models/queryrulewizardstepprops.interface";
import { IQueryRuleWizardStepState } from "../../store/models/queryrulewizardstepstate.interface";
import QueryRulesWizardStepBase from "./QueryRulesWizardStepBase";
import ProfileList from "./ProfileList";
import ConditionList from "./ConditionList";
import { QueryRuleType } from "../../store/models/queryruletype";

class QueryRulesWizardConditionsStep extends QueryRulesWizardStepBase<IQueryRuleWizardStepProps, IQueryRuleWizardStepState> { 
    defaultFeatureValidationError: string = "You must enter at least one search term and select at least one profile.";
    defaultBoostsBlocksValidationError: string = "You must enter only one search term and select at least one profile because 'boosts' and 'blocks' can only be selected with a query/profile combination.";

    // Override the base method.    
    isFormValid = (): boolean => {
        const isFeature: boolean = this.state.formState.type.value === QueryRuleType.Feature;
        
        const isValidProfiles: boolean = this.state.formState.profiles.value.length >= 1 && (isFeature || this.state.formState.profiles.value.length <= 2);
    
        const validationError: string = isFeature
            ? this.defaultFeatureValidationError
            : this.defaultBoostsBlocksValidationError;
    
        const isValid: boolean =
            (
                this.isFormFieldValid<string[]>(this.state.formState.profiles) &&
                this.isFormFieldValid<IQueryRuleCondition[]>(this.state.formState.conditions) &&
                isValidProfiles && 
                this.state.formState.conditions.value.length > 0
            );
    
        this.setState({ ...this.state, validationError: isValid ? "" : validationError });
    
        return isValid;
    }    

    onProfilesUpdate = (selectedProfiles: string[]): void => {
        if (selectedProfiles.length > 2 && this.props.selectedQueryRule.type == QueryRuleType.Boost) {
            this.setState({
                ...this.state,
                validationError: "You can select up to 2 profiles only."
            });
            return;
        }
    
        // Set the selected profiles here. After validation the wizard component will handle updating the selected QueryRule.
        this.updateFormState("onProfilesUpdate", {
            ...this.state.formState,
            profiles: {
                error: "",
                value: selectedProfiles
            }
        });
    }

    onConditionsUpdate = (selectedConditions: IQueryRuleCondition[]): void => {
        // Set the selected conditions here. After validation the wizard component will handle updating the selected QueryRule.
        this.updateFormState("onConditionsUpdate", {
            ...this.state.formState,
            conditions: {
                error: "",
                value: selectedConditions
            }
        });
    }

    render() {
        return (
            <div>
                {this.errorAlertContent()}
                <div className="row conditions-container">
                    <div className="col-md-8">
                        <ConditionList currentConditions={this.state.formState.conditions.value} onUpdate={this.onConditionsUpdate} queryRuleType={this.props.selectedQueryRule.type}></ConditionList>
                    </div>
                    <div className="col-md-4">
                        <ProfileList currentProfiles={this.state.formState.profiles.value} onUpdate={this.onProfilesUpdate} queryRuleType={this.props.selectedQueryRule.type}></ProfileList>
                    </div>
                </div>
            </div>
        );
    }
};

export default QueryRulesWizardConditionsStep;
