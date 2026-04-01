import { IAccount } from "../models/account.interface";

export const LOG_IN: string = "LOG_IN";
export const LOG_OUT: string = "LOG_OUT";

interface ILogInActionType { type: string, account: IAccount };
interface ILogOutActionType { type: string };

export function login(account: IAccount): ILogInActionType {
    return { type: LOG_IN, account: account };
}

export function logout(): ILogOutActionType {
    return { type: LOG_OUT};
}