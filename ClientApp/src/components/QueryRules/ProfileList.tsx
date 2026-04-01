import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { IAdminSettingsState } from "../../store/models/adminsettingsstate.interface";
import { IAvailableProfile } from "../../store/models/availableprofile.interface";
import { IProfile } from "../../store/models/profile.interface";
import { IStateType } from "../../store/models/root.interface";
import { QueryRuleType } from "../../store/models/queryruletype";

(global as any).count = null;
(global as any).profile = [];

export type ProfilesListProps = {
    queryRuleType: QueryRuleType;
    currentProfiles: string[];
    onUpdate: (selectedProfiles: string[]) => void;
};

const ProfileList: React.FC<ProfilesListProps> = (props) => {
    const adminSettingsState: IAdminSettingsState = useSelector((state: IStateType) => state.adminSettingsState);
    const availableProfiles: IAvailableProfile[] = adminSettingsState.adminSettings.availableProfiles;

    // Store the updated profiles in state.
    const [selectedProfileNames, setSelectedProfileNames] = useState(props.currentProfiles);

    // Store the currently selected profiles in state.
    const [selectedProfiles, setSelectedProfiles] = useState(getInitialProfiles(availableProfiles));

    // Reset global variables when the component is mounted or unmounted
    useEffect(() => {
        (global as any).count = props.currentProfiles.length;
        (global as any).profile = props.currentProfiles;
    }, []);

    function getInitialProfiles(availableProfiles: IAvailableProfile[]): IProfile[] {
        return availableProfiles.map((availableProfile) => ({
            title: availableProfile.title,
            description: availableProfile.description,
            name: availableProfile.name,
            isSelected: selectedProfileNames.includes(availableProfile.name),
        }));
    }

    function onProfileClick(profile: IProfile): void {
        if (!profile.isSelected && (selectedProfileNames.length >= 2 && props.queryRuleType == QueryRuleType.Boost)) {
            return;
        }
        onSelected(!profile.isSelected, profile.name);
    }

    function onSelected(isSelected: boolean, profileName: string): void {
        let profiles = selectedProfiles.map(p => ({ ...p })); 
    
        let profile = profiles.find(p => p.name === profileName);
        if (profile) {
            profile.isSelected = isSelected;
        }
    
        let profileNames: string[] = profiles.filter(p => p.isSelected).map(profile => profile.name);
    
        setSelectedProfiles(profiles);
        setSelectedProfileNames(profileNames);

        if (isSelected) {
            if (!(global as any).profile.includes(profileName)) {
                (global as any).profile.push(profileName);
            }
        } else {
            (global as any).profile = (global as any).profile.filter((name: string) => name !== profileName);
        }

        (global as any).count = (global as any).profile.length;

        props.onUpdate(profileNames);
    }

    const availableProfileElements = selectedProfiles.map(profile => (
        <tr className="table-row" key={profile.name} onClick={() => onProfileClick(profile)}>
            <td className="text-center align-middle">
                <div className="profile-selected-column">
                    {profile.isSelected ? <i className="fas fa-check"></i> : null}
                </div>
            </td>
            <td>
                <div>{profile.title}</div>
                <div className="profile-description">{profile.description}</div>
            </td>
        </tr>
    ));

    return (
        <div>
            <div className="condition-title header-row">
                Profiles
            </div>
            <div className="table-responsive portlet">
                <table className="table">
                    <tbody>
                        {availableProfileElements}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default (props: ProfilesListProps) => (
    <ProfileList {...props} />
);
