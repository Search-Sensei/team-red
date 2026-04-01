import React, { useCallback, useEffect, useState, Dispatch } from "react";
import Select from "react-select";
import "./UserPermission.css";

import {
    IUserPermissionState,
    UserPermission as IUserPermission,
} from "../../store/models/userpermission.interface";
interface IMyProps {
    permission: IUserPermission;
    index: number;
    options: any;
    stateChanger: any;
    handleEditUserPermission: boolean;
}
const UserPermissionScreen: React.FC<IMyProps> = (props: IMyProps) => {
    const [valueView, setValueView] = useState([
        {
            value: "",
            label: "",
        },
    ]);
    const [valueEdit, setValueEdit] = useState([
        {
            value: "",
            label: "",
        },
    ]);
    const [valueDelete, setValueDelete] = useState([
        {
            value: "",
            label: "",
        },
    ]);

    useEffect(() => {
        setValueView(
            props.permission?.view?.map((groupName: string) => {
                return { value: groupName, label: groupName };
            })
        );
        setValueEdit(
            props.permission?.edit?.map((groupName: string) => {
                return { value: groupName, label: groupName };
            })
        );
        setValueDelete(
            props.permission?.delete?.map((groupName: string) => {
                return { value: groupName, label: groupName };
            })
        );
    }, [props.permission]);

    function onChangeValueView(e: any) {
        setValueView(e);
        if (props.permission.name == "Feature") {
            props.stateChanger((prevState: { Featured: any }) => ({
                ...prevState,
                Featured: {
                    ...prevState.Featured,
                    view: e.map((groupName: any) => {
                        return groupName.value;
                    }),
                },
            }));
        }
        if (props.permission.name == "Boost") {
            props.stateChanger((prevState: { Boost: any }) => ({
                ...prevState,
                Boost: {
                    ...prevState.Boost,
                    view: e.map((groupName: any) => {
                        return groupName.value;
                    }),
                },
            }));
        }
        if (props.permission.name == "Synonym") {
            props.stateChanger((prevState: { Synonym: any }) => ({
                ...prevState,
                Synonym: {
                    ...prevState.Synonym,
                    view: e.map((groupName: any) => {
                        return groupName.value;
                    }),
                },
            }));
        }
        if (props.permission.name == "FastLinks") {
            props.stateChanger((prevState: { FastLinks: any }) => ({
                ...prevState,
                FastLinks: {
                    ...prevState.FastLinks,
                    view: e.map((groupName: any) => {
                        return groupName.value;
                    }),
                },
            }));
        }
        if (props.permission.name == "Navigation") {
            props.stateChanger((prevState: { Navigation: any }) => ({
                ...prevState,
                Navigation: {
                    ...prevState.Navigation,
                    view: e.map((groupName: any) => {
                        return groupName.value;
                    }),
                },
            }));
        }        
        if (props.permission.name == "SearchSuggestion") {
            props.stateChanger((prevState: { SearchSuggestion: any }) => ({
                ...prevState,
                SearchSuggestion: {
                    ...prevState.SearchSuggestion,
                    view: e.map((groupName: any) => {
                        return groupName.value;
                    }),
                },
            }));
        }        
        if (props.permission.name == "ContentEnhancement") {
            props.stateChanger((prevState: { ContentEnhancement: any }) => ({
                ...prevState,
                ContentEnhancement: {
                    ...prevState.ContentEnhancement,
                    view: e.map((groupName: any) => {
                        return groupName.value;
                    }),
                },
            }));
        }
        if (props.permission.name == "ControlPanelDeleteUrl") {
            props.stateChanger((prevState: { ControlPanelDeleteUrl: any }) => ({
                ...prevState,
                ControlPanelDeleteUrl: {
                    ...prevState.ControlPanelDeleteUrl,
                    view: e.map((groupName: any) => {
                        return groupName.value;
                    }),
                },
            }));
        }
        if (props.permission.name == "ControlPanelUserGroups") {
            props.stateChanger((prevState: { ControlPanelUserGroups: any }) => ({
                ...prevState,
                ControlPanelUserGroups: {
                    ...prevState.ControlPanelUserGroups,
                    view: e.map((groupName: any) => {
                        return groupName.value;
                    }),
                },
            }));
        }
        if (props.permission.name == "ControlPanelUserPermission") {
            props.stateChanger((prevState: { ControlPanelUserPermission: any }) => ({
                ...prevState,
                ControlPanelUserPermission: {
                    ...prevState.ControlPanelUserPermission,
                    view: e.map((groupName: any) => {
                        return groupName.value;
                    }),
                },
            }));
        }
        if (props.permission.name == "ControlPanelNavigationSetting") {
            props.stateChanger((prevState: { ControlPanelNavigationSetting: any }) => ({
                ...prevState,
                ControlPanelNavigationSetting: {
                    ...prevState.ControlPanelNavigationSetting,
                    view: e.map((groupName: any) => {
                        return groupName.value;
                    }),
                },
            }));
        }
    }

    function onChangeValueEdit(e: any) {
        setValueEdit(e);
        if (props.permission.name == "Feature") {
            props.stateChanger((prevState: { Featured: any }) => ({
                ...prevState,
                Featured: {
                    ...prevState.Featured,
                    edit: e.map((groupName: any) => {
                        return groupName.value;
                    }),
                },
            }));
        }
        if (props.permission.name == "Boost") {
            props.stateChanger((prevState: { Boost: any }) => ({
                ...prevState,
                Boost: {
                    ...prevState.Boost,
                    edit: e.map((groupName: any) => {
                        return groupName.value;
                    }),
                },
            }));
        }
        if (props.permission.name == "Synonym") {
            props.stateChanger((prevState: { Synonym: any }) => ({
                ...prevState,
                Synonym: {
                    ...prevState.Synonym,
                    edit: e.map((groupName: any) => {
                        return groupName.value;
                    }),
                },
            }));
        }
        if (props.permission.name == "FastLinks") {
            props.stateChanger((prevState: { FastLinks: any }) => ({
                ...prevState,
                FastLinks: {
                    ...prevState.FastLinks,
                    edit: e.map((groupName: any) => {
                        return groupName.value;
                    }),
                },
            }));
        }
        if (props.permission.name == "Navigation") {
            props.stateChanger((prevState: { Navigation: any }) => ({
                ...prevState,
                Navigation: {
                    ...prevState.Navigation,
                    edit: e.map((groupName: any) => {
                        return groupName.value;
                    }),
                },
            }));
        }
        if (props.permission.name == "SearchSuggestion") {
            props.stateChanger((prevState: { SearchSuggestion: any }) => ({
                ...prevState,
                SearchSuggestion: {
                    ...prevState.SearchSuggestion,
                    edit: e.map((groupName: any) => {
                        return groupName.value;
                    }),
                },
            }));
        }        
        if (props.permission.name == "ContentEnhancement") {
            props.stateChanger((prevState: { ContentEnhancement: any }) => ({
                ...prevState,
                ContentEnhancement: {
                    ...prevState.ContentEnhancement,
                    edit: e.map((groupName: any) => {
                        return groupName.value;
                    }),
                },
            }));
        }
        if (props.permission.name == "ControlPanelDeleteUrl") {
            props.stateChanger((prevState: { ControlPanelDeleteUrl: any }) => ({
                ...prevState,
                ControlPanelDeleteUrl: {
                    ...prevState.ControlPanelDeleteUrl,
                    edit: e.map((groupName: any) => {
                        return groupName.value;
                    }),
                },
            }));
        }
        if (props.permission.name == "ControlPanelUserPermission") {
            props.stateChanger((prevState: { ControlPanelUserPermission: any }) => ({
                ...prevState,
                ControlPanelUserPermission: {
                    ...prevState.ControlPanelUserPermission,
                    edit: e.map((groupName: any) => {
                        return groupName.value;
                    }),
                },
            }));
        }
        if (props.permission.name == "ControlPanelUserGroups") {
            props.stateChanger((prevState: { ControlPanelUserGroups: any }) => ({
                ...prevState,
                ControlPanelUserGroups: {
                    ...prevState.ControlPanelUserGroups,
                    edit: e.map((groupName: any) => {
                        return groupName.value;
                    }),
                },
            }));
        }
        if (props.permission.name == "ControlPanelNavigationSetting") {
            props.stateChanger((prevState: { ControlPanelNavigationSetting: any }) => ({
                ...prevState,
                ControlPanelNavigationSetting: {
                    ...prevState.ControlPanelNavigationSetting,
                    edit: e.map((groupName: any) => {
                        return groupName.value;
                    }),
                },
            }));
        }
    }

    function onChangeValueDelete(e: any) {
        setValueDelete(e);
        if (props.permission.name == "Feature") {
            props.stateChanger((prevState: { Featured: any }) => ({
                ...prevState,
                Featured: {
                    ...prevState.Featured,
                    delete: e.map((groupName: any) => {
                        return groupName.value;
                    }),
                },
            }));
        }
        if (props.permission.name == "Boost") {
            props.stateChanger((prevState: { Boost: any }) => ({
                ...prevState,
                Boost: {
                    ...prevState.Boost,
                    delete: e.map((groupName: any) => {
                        return groupName.value;
                    }),
                },
            }));
        }
        if (props.permission.name == "Synonym") {
            props.stateChanger((prevState: { Synonym: any }) => ({
                ...prevState,
                Synonym: {
                    ...prevState.Synonym,
                    delete: e.map((groupName: any) => {
                        return groupName.value;
                    }),
                },
            }));
        }
        if (props.permission.name == "FastLinks") {
            props.stateChanger((prevState: { FastLinks: any }) => ({
                ...prevState,
                FastLinks: {
                    ...prevState.FastLinks,
                    delete: e.map((groupName: any) => {
                        return groupName.value;
                    }),
                },
            }));
        }
        if (props.permission.name == "Navigation") {
            props.stateChanger((prevState: { Navigation: any }) => ({
                ...prevState,
                Navigation: {
                    ...prevState.Navigation,
                    delete: e.map((groupName: any) => {
                        return groupName.value;
                    }),
                },
            }));
        }
        if (props.permission.name == "SearchSuggestion") {
            props.stateChanger((prevState: { SearchSuggestion: any }) => ({
                ...prevState,
                SearchSuggestion: {
                    ...prevState.SearchSuggestion,
                    delete: e.map((groupName: any) => {
                        return groupName.value;
                    }),
                },
            }));
        }        
        if (props.permission.name == "ContentEnhancement") {
            props.stateChanger((prevState: { ContentEnhancement: any }) => ({
                ...prevState,
                ContentEnhancement: {
                    ...prevState.ContentEnhancement,
                    delete: e.map((groupName: any) => {
                        return groupName.value;
                    }),
                },
            }));
        }
        if (props.permission.name == "ControlPanelDeleteUrl") {
            props.stateChanger((prevState: { ControlPanelDeleteUrl: any }) => ({
                ...prevState,
                ControlPanelDeleteUrl: {
                    ...prevState.ControlPanelDeleteUrl,
                    delete: e.map((groupName: any) => {
                        return groupName.value;
                    }),
                },
            }));
        }
        if (props.permission.name == "ControlPanelUserPermission") {
            props.stateChanger((prevState: { ControlPanelUserPermission: any }) => ({
                ...prevState,
                ControlPanelUserPermission: {
                    ...prevState.ControlPanelUserPermission,
                    delete: e.map((groupName: any) => {
                        return groupName.value;
                    }),
                },
            }));
        }
        if (props.permission.name == "ControlPanelUserGroups") {
            props.stateChanger((prevState: { ControlPanelUserGroups: any }) => ({
                ...prevState,
                ControlPanelUserGroups: {
                    ...prevState.ControlPanelUserGroups,
                    delete: e.map((groupName: any) => {
                        return groupName.value;
                    }),
                },
            }));
        }
        if (props.permission.name == "ControlPanelNavigationSetting") {
            props.stateChanger((prevState: { ControlPanelNavigationSetting: any }) => ({
                ...prevState,
                ControlPanelNavigationSetting: {
                    ...prevState.ControlPanelNavigationSetting,
                    delete: e.map((groupName: any) => {
                        return groupName.value;
                    }),
                },
            }));
        }
    }

    return (
        <div className={`permission ${props.index > 1 ? "mt-4 mb-4" : ""}`}>
            <div className="permission-item">
                <div className="d-flex justify-content-between">
                    <div className="font-weight-bold mt-1 ml-1">
                        {props.permission.name == "Feature"
                            ? "Featured Content"
                            : props.permission.name == "Boost"
                                ? "Boosts and Blocks"
                                : props.permission.name == "FastLinks"
                                    ? "Fast Links"
                                    : props.permission.name == "SearchSuggestion"
                                        ? "Search Suggestion"
                                        : props.permission.name == "ContentEnhancement"
                                            ? "Content Enhancement"
                                            : props.permission.name == "ControlPanelDeleteUrl"
                                                ? "Control Panel / Delete URL"
                                                : props.permission.name == "ControlPanelUserPermission"
                                                    ? "Control Panel / UserPermission"
                                                    : props.permission.name == "ControlPanelUserGroups"
                                                        ? "Control Panel / UserGroups"
                                                        : props.permission.name == "ControlPanelNavigationSetting"
                                                            ? "Control Panel / Setting"
                                                            : props.permission.name}
                    </div>
                </div>
                <div className="mt-2 permission-item-input">
                    <div className="d-flex justify-content-around mt-4">
                        <label className="view-permission">View</label>
                        <Select
                            value={valueView}
                            className="input-permission"
                            options={props.options}
                            isMulti
                            onChange={onChangeValueView}
                            isDisabled={!props.handleEditUserPermission}
                        />
                    </div>
                    <div className="d-flex justify-content-around mt-4">
                        <label className="view-permission">Edit</label>
                        <Select
                            value={valueEdit}
                            className="input-permission"
                            options={props.options}
                            isMulti
                            onChange={onChangeValueEdit}
                            isDisabled={!props.handleEditUserPermission}
                        />
                    </div>
                    <div className="d-flex justify-content-around mt-4">
                        <label className="view-permission">Delete</label>
                        <Select
                            value={valueDelete}
                            className="input-permission"
                            options={props.options}
                            isMulti
                            onChange={onChangeValueDelete}
                            isDisabled={!props.handleEditUserPermission}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserPermissionScreen;
