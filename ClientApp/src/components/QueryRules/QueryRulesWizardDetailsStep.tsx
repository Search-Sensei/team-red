import React from "react";
import TextInput from "../../common/components/TextInput";
import { IQueryRuleWizardStepProps } from "../../store/models/queryrulewizardstepprops.interface";
import { IQueryRuleWizardStepState } from "../../store/models/queryrulewizardstepstate.interface";
import QueryRulesWizardStepBase from "./QueryRulesWizardStepBase";
import { QueryRuleType } from "../../store/models/queryruletype";

class QueryRulesWizardDetailsStep<P extends IQueryRuleWizardStepProps, S extends IQueryRuleWizardStepState> extends QueryRulesWizardStepBase<P, S> {
    defaultValidationError: string = "You must enter a Name (can't be the name of created boost block rules), Start Date and End Date";
    invalidDatesError: string = "End date must be greater than start date";

    // Override the base method.
    isFormValid = (): boolean => {
        // Reset validation error message.
        this.setState({ ...this.state, validationError: "" });
        let allowedName = this.props.selectedQueryRule.type !== QueryRuleType.Boost || this.props.disallowedNames.findIndex((name) => name === this.state.formState.name.value) === -1;

        let isValid: boolean =
            (
                allowedName &&
                this.isFormFieldValid<string>(this.state.formState.name, true) &&
                this.isFormFieldValid<string>(this.state.formState.datestart, true) &&
                this.isFormFieldValid<string>(this.state.formState.dateend, true)
            );

        if (!isValid) {
            // Set the validation error message.
            this.setState({ ...this.state, validationError: this.defaultValidationError });
        }
        else {

            let startDate: Date | null = this.state.formState.datestart.value.length > 0 ? new Date(this.state.formState.datestart.value) : null;
            let endDate: Date | null = this.state.formState.dateend.value.length > 0 ? new Date(this.state.formState.dateend.value) : null;

            // Validate that end date is greater than start date.
            if (isValid && startDate && endDate) {
                isValid = endDate > startDate;

                if (!isValid) {
                    // Set the validation error message.
                    this.setState({ ...this.state, validationError: this.invalidDatesError });
                }
            }
        }

        return isValid;
    }

    render() {
        return (
            <div>
                {this.errorAlertContent()}
                <div className="form-row">
                    <div className="form-group col-md-12">
                        <TextInput
                            id="input_name"
                            value={this.state.formState.name.value}
                            field="name"
                            onChange={this.onFormFieldChange}
                            required={true}
                            maxLength={100}
                            label="Name"
                            placeholder="Name"
                            autofocus={true} />
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group col-md-6">
                        <TextInput
                            id="input_datestart"
                            type="datepicker"
                            value={this.state.formState.datestart.value}
                            field="datestart"
                            onChange={this.onFormFieldChange}
                            required={true}
                            label="Start Date"
                            placeholder="Start Date"
                            isClearable={false}
                        />
                    </div>
                    <div className="form-group col-md-6">
                        <TextInput
                            id="input_dateend"
                            type="datepicker"
                            value={this.state.formState.dateend.value}
                            field="dateend"
                            onChange={this.onFormFieldChange}
                            required={true}
                            label="End Date"
                            placeholder="End Date"
                            isClearable={false}
                        />
                    </div>
                </div>
            </div>
        );
    }
};

export default QueryRulesWizardDetailsStep;
