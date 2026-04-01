import "bootstrap/dist/css/bootstrap.css";
import React from "react";
import ReactWizard from "react-bootstrap-wizard";
import { Col, Row } from "reactstrap";
import { IQueryRule } from "../../store/models/queryrule.interface";
import { QueryRuleModificationStatus } from "../../store/models/queryrulemodificationstatus";
import { QueryRuleType } from "../../store/models/queryruletype";
import { IQueryRuleWizardStepProps } from "../../store/models/queryrulewizardstepprops.interface";
import QueryRulesWizardConditionsStep from "./QueryRulesWizardConditionsStep";
import QueryRulesWizardContentStep from "./QueryRulesWizardContentStep";
import QueryRulesWizardDetailsStep from "./QueryRulesWizardDetailsStep";
import { QueryRuleWizardStepType } from "../../store/models/queryrulewizardsteptype";

(global as any).local = [];
(global as any).localCount = 0;

export type QueryRulesWizardProps = {
    title?: string;
    validate?: boolean;
    previousButtonText?: string;
    finishButtonText?: string;
    nextButtonText?: string;
    color?: string;
    progressbar?: boolean;
    finishButtonClick: (updatedQueryRule: IQueryRule) => void;
    queryRuleType: QueryRuleType;
    modificationStatus: QueryRuleModificationStatus;
    selectedQueryRule: IQueryRule;
    disallowedNames: string[];
};

export interface IQueryRulesWizardState {
    selectedQueryRule: IQueryRule;
}

/**
 * Uses a react wizard control to display the steps for creating a boost/block QueryRule.
 * See ReactWizard documentation here: 
 *      https://www.npmjs.com/package/react-bootstrap-wizard
 *      https://www.npmjs.com/package/react-bootstrap-wizard-v2
 *      https://github.com/creativetimofficial/react-bootstrap-wizard
 *      
 * ReactWizard Demo: https://demos.creative-tim.com/bootstrap-wizard/index.html
 */
class QueryRulesWizard extends React.Component<QueryRulesWizardProps, IQueryRulesWizardState> {
    steps: any;
    stepProperties: IQueryRuleWizardStepProps;

    constructor(props: QueryRulesWizardProps) {
        super(props);

        this.state = {
            selectedQueryRule: this.props.selectedQueryRule
        };

        this.stepProperties = {
            selectedQueryRule: this.getSelectedQueryRule(),
            onStepValidated: this.onStepValidated,
            wizardStep: QueryRuleWizardStepType.Details,
            disallowedNames: this.disallowedNames
        }

        // The wizard steps
        this.steps = [
            {
                stepName: "Details",
                component: QueryRulesWizardDetailsStep,
                stepProps: this.stepProperties
            },
            {
                stepName: "Conditions",
                component: QueryRulesWizardConditionsStep,
                stepProps: {
                    ...this.stepProperties,
                    wizardStep: QueryRuleWizardStepType.Conditions
                }
            },
            {
                stepName: "Content",
                component: QueryRulesWizardContentStep,
                stepProps: {
                    ...this.stepProperties,
                    wizardStep: QueryRuleWizardStepType.Content
                }
            }
        ];
    }

    // On successful validation of each step set the wizard queryRule to pass to the next step.
    onStepValidated = (queryRule: IQueryRule, wizardStep: QueryRuleWizardStepType): void => {
        let queryRuleUpdate: IQueryRule;
        if ((global as any).profile.length !== 0) {
            (global as any).local = (global as any).profile
        }

        // Only update the QueryRule with the properties that may have been updated in each wizard step.
        switch (wizardStep) {
            case QueryRuleWizardStepType.Details: {
                (global as any).hide = false;
                queryRuleUpdate = {
                    ...this.state.selectedQueryRule,
                    name: queryRule.name,
                    datestart: queryRule.datestart,
                    dateend: queryRule.dateend
                };

                break;
            }
            case QueryRuleWizardStepType.Conditions: {
                (global as any).hide = false;
                queryRuleUpdate = {
                    ...this.state.selectedQueryRule,
                    conditions: queryRule.conditions,
                    profiles: (global as any).local
                };

                break;
            }
            case QueryRuleWizardStepType.Content: {
                (global as any).hide = false;
                queryRuleUpdate = {
                    ...this.state.selectedQueryRule,
                    payload: queryRule.payload,
                    payload2: queryRule.payload2
                };

                break;
            }
        }

        this.setState({
            ...this.state,
            selectedQueryRule: queryRuleUpdate
        });
    }

    getSelectedQueryRule = (): IQueryRule => {
        return this.state.selectedQueryRule;
    }

    finishButtonClick = (): void => {
        let updatedQueryRule: IQueryRule = this.state.selectedQueryRule;
        this.props.finishButtonClick(updatedQueryRule);
    }

    disallowedNames = this.props.disallowedNames.filter((name) => name !== this.props.selectedQueryRule.name);
    isFeature: boolean = this.props.queryRuleType === QueryRuleType.Feature;
    queryRuleTypeTitle: string = this.isFeature ? "Featured Content" : "Boosts and Blocks";
    modificationStatusText = QueryRuleModificationStatus[this.props.modificationStatus];

    // Set defaults for properties if not passed in.
    // E.g. "Edit Featured Content".
    title = this.props.title ? this.props.title : `${this.modificationStatusText} ${this.queryRuleTypeTitle}`;
    previousButtonText = this.props.previousButtonText ? this.props.previousButtonText : "Previous";
    finishButtonText = this.props.finishButtonText ? this.props.finishButtonText : "Finish";
    nextButtonText = this.props.nextButtonText ? this.props.nextButtonText : "Next";
    color = this.props.color ? this.props.color : "primary";

    render() {
        return (
            <Row>
                <Col xs={12} md={12} className="mr-auto ml-auto">
                    <ReactWizard
                        steps={this.steps}
                        navSteps
                        title={this.title}
                        headerTextCenter
                        validate={this.props.validate}
                        progressbar={this.props.progressbar}
                        color={this.color}
                        previousButtonText={this.previousButtonText}
                        finishButtonText={this.finishButtonText}
                        nextButtonText={this.nextButtonText}
                        finishButtonClick={this.finishButtonClick}
                    />
                </Col>
            </Row>
        );
    }
};

export default ({ title, validate, previousButtonText, finishButtonText, nextButtonText, color, progressbar, finishButtonClick, queryRuleType, modificationStatus, selectedQueryRule, disallowedNames }: { title?: string, validate?: boolean, previousButtonText?: string, finishButtonText?: string, nextButtonText?: string, color?: string, progressbar?: boolean, finishButtonClick: (updatedQueryRule?: IQueryRule) => void, queryRuleType: QueryRuleType, modificationStatus: QueryRuleModificationStatus, selectedQueryRule: IQueryRule, disallowedNames: string[]}) => (
    <QueryRulesWizard
        title={title}
        validate={validate}
        previousButtonText={previousButtonText}
        finishButtonText={finishButtonText}
        nextButtonText={nextButtonText}
        color={color}
        progressbar={progressbar}
        finishButtonClick={finishButtonClick}
        queryRuleType={queryRuleType}
        modificationStatus={modificationStatus}
        selectedQueryRule={selectedQueryRule}
        disallowedNames={disallowedNames}
    >
    </QueryRulesWizard>
)
