import React, { PropsWithChildren, ReactElement, Fragment } from "react";
import { IMessageAlertProperties, MessageAlertType } from "../types/MessageAlert.types";


function MessageAlert(props: PropsWithChildren<IMessageAlertProperties>): ReactElement {
    // Default to information for the alert css class.
    // See Bootstrap Alerts for details: https://getbootstrap.com/docs/4.0/components/alerts/
    let alertCssClassSuffix: string = (props.alertCssClassSuffix === null || props.alertCssClassSuffix === undefined) ? getAlertCssClassSuffixFromType() : props.alertCssClassSuffix;

    function getAlertCssClassSuffixFromType(): string {
        let result: string = "";

        // Default to information if not specified.
        let type: MessageAlertType = (props.type === null || props.type === undefined) ? MessageAlertType.Information : props.type;

        switch (+type) {
            case MessageAlertType.Error: {
                result = "danger";
                break;
            }
            case MessageAlertType.Warning: {
                result = "warning";
                break;
            }
            default:
            case MessageAlertType.Information: {
                result = "info";
                break;
            }
        }

        return result;
    }

    function alertContent(): JSX.Element | null {
        if (((props.message === null || props.message === undefined) || props.message?.length === 0) && (props.messageContent === null || props.messageContent === undefined)) {
            return null;
        }

        return (
            <div className="row">
                <div className="col-md-12">
                    {props.message?.includes("Server not available") ? (
                        <div className={`alert alert-${alertCssClassSuffix}`} role="alert">
                          <p>An error occurred: Server not available</p>
                          <p>
                            Error Code: {(props.message || '').replace(" Server not available", "")}
                          </p>
                        </div>
                      ) : (
                        <div className={`alert alert-${alertCssClassSuffix}`} role="alert">
                          {props.message || props.messageContent}
                        </div>
                      )}
                </div>
            </div>
        );
    }

    return (
        <Fragment>
            {alertContent()}
        </Fragment>
    );
}

export default ({ type, alertCssClassSuffix, message, messageContent }: { type?: MessageAlertType, alertCssClassSuffix?: string, message: string, messageContent?: JSX.Element | null }) => (
    <MessageAlert type={type} alertCssClassSuffix={alertCssClassSuffix} message={message} messageContent={messageContent} ></MessageAlert>
)
