import "bootstrap/dist/css/bootstrap.css";
import React, { Dispatch, useCallback, useEffect, useState } from "react";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import "./UserGroup.css";
import { IStateType } from "../../store/models/root.interface";
import { useDispatch, useSelector } from "react-redux";
import { IAdminSettingsState } from "../../store/models/adminsettingsstate.interface";
import {
  IUserGroupsState,
  UserGroups,
} from "../../store/models/usergroups.interface";
import {
  createUserGroup,
  removeUserGroupUpdate,
  retrieveUserGroups,
  updateUserGroup,
} from "../../store/actions/usergroups.action";
import { normalizeAdminApiUrl } from "../../store/actions/adminsettings.actions";
export const CREATE_USER_GROUPS_ERROR = "CREATE_USER_GROUPS_ERROR";
export const UPDATE_USER_GROUPS_ERROR: string = "UPDATE_USER_GROUPS_ERROR";

interface IMyProps {
  userGroupModalShow: boolean;
  setUserGroupModalShow: Function;
  title: string;
}

const UserGroupModal: React.FC<IMyProps> = (props: IMyProps) => {
  const dispatch: Dispatch<any> = useDispatch();
  const adminSettingsState: IAdminSettingsState = useSelector(
    (state: IStateType) => state.adminSettingsState
  );
  const userGroupsState: IUserGroupsState = useSelector(
    (state: IStateType) => state.userGroupsState
  );

  const [userGroup, setUserGroup] = useState<UserGroups>({
    id: "",
    groupName: "",
    description: "",
  });

  const [errorGroupId, setErrorGroupId] = useState("");
  const [errorGroupName, setErrorGroupName] = useState("");
  const [firstCreate, setFirstCreate] = useState(false);
  const [firstEdit, setFirstEdit] = useState(false);

  useEffect(() => {
    if (userGroupsState.error != "Successfully") {
      if (userGroupsState.error.includes("Group Id")) {
        setErrorGroupId(userGroupsState.error);
        setErrorGroupName("");
      }
      if (userGroupsState.error.includes("Group Name")) {
        setErrorGroupName(userGroupsState.error);
        setErrorGroupId("");
      }
    } else {
      if (firstCreate) {
        props.setUserGroupModalShow(false);
        setTimeout(() => {
          handleGetUserGroups();
        }, 500);
        dispatch({ type: CREATE_USER_GROUPS_ERROR, error: "" });
        setErrorGroupId("");
        setErrorGroupName("");
      }
      if (firstEdit) {
        props.setUserGroupModalShow(false);
        setTimeout(() => {
          handleGetUserGroups();
        }, 500);
        dispatch({ type: UPDATE_USER_GROUPS_ERROR, error: "" });
        setErrorGroupId("");
        setErrorGroupName("");
      }
    }
  }, [userGroupsState?.error]);

  useEffect(() => {
    if (userGroupsState.userGroupsEdit.id) {
      setUserGroup(userGroupsState.userGroupsEdit);
    }
  }, [userGroupsState.userGroupsEdit]);

  const getAdminApiBaseUrl = useCallback((): string => {
    return normalizeAdminApiUrl(adminSettingsState.adminSettings.searchAdminApiUrl);
  }, [adminSettingsState.adminSettings]);

  const handleGetUserGroups = (search = "") => {
    const data = { query: search };
    dispatch(retrieveUserGroups(getAdminApiBaseUrl(), data));
  };

  const handleCreateUserGroup = () => {
    if (userGroupsState.userGroupsEdit.id) {
      dispatch(updateUserGroup(getAdminApiBaseUrl(), userGroup));
      setFirstEdit(true);
    } else {
      dispatch(createUserGroup(getAdminApiBaseUrl(), userGroup));
      setFirstCreate(true);
    }
  };

  // On successful validation of each step set the wizard queryRule to pass to the next step
  // Set defaults for properties if not passed in.
  return (
    <Modal
      show={props.userGroupModalShow}
      onHide={() => props.setUserGroupModalShow(false)}
    >
      <Modal.Header closeButton>
        <Modal.Title>{props.title} User Group</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div>
          <label>Group Id</label>
          <input
            className={`form-control ${
              errorGroupId.length ? "inputUserGroup" : ""
            }`}
            placeholder=""
            value={userGroup?.id || ""}
            disabled={props.title == "Edit"}
            onChange={(e) => setUserGroup({ ...userGroup, id: e.target.value })}
          />
          {errorGroupId.length > 0 && (
            <div className="errorUserGroup">{errorGroupId}</div>
          )}
        </div>
        <div>
          <label>Group Name</label>
          <input
            className={`form-control ${
              errorGroupName.length ? "inputUserGroup" : ""
            }`}
            placeholder=""
            value={userGroup?.groupName || ""}
            onChange={(e) =>
              setUserGroup({ ...userGroup, groupName: e.target.value })
            }
          />
          {errorGroupName.length > 0 && (
            <div className="errorUserGroup">{errorGroupName}</div>
          )}
        </div>
        <div>
          <label>Description</label>
          <input
            className="form-control"
            placeholder=""
            value={userGroup?.description || ""}
            onChange={(e) =>
              setUserGroup({ ...userGroup, description: e.target.value })
            }
          />
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button
          className="btn-modal-synonym"
          variant="primary"
          onClick={handleCreateUserGroup}
        >
          Save
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default UserGroupModal;
