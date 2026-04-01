import { IAdminSettings } from "./adminsettings.interface";

export interface IAdminSettingsState {
    adminSettings: IAdminSettings;
    // Data is being loading from the API.
    isLoading: boolean;
    // When data was retrieved from the API.
    receivedAt: number;
    error: any;
}