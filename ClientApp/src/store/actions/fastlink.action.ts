
import { HttpMethod } from "../models/httpmethod";
import { QueryRuleType } from "../models/queryruletype";
import { createRequestOptions } from "./adminsettings.actions";
import { Synonym } from "../models/synonym.interface";
import { CategoryData, FastLinks, PutCategories, ResponseFastLinks, ResultFastLinks, UpdateCategories } from "../models/fastlinks";
import fetcher from "../../components/Fetcher";
import { addNotification } from "./notifications.action";


// GET Synonym Count
export const REQUEST_FAST_LINK_COUNT = 'REQUEST_FAST_LINK_COUNT';
export const RECEIVE_FAST_LINK_COUNT = 'RECEIVE_FAST_LINK_COUNT';
export const RECEIVE_FAST_LINK_COUNT_ERROR = 'RECEIVE_FAST_LINK_COUNT_ERROR';

// GET Synonym - Gets the list of Synonym.
export const REQUEST_FAST_LINK = 'REQUEST_FAST_LINK';
export const RECEIVE_FAST_LINK = 'RECEIVE_FAST_LINK';
export const RECEIVE_FAST_LINK_ERROR = 'RECEIVE_FAST_LINK_ERROR';
export const REQUEST_CATEGORIES = 'REQUEST_CATEGORIES';
export const RECEIVE_CATEGORIES_ERROR = 'RECEIVE_CATEGORIES_ERROR';

// CREATE Synonym - Gets the list of Synonym.
export const CREATE_FAST_LINK = 'CREATE_FAST_LINK';
export const CREATE_FAST_LINK_SUCCESS = 'CREATE_FAST_LINK_SUCCESS';
export const CREATE_FAST_LINK_ERROR = 'CREATE_FAST_LINK_ERROR';
export const REQUEST_ACTION_CREATE: string = "REQUEST_ACTION_CREATE";
export const RECEIVE_FAST_LINK_ADD_CATEGORIES: string = "RECEIVE_FAST_LINK_ADD_CATEGORIES";
export const CREATE_CATEGORIES_FAST_LINK_SUCCESS: string = "CREATE_CATEGORIES_FAST_LINK_SUCCESS";


// UPDATE Synonym.
export const GET_FAST_LINK_UPDATE: string = "GET_FAST_LINK_UPDATE";
export const GET_CATEGORY_UPDATE: string = "GET_CATEGORY_UPDATE";
export const REMOVE_FAST_LINK_UPDATE: string = "REMOVE_FAST_LINK_UPDATE";
export const UPDATE_FAST_LINK: string = "UPDATE_FAST_LINK";
export const UPDATE_FAST_LINK_LIST: string = "UPDATE_FAST_LINK_LIST";
export const UPDATE_FAST_LINK_SUCCESS: string = "UPDATE_FAST_LINK_SUCCESS";
export const UPDATE_FAST_LINK_ERROR: string = "UPDATE_FAST_LINK_ERROR";
export const UPDATE_FAST_LINK_CATEGORIES_ERROR: string = "UPDATE_FAST_LINK_CATEGORIES_ERROR";
export const REMOVE_CATEGORIES_UPDATE: string = "REMOVE_CATEGORIES_UPDATE";

// DELETE Synonym.
export const DELETE_FAST_LINK: string = "DELETE_FAST_LINK";
export const DELETE_FAST_LINK_SUCCESS: string = "DELETE_FAST_LINK_SUCCESS";
export const DELETE_FAST_LINK_ERROR: string = "DELETE_FAST_LINK_ERROR";
export const DELETE_CATEGORIES_FAST_LINK: string = "DELETE_CATEGORIES_FAST_LINK";
export const DELETE_CATEGORIES_FAST_LINK_SUCCESS: string = "DELETE_CATEGORIES_FAST_LINK_SUCCESS";
export const DELETE_CATEGORIES_FAST_LINK_ERROR: string = "DELETE_CATEGORIES_FAST_LINK_ERROR";

function getFastLinkPath(baseApiUrl: string): string {
    const queryRulesPath: string = `${baseApiUrl}/fastLinks/search`;
    return queryRulesPath;
}

// Used to Get Query Rules.
function getFastLinkApiUrl(baseApiUrl: string, queryRuleType?: QueryRuleType): string {
    const queryRuleTypeText: string = `/${queryRuleType ? QueryRuleType[queryRuleType] : ""}`;
    const fetchQueryRulesApiUrl = `${getFastLinkPath(baseApiUrl)}${queryRuleTypeText}`;
    return fetchQueryRulesApiUrl;
}

// Used by Add, Edit and Delete functions.
// function getQueryRuleApiUrl(baseApiUrl: string, id: string): string {
//     const queryRuleApiUrl: string = `${baseApiUrl}/controlanels/controlpanel/${id}`;
//     return queryRuleApiUrl;
// }

// Action Creators.
export function deleteFastLink(baseApiUrl: string, id: string, nameFastLinks: string): any {
    return function action(dispatch: any) {
        dispatch({ type: DELETE_FAST_LINK });
        const url = `${baseApiUrl}/fastLinks/deleteById/${id}`
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
                dispatch({ type: DELETE_FAST_LINK_SUCCESS, id: id });
                dispatch(addNotification("Fast Links Removed", `'${nameFastLinks}' was removed`));
            })
            .catch(error => {
                dispatch({ type: DELETE_FAST_LINK_ERROR, error: error })
            });
    }
}
export function deleteCategoryFastLink(baseApiUrl: string, id: string): any {
    return function action(dispatch: any) {
        dispatch({ type: DELETE_CATEGORIES_FAST_LINK });
        const url = `${baseApiUrl}/fastLinks/categories/deleteById/${id}`
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
                dispatch({ type: DELETE_CATEGORIES_FAST_LINK_SUCCESS, id: id });
            })
            .catch(error => {
                dispatch({ type: DELETE_CATEGORIES_FAST_LINK_ERROR, error: error })
            });
    }
}

export function createFastLink(baseApiUrl: string, data: FastLinks): any {
    return function action(dispatch: any) {
        // Used for the Support message to know which API function has failed on error.
        removeFastLinkUpdate()
        dispatch({ type: CREATE_FAST_LINK });

        const url = `${baseApiUrl}/createFastLinkAsync`

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
                dispatch({ type: CREATE_FAST_LINK_SUCCESS, data: response as FastLinks });
                dispatch(addNotification("Fast Links Saved", `'${data.navName}' was saved`));
            })
            .catch(error => {
                dispatch({ type: CREATE_FAST_LINK_ERROR, error: error });
            })
    }
}

export function actionCreate(actionCreate: boolean): any {
    return function action(dispatch: any) {
        dispatch({ type: REQUEST_ACTION_CREATE, data: actionCreate });
    }
}

export function fastLinkListUpdate(data: ResultFastLinks): any {
    return function action(dispatch: any) {
        dispatch({ type: UPDATE_FAST_LINK_LIST, data: data });
    }
}


export function getFastLinkUpdate(fastLink: FastLinks, seq: any[]): any {
    return function action(dispatch: any) {
        dispatch({ type: GET_FAST_LINK_UPDATE, data: fastLink, extraData: seq });
    }
}

export function getCategoryDataUpdate(categoryData: PutCategories): any {
    return function action(dispatch: any) {
        dispatch({ type: GET_CATEGORY_UPDATE, data: categoryData });
    }
}

export function removeFastLinkUpdate(): any {
    return function action(dispatch: any) {
        dispatch({ type: REMOVE_FAST_LINK_UPDATE });
    }
}

export function updateFastLink(baseApiUrl: string, fastLink: FastLinks): any {
    return function action(dispatch: any) {
        dispatch({ type: UPDATE_FAST_LINK });
        const url = `${baseApiUrl}/fastLinks/update/?id=${fastLink.id}`

        // Simple UPDATE request using fetch.
        //Internal_Call: Making a PUT request to endpoint 'url'
        //Sending_Data : Sending `fastLink` to create the setting body
        //Receiving_Data : If the request is successful, parse the response to JSON, If there is an error, dispatch an error action
        return fetcher(url, {
            method: 'PUT', body: JSON.stringify(fastLink), headers: {
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
                    id: fastLink.id,
                }
                // Update the app state after deleting the QueryRule.
                dispatch({ type: UPDATE_FAST_LINK_SUCCESS, data: data });
                dispatch(addNotification("Fast Links Saved", `'${fastLink.navName}' was saved`));
            })
            .catch(error => {
                dispatch({ type: UPDATE_FAST_LINK_ERROR, error: error })
            });
    }
}

export function updateCategories(baseApiUrl: string, fastLink: UpdateCategories, create: boolean = false): any {
    return function action(dispatch: any) {
        dispatch({ type: UPDATE_FAST_LINK });
        const url = `${baseApiUrl}/fastLinks/categories/upsert`

        // Simple UPDATE request using fetch.
        //Internal_Call: Making a POST request to endpoint 'url'
        //Sending_Data : Sending `fastLink` to create the setting body
        //Receiving_Data : If the request is successful, parse the response to JSON, If there is an error, dispatch an error action
        return fetcher(url, {
            method: 'POST', body: JSON.stringify(fastLink), headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.json())
            .then(response => {
                if (response.error) {
                    throw (response.error);
                }

                if (create) dispatch({ type: CREATE_CATEGORIES_FAST_LINK_SUCCESS });
            })
            .catch(error => {
                dispatch({ type: UPDATE_FAST_LINK_CATEGORIES_ERROR, error: error })
            });
    }
}

export function updateCategoriesSequence(baseApiUrl: string, fastLink: UpdateCategories): any {
    return function action(dispatch: any) {
        dispatch({ type: UPDATE_FAST_LINK });
        const url = `${baseApiUrl}/fastLinks/categories/changeSequence`

        // Simple UPDATE request using fetch.
        //Internal_Call: Making a POST request to endpoint 'url'
        //Sending_Data : Sending `fastLink` to create the setting body
        //Receiving_Data : If the request is successful, parse the response to JSON, If there is an error, dispatch an error action
        return fetcher(url, {
            method: 'POST', body: JSON.stringify(fastLink), headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.json())
            .then(response => {
                if (response.error) {
                    throw (response.error);
                }
            })
            .catch(error => {
                dispatch({ type: UPDATE_FAST_LINK_CATEGORIES_ERROR, error: error })
            });
    }
}

export function updateCategoryData(baseApiUrl: string, fastLink: CategoryData): any {
    return function action(dispatch: any) {
        dispatch({ type: UPDATE_FAST_LINK });
        const url = `${baseApiUrl}/fastLinks/categories/upsertCategoriesFastLink`

        // Simple UPDATE request using fetch.
        //Internal_Call: Making a POST request to endpoint 'url'
        //Sending_Data : Sending `fastLink` to create the setting body
        //Receiving_Data : If the request is successful, parse the response to JSON, If there is an error, dispatch an error action
        return fetcher(url, {
            method: 'POST', body: JSON.stringify(fastLink), headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.json())
            .then(response => {
                if (response.error) {
                    throw (response.error);
                }
            })
            .catch(error => {
                dispatch({ type: UPDATE_FAST_LINK_CATEGORIES_ERROR, error: error })
            });
    }
}

export function getDocumentCountFast(baseApiUrl: string): any {
    return function action(dispatch: any) {
        dispatch({ type: REQUEST_FAST_LINK_COUNT });
        const url = `${baseApiUrl}/fastLinks/fastLinkCount`
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
                dispatch({ type: RECEIVE_FAST_LINK_COUNT, response });
            })
            .catch(error => {
                dispatch({ type: RECEIVE_FAST_LINK_COUNT_ERROR, error: error })
            });
    }
}


export function retrieveFastLink(baseApiUrl: string, data: any): any {
    return function action(dispatch: any) {
        // Used for the Support message to know which API function has failed on error.
        dispatch({ type: REQUEST_FAST_LINK });

        let url = getFastLinkApiUrl(baseApiUrl);

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
                dispatch({ type: RECEIVE_FAST_LINK, data: response as ResponseFastLinks });
            })
            .catch(error => {
                dispatch({ type: RECEIVE_FAST_LINK_ERROR, error: error });
            })
    }
}

export function retrieveFastLinkAddCategories(baseApiUrl: string, data: any): any {
    return function action(dispatch: any) {
        // Used for the Support message to know which API function has failed on error.
        dispatch({ type: REQUEST_FAST_LINK });

        let url = `${baseApiUrl}/fastLinksIndexName/search`;

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
                dispatch({ type: RECEIVE_FAST_LINK_ADD_CATEGORIES, data: response as FastLinks[] });
            })
            .catch(error => {
                dispatch({ type: RECEIVE_FAST_LINK_ERROR, error: error });
            })
    }
}

export function retrieveCategories(baseApiUrl: string, data: any): any {
    return function action(dispatch: any) {
        // Used for the Support message to know which API function has failed on error.
        dispatch({ type: REQUEST_CATEGORIES });

        let url = `${baseApiUrl}/fastLinks/categories/search`

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
                dispatch({ type: REQUEST_CATEGORIES, data: response as any[] });
            })
            .catch(error => {
                dispatch({ type: RECEIVE_CATEGORIES_ERROR, error: error });
            })
    }
}

export function removeCategoriesUpdate(): any {
    return function action(dispatch: any) {
        dispatch({ type: REMOVE_CATEGORIES_UPDATE });
    }
}