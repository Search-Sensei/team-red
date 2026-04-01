import React, { Fragment, PropsWithChildren, ReactElement } from "react";
import { useSelector } from "react-redux";

import MessageAlert from "../../common/components/MessageAlert";
import { IMessageAlertProperties, MessageAlertType } from "../../common/types/MessageAlert.types";
import { QueryRuleModificationStatus } from "../../store/models/queryrulemodificationstatus";
import { IQueryRulesState } from "../../store/models/queryrulesstate.interface";
import { IStateType } from "../../store/models/root.interface";
import { ISupportMessage } from "../../store/models/supportmessage.interface";

export interface IQueryRuleMessageAlertProperties extends IMessageAlertProperties {
    emailSubject?: string;
}

function QueryRuleMessageAlert(props: PropsWithChildren<IQueryRuleMessageAlertProperties>): ReactElement {
    // AdminSettings.
    let supportMessage: ISupportMessage = useSelector((state: IStateType) => state.adminSettingsState.adminSettings.supportMessage);
    let queryRulesState: IQueryRulesState = useSelector((state: IStateType) => state.queryRulesState);
    let modificationStatus: string = QueryRuleModificationStatus[queryRulesState.modificationState];

    let emailSubject: string = (props.emailSubject === null || props.emailSubject === undefined) ? `QueryRules ${modificationStatus} API` : props.emailSubject;
    let queryRuleDetail: string = queryRulesState.modificationState === QueryRuleModificationStatus.Get ? "" : `QueryRule: ${JSON.stringify(queryRulesState.selectedQueryRule)}`;
    let emailBody: string = `${supportMessage.emailBody} ${props.message} ${queryRuleDetail}`;
    let message: string = (props.message === null || props.message === undefined) ? "" : props.message;

    function alertContent(): JSX.Element | null {
        if (((props.message === null || props.message === undefined) || props.message?.length === 0) && (props.messageContent === null || props.messageContent === undefined)) {
            return null;
        }

        if (props.messageContent === null || props.messageContent === undefined) {
            const message = String(props.message || "");

            return (
                <div>
                    {message.includes(" Server not available") ? (
                        <div>
                            <p>An error occurred: Server not available</p>
                            <p>Error Code: {message.replace(" Server not available", "")}</p>
                        </div>
                    ) : (
                        <p>An error occurred: {message}</p>
                    )}

                    <p>{supportMessage.title}
                        <a href={`mailto:${supportMessage.emailAddress}?subject=${supportMessage.emailSubject}${emailSubject}&body=${emailBody}`}>
                            {supportMessage.emailAddress}
                        </a>
                    </p>

                    <p>{supportMessage.detail}</p>
                </div>
            );
        }


        return props.messageContent;
    }

    return (
        <Fragment>
            <MessageAlert type={props.type} message="" messageContent={alertContent()} />
        </Fragment>
    );
}

export default ({ type, alertCssClassSuffix, message, messageContent, emailSubject }: { type?: MessageAlertType, alertCssClassSuffix?: string, message?: string, messageContent?: JSX.Element | null, emailSubject?: string }) => (
    <QueryRuleMessageAlert type={type} alertCssClassSuffix={alertCssClassSuffix} message={message} messageContent={messageContent} emailSubject={emailSubject} ></QueryRuleMessageAlert>
)
