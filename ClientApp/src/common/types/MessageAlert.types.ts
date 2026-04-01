export enum MessageAlertType {
    Error,
    Warning,
    Information
}

export interface IMessageAlertProperties {
    type?: MessageAlertType;

    // Used for the Bootstrap Alert to style the Div. See: https://getbootstrap.com/docs/4.0/components/alerts/
    alertCssClassSuffix?: string;

    // The message to output.
    message?: string;

    // The HTML to include in the alert.
    messageContent?: JSX.Element | null;
}
