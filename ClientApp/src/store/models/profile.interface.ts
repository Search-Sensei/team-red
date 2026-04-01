import { IAvailableProfile } from "./availableprofile.interface";

export interface IProfile extends IAvailableProfile {
    isSelected: boolean;
}