import React, { Fragment } from "react";
import TextInput from "../../common/components/TextInput";
import { QueryRuleType } from "../../store/models/queryruletype";
import { IQueryRuleWizardStepProps } from "../../store/models/queryrulewizardstepprops.interface";
import { IQueryRuleWizardStepState } from "../../store/models/queryrulewizardstepstate.interface";
import QueryRulesWizardStepBase from "./QueryRulesWizardStepBase";
import BoostsBlocks from "./BoostsBlocks"
import { IQueryRuleCondition } from "../../store/models/queryrulecondition.interface";
import { getBaseUrl } from "../../store/actions/adminsettings.actions";
import HeaderDTO from "./HeaderDTO";

(global as any).local = [];
(global as any).localCount = 0;

class QueryRulesWizardContentStep extends QueryRulesWizardStepBase<
    IQueryRuleWizardStepProps,
    IQueryRuleWizardStepState
> {
    // Default number of rows to display.

    rows: number = 10;
    isFeature: boolean =
        this.state.formState.type.value === QueryRuleType.Feature;
    validationError: string =
        "You must select at least one item to be blocked or boosted.";

    // Override the base method.
    isFormValid = (): boolean => {
        const isValid: boolean = this.isFormFieldValid<string>(
            this.state.formState.payload,
            true
        );

        this.setState({
            ...this.state,
            validationError: isValid ? "" : this.validationError,
        });

        return isValid;
    };

    featuredContent = (): JSX.Element => {
        return (
            <div className="form-row">
                <div className="form-group col-md-12">
                    <TextInput
                        id="input_payload"
                        type="textarea"
                        value={this.state.formState.payload.value}
                        field="payload"
                        onChange={this.onFormFieldChange}
                        required={true}
                        label="Payload"
                        placeholder="HTML content here..."
                        rows={this.rows}
                        autofocus={true}
                    />
                </div>
                <div className="form-group col-md-12">
                    <TextInput
                        id="input_image"
                        type="textarea"
                        value={this.state.formState.payload2.value}
                        field="payload2"
                        onChange={this.onFormFieldChange}
                        required={false}
                        label="Image Reference"
                        placeholder="HTML content here..."
                        rows={this.rows}
                        autofocus={true}
                    />
                </div>
            </div>
        );
    };

    onBoostsBlocksPayloadUpdate = (payload: string, payloadType: 'payload' | 'payload2'): void => {
        let updatedState: IQueryRuleWizardStepState;
        if (payloadType === 'payload') {
            updatedState = {
                ...this.state,
                formState: {
                    ...this.state.formState,
                    payload: { error: "", value: payload },
                },
            };
        }
        else {
            updatedState = {
                ...this.state,
                formState: {
                    ...this.state.formState,
                    payload2: { error: "", value: payload },
                },
            };
        }

        if (payload && payload.length > 0) {
            updatedState.validationError = "";
        }

        this.setState(updatedState);

    };

    onRerender = (): void => {
        let updatedState: IQueryRuleWizardStepState;
        updatedState = {
            ...this.state
        }
        this.setState(updatedState);
    }

    /**
     * Get the query from the first condition's keywordexact property.
     */
    getQuery = (): string => {
        const conditions: IQueryRuleCondition[] =
            this.state.selectedQueryRule.conditions;
        const query =
            conditions && conditions.length > 0 ? conditions[0].keywordexact : "";
        return query;
    };

    /**
     * Get the profile from the first item in the profiles collection.
     */
    getProfile = (): string => {
        //const profiles: string[] = this.state.selectedQueryRule.profiles;
        //const profile = profiles && profiles.length > 0 ? profiles[0] : "";
        //return profile;

        // Have to use this static property because for some reason the code above is not being updated when the user changes the
        // selected profile. However, the query above is working when the user changes the search term. Cannot find why the state is
        // not being persisted here. This is a temporary fix until we can resolve the issue.
        const profile = QueryRulesWizardStepBase.currentProfile;
        return profile;
    };

    /**
     * Get the current payload from the initial value stored in the selected QueryRule.
     */
    getPayload = (): string => {
        const payload: string = this.props.selectedQueryRule.payload;
        return payload;
    };

    getPayload2 = (): string => {
        const payload2: string = this.props.selectedQueryRule.payload2;
        return payload2;
    };

    boostsAndBlocksContent = (): JSX.Element => {
        if ((global as any).profile.length !== 0) {
            (global as any).local = (global as any).profile
        }
        if ((global as any).count !== 0) {
            (global as any).localCount = (global as any).count
        }
        return (
            <>
                <HeaderDTO query={this.getQuery()} />


                {(global as any).localCount == 1 ? (
                    <div className="boost-blocks-container">
                        {this.errorAlertContent()}
                        <BoostsBlocks
                            table={0}
                            query={this.getQuery()}
                            profile={(global as any).local[0]}
                            payload={this.getPayload()}
                            onRerender={() => this.onRerender()}
                            onPayloadUpdate={(payload: string) => this.onBoostsBlocksPayloadUpdate(payload, 'payload')}
                        />
                    </div>
                ) : (global as any).localCount == 2 ? (
                    <div className={(global as any).hide === true ? "" : "d-flex justify-content-center align-items-center"}>
                        <div className="" style={{}}>
                            {this.errorAlertContent()}
                            <BoostsBlocks
                                table={1}
                                query={this.getQuery()}
                                profile={(global as any).local[0] ?? this.state.selectedQueryRule.profiles[0]}
                                payload={this.getPayload()}
                                onRerender={() => this.onRerender()}
                                onPayloadUpdate={(payload: string) => this.onBoostsBlocksPayloadUpdate(payload, 'payload')}
                            />
                        </div>
                        <div className="" style={{}}>

                            {(global as any).hide === false ? this.errorAlertContent() : null}
                            <BoostsBlocks
                                table={2}
                                query={this.getQuery()}
                                profile={(global as any).local[1] ?? this.state.selectedQueryRule.profiles[1]}
                                payload={this.getPayload2()}
                                onRerender={() => this.onRerender()}
                                onPayloadUpdate={(payload: string) => this.onBoostsBlocksPayloadUpdate(payload, 'payload2')}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="boost-blocks-container">
                        {this.errorAlertContent()}
                        <BoostsBlocks
                            table={0}
                            query={this.getQuery()}
                            profile={this.getProfile()}
                            payload={this.getPayload()}
                            onRerender={() => this.onRerender()}
                            onPayloadUpdate={(payload: string) => this.onBoostsBlocksPayloadUpdate(payload, 'payload')}
                        />
                    </div>
                )}
            </>
        );
    };

    render() {
        const baseApiUrl: string = getBaseUrl();
        let content = null;

        if (this.isFeature) {
            content = this.featuredContent();
        } else {
            content = this.boostsAndBlocksContent();
        }

        return (
            <Fragment>
                {content}
            </Fragment>
        );
    }
}

export default QueryRulesWizardContentStep;
