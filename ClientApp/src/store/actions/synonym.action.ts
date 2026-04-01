
import { HttpMethod } from "../models/httpmethod";
import { QueryRuleType } from "../models/queryruletype";
import { createRequestOptions } from "./adminsettings.actions";
import { Synonym } from "../models/synonym.interface";
import fetcher from "../../components/Fetcher";
import { addNotification } from "./notifications.action";


// GET Synonym Count
export const REQUEST_SYNONYM_COUNT = 'REQUEST_SYNONYM_COUNT';
export const RECEIVE_SYNONYM_COUNT = 'RECEIVE_SYNONYM_COUNT';
export const RECEIVE_SYNONYM_COUNT_ERROR = 'RECEIVE_SYNONYM_COUNT_ERROR';

// GET Synonym - Gets the list of Synonym.
export const REQUEST_SYNONYM = 'REQUEST_SYNONYM';
export const RECEIVE_SYNONYM = 'RECEIVE_SYNONYM';
export const RECEIVE_SYNONYM_ERROR = 'RECEIVE_SYNONYM_ERROR';

// CREATE Synonym - Gets the list of Synonym.
export const CREATE_SYNONYM = 'CREATE_SYNONYM';
export const CREATE_SYNONYM_SUCCESS = 'CREATE_SYNONYM_SUCCESS';
export const CREATE_SYNONYM_ERROR = 'CREATE_SYNONYM_ERROR';


// UPDATE Synonym.
export const GET_SYNONYM_UPDATE: string = "GET_SYNONYM_UPDATE";
export const REMOVE_SYNONYM_UPDATE: string = "REMOVE_SYNONYM_UPDATE";
export const UPDATE_SYNONYM: string = "UPDATE_SYNONYM";
export const UPDATE_SYNONYM_SUCCESS: string = "UPDATE_SYNONYM_SUCCESS";
export const UPDATE_SYNONYM_ERROR: string = "UPDATE_SYNONYM_ERROR";

// DELETE Synonym.
export const DELETE_SYNONYM: string = "DELETE_SYNONYM";
export const DELETE_SYNONYM_SUCCESS: string = "DELETE_SYNONYM_SUCCESS";
export const DELETE_SYNONYM_ERROR: string = "DELETE_SYNONYM_ERROR";

function getSynonymPath(baseApiUrl: string): string {
    const queryRulesPath: string = `${baseApiUrl}/synonyms/search`;
    return queryRulesPath;
}

// Used to Get Query Rules.
function getSynonymApiUrl(baseApiUrl: string, queryRuleType?: QueryRuleType): string {
    const queryRuleTypeText: string = `/${queryRuleType ? QueryRuleType[queryRuleType] : ""}`;
    const fetchQueryRulesApiUrl = `${getSynonymPath(baseApiUrl)}${queryRuleTypeText}`;
    return fetchQueryRulesApiUrl;
}

// Used by Add, Edit and Delete functions.
// function getQueryRuleApiUrl(baseApiUrl: string, id: string): string {
//     const queryRuleApiUrl: string = `${baseApiUrl}/controlanels/controlpanel/${id}`;
//     return queryRuleApiUrl;
// }

// Action Creators.
export function deleteSynonym(baseApiUrl: string, id: string, nameSynonym: string): any {
    return function action(dispatch: any) {
        dispatch({ type: DELETE_SYNONYM });
        const url = `${baseApiUrl}/synonyms/deleteById/${id}`
        // Simple DELETE request using fetch.
        const requestOptions: any = createRequestOptions(HttpMethod.Delete);
        //Internal_Call: Making a DELETE request to endpoint 'url'
        //Sending_Data: Sending `requestOptions`(searchQueryDefiniton) to create the setting body,
        // Receiving_Data: If the request is successful, parse the response to JSON, If there is an error, dispatch an error action
        return fetcher(url, requestOptions)
            .then(response => response.json())
            .then(response => {
                if (response.error) {
                    throw (response.error);
                }

                // Update the app state after deleting the QueryRule.
                dispatch({ type: DELETE_SYNONYM_SUCCESS, id: id });
                dispatch(addNotification("Synonym Removed", `'${nameSynonym}' was removed`));
            })
            .catch(error => {
                dispatch({ type: DELETE_SYNONYM_ERROR, error: error })
            });
    }
}

export function createSynonym(baseApiUrl: string, data: Synonym): any {
    return function action(dispatch: any) {
        // Used for the Support message to know which API function has failed on error.
        removeSynonymUpdate()
        dispatch({ type: CREATE_SYNONYM });

        const url = `${baseApiUrl}/synonyms/create`
        //Internal_Call: Making a POST request to endpoint 'url'
        //Sending_Data : Sending `data` to create the setting body
        //Receiving_Data : If the request is successful, parse the response to JSON, If there is an error, dispatch an error action
        return fetcher(url, {
            method: 'POST', body: JSON.stringify(data), headers: {
                'Content-Type': 'application/json'
            },
        })
            .then(response => response.json())
            .then(response => {
                if (response.error) {
                    throw (response.error);
                }
                // Update the app state with the results of the API call.
                dispatch({ type: CREATE_SYNONYM_SUCCESS, data: response as Synonym });
                dispatch(addNotification("Synonym Saved", `'${data.synonyms}' was saved`));
            })
            .catch(error => {
                dispatch({ type: CREATE_SYNONYM_ERROR, error: error });
            })
    }
}

export function getSynonymUpdate(synonym: Synonym): any {
    return function action(dispatch: any) {
        dispatch({ type: GET_SYNONYM_UPDATE, data: synonym });
    }
}

export function removeSynonymUpdate(): any {
    return function action(dispatch: any) {
        dispatch({ type: REMOVE_SYNONYM_UPDATE });
    }
}

export function updateSynonym(baseApiUrl: string, synonym: Synonym): any {
    return function action(dispatch: any) {
        dispatch({ type: UPDATE_SYNONYM });
        const url = `${baseApiUrl}/synonyms/update/?id=${synonym.id}`

        // Simple UPDATE request using fetch.
        //Internal_Call: Making a PUT request to endpoint 'url'
        //Sending_Data : Sending `synonym` to create the setting body
        //Receiving_Data : If the request is successful, parse the response to JSON, If there is an error, dispatch an error action
        return fetcher(url, {
            method: 'PUT', body: JSON.stringify(synonym), headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.json())
            .then(response => {
                if (response.error) {
                    throw (response.error);
                }
                const data = {
                    synonym: response,
                    id: synonym.id,
                }
                // Update the app state after deleting the QueryRule.
                dispatch({ type: UPDATE_SYNONYM_SUCCESS, data: data });
                dispatch(addNotification("Synonym Saved", `'${synonym.synonyms}' was saved`));
            })
            .catch(error => {
                dispatch({ type: UPDATE_SYNONYM_ERROR, error: error })
            });
    }
}

export function getDocumentCount(baseApiUrl: string): any {
    return function action(dispatch: any) {
        dispatch({ type: REQUEST_SYNONYM_COUNT });
        const url = `${baseApiUrl}/synonyms/synonymCount`
        // const url = getQueryRuleApiUrl(baseApiUrl, id);
        // Simple DELETE request using fetch.
        const requestOptions: any = createRequestOptions(HttpMethod.Get);
        //Internal_Call: Making a GET request to endpoint 'url'
        //Sending_Data: Sending `requestOptions`(searchQueryDefiniton) to create the setting body,
        // Receiving_Data: If the request is successful, parse the response to JSON, If there is an error, dispatch an error action
        return fetcher(url, requestOptions)
            .then(response => response.json())
            .then(response => {
                if (response.error) {
                    throw (response.error);
                }

                // Update the app state after deleting the QueryRule.
                dispatch({ type: RECEIVE_SYNONYM_COUNT, response });
            })
            .catch(error => {
                dispatch({ type: RECEIVE_SYNONYM_COUNT_ERROR, error: error })
            });
    }
}


export function retrieveSynonym(baseApiUrl: string, data: any): any {
    return function action(dispatch: any) {
        // Used for the Support message to know which API function has failed on error.
        dispatch({ type: REQUEST_SYNONYM });

        const url = getSynonymApiUrl(baseApiUrl);
        //Internal_Call: Making a POST request to endpoint 'url'
        //Sending_Data : Sending `data` to create the setting body
        //Receiving_Data : If the request is successful, parse the response to JSON, If there is an error, dispatch an error action
        return fetcher(url, {
            method: 'POST', body: JSON.stringify(data), headers: {
                'Content-Type': 'application/json'
            },
        })
            .then(response => response.json())
            .then(response => {
                if (response.error) {
                    throw (response.error);
                }
                // Update the app state with the results of the API call.
                dispatch({ type: RECEIVE_SYNONYM, data: response as Synonym[] });
            })
            .catch(error => {
                dispatch({ type: RECEIVE_SYNONYM_ERROR, error: error });
            })
    }
}


// Actions

// Get QueryRules actions.
// export function requestQueryRules(): IRequestQueryRulesActionType {
//     return {
//         type: REQUEST_SYNONYM
//     };
// }

// export function receiveQueryRules(queryRules: IQueryRule[]): IReceiveQueryRulesActionType {
//     return {
//         type: RECEIVE_SYNONYM,
//         queryRules: queryRules
//     };
// }

// export function receiveQueryRulesError(error: any): IReceiveQueryRulesErrorActionType {
//     return {
//         type: RECEIVE_SYNONYM_ERROR,
//         error: error
//     };
// }

// Get Document count.
// export function requestDocumentCount(): IGetDocumentCountActionType {
//     return {
//         type: REQUEST_DOCUMENT_COUNT
//     };
// }

// export function receiveDocumentCount(count: number): IGetDocumentCountSuccessActionType {
//     return {
//         type: RECEIVE_DOCUMENT_COUNT,
//         count: count
//     };
// }

// export function receiveDocumentCountError(error: any): IGetDocumentCountErrorActionType {
//     return {
//         type: RECEIVE_DOCUMENT_COUNT_ERROR,
//         error: error
//     };
// }


// Delete actions.
// export function deleteQueryRuleSubmitted(): IDeleteQueryRuleSubmittedActionType {
//     return { type: DELETE_SYNONYM };
// }

// export function deleteQueryRuleSuccess(id: string): IDeleteQueryRuleSuccessActionType {
//     return { type: DELETE_SYNONYM_SUCCESS, id: id };
// }

// export function deleteQueryRuleError(error: any): IDeleteQueryRuleErrorActionType {
//     return { type: DELETE_SYNONYM_ERROR, error: error };
// }



// Action Types.
// // Get QueryRules.
// interface IRequestQueryRulesActionType { type: string }
// interface IReceiveQueryRulesActionType { type: string, queryRules: IQueryRule[] }
// interface IReceiveQueryRulesErrorActionType { type: string, error: any }


// // Delete QueryRule.
// interface IDeleteQueryRuleSubmittedActionType { type: string };
// interface IDeleteQueryRuleSuccessActionType { type: string, id: string };
// interface IDeleteQueryRuleErrorActionType { type: string, error: any };

// // Get Document Count.
// interface IGetDocumentCountActionType { type: string };
// interface IGetDocumentCountSuccessActionType { type: string, count: number };
// interface IGetDocumentCountErrorActionType { type: string, error: any };

