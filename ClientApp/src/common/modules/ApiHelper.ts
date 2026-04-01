import { Dispatch } from "react";
import { createRequestOptions, getBaseUrl } from "../../store/actions/adminsettings.actions";
import { setErrorMesssage } from "../../store/actions/root.actions";
import { HttpMethod } from "../../store/models/httpmethod";
import fetcher from "../../components/Fetcher"
export class ApiHelper {
    /**
     * Handles the error by console logging it and then dispatching it to the redux state error.
     * @param errorDetail The detail to add to any console logging error message.
     * @param dispatch The dispatch object to use to dispatch any error messages to redux.
     * @param userErrorMessage The message to display to the user of the API call fails.
     */
    public static handleError(errorDetail: string, dispatch: Dispatch<any>, userErrorMessage: string): void {
        dispatch(setErrorMesssage(userErrorMessage));
    }

    /**
     * Helper method for calling an API that returns JSON and calling a callback function with the resulting JSON.
     * @param apiUrl The URL of the API to call.
     * @param httpMethod The http method type e.g. Get, Put etc.
     * @param callback The callback method to call with any resulting JSON.
     * @param dispatch The dispatch object to use to dispatch any error messages to redux.
     * @param userErrorMessage The message to display to the user of the API call fails.
     * @param body Any body to post to the API.
     */
    public static getApiResponse(apiUrl: string, httpMethod: HttpMethod, callback: (jsonResponse: any, hasAttemptedLogin: boolean) => void, dispatch: Dispatch<any>, userErrorMessage: string = "An error occured logging in.", body: string = "", hasAttemptedLogin: boolean = false): void {
        // Internal_Call: Making a call to the fetcher function to fetch data from the API (apiURL) endpoint
        // Sending_Data: Sending the API URL (apiUrl) and request options (created by createRequestOptions(httpMethod, body)) for the request
        // Receiving_Data : Parsing the response body to JSON if the request is successful, Status Code, Handling the error if login was attempted and displaying the error message
        fetcher(apiUrl, createRequestOptions(httpMethod, body))
            .then((response) => {
                if (response.ok) {
                    response.json()
                        .then(value => {
                            callback(value, hasAttemptedLogin);
                        });
                }
                else {
                    if (response.status == 401 && apiUrl == "/account/getuserdetails") {
                        window.location.href = getBaseUrl();
                    }
                    if (hasAttemptedLogin) {
                        const error: string = `Error calling API: ${apiUrl}. Response.status: ${response.statusText} (${response.status}).`;
                        ApiHelper.handleError(error, dispatch, userErrorMessage);
                      }
                }
            })
            .catch((reason) => {
                if (hasAttemptedLogin) { // Only show error if login was attempted
                    const error: string = `Error calling API: ${apiUrl}. Reason: ${reason}.`;
                    ApiHelper.handleError(error, dispatch, userErrorMessage);
                }
            });
    }
}