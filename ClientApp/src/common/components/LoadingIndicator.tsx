import React, { PropsWithChildren, ReactElement, Fragment } from "react";
import { ILoadingIndicatorProperties } from "../types/LoadingIndicator.types";


function LoadingIndicator(props: PropsWithChildren<ILoadingIndicatorProperties>): ReactElement {
    // Use a default message if none provided.
    const message: string = `${(props.text === null || props.text === undefined) ? "Loading" : props.text}...`;

    function loadingContent(): JSX.Element | null {
        if (!props.isLoading) {
            return null;
        }

        return (
            <div className="col-md-12 loading-indicator">
                <div className="d-flex justify-content-center">
                    <div className="spinner-border text-dark" role="status">
                        <span className="sr-only">{message}</span>
                    </div>
                </div>
                <div className="d-flex justify-content-center spinner-text">{message}</div>
            </div>
        );
    }

    return (
        <Fragment>
            {loadingContent()}
        </Fragment>
    );
}

export default LoadingIndicator;
