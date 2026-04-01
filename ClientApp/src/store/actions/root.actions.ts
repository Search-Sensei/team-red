export const UPDATE_CURRENT_PATH: string = "UPDATE_CURRENT_PATH";

export const SET_ERROR_MESSAGE: string = "SET_ERROR_MESSAGE";
export const CLEAR_ERROR_MESSAGE: string = "CLEAR_ERROR_MESSAGE";
export const SET_REDIRECT_URL: string = "SET_REDIRECT_URL";
export const CLEAR_REDIRECT_URL: string = "CLEAR_REDIRECT_URL";

interface IUpdateCurrentPathActionType { type: string, area: string, subArea: string };
interface ISetErrorMessageActionType { type: string, errorMessage: string };
interface IClearErrorMessageActionType { type: string };
interface ISetRedirectActionType { type: string, redirectUrl: string };
interface IClearRedirectActionType { type: string };

export function updateCurrentPath(area: string, subArea: string): IUpdateCurrentPathActionType {
    return { type: UPDATE_CURRENT_PATH, area: area, subArea: subArea };
}

export function setErrorMesssage(errorMessage: string): ISetErrorMessageActionType {
    return { type: SET_ERROR_MESSAGE, errorMessage: errorMessage };
}

export function clearErrorMesssage(): IClearErrorMessageActionType {
    return { type: CLEAR_ERROR_MESSAGE };
}

export function setRedirectUrl(redirectUrl: string): ISetRedirectActionType {
    return { type: SET_REDIRECT_URL, redirectUrl: redirectUrl };
}

export function clearRedirectUrl(): IClearRedirectActionType {
    return { type: CLEAR_REDIRECT_URL };
}