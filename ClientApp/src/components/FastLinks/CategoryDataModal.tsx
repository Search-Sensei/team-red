import "bootstrap/dist/css/bootstrap.css";
import React, { Dispatch, useCallback, useEffect, useState } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { IStateType } from "../../store/models/root.interface";
import { useDispatch, useSelector } from "react-redux";
import { IAdminSettingsState } from "../../store/models/adminsettingsstate.interface";
import { CategoryData, IFastLinksState, PutCategories, UpdateCategories } from "../../store/models/fastlinks";
import { updateCategoryData, retrieveFastLink } from "../../store/actions/fastlink.action";
import { normalizeAdminApiUrl } from "../../store/actions/adminsettings.actions";

interface IMyProps {
  categoryDataModalShow: boolean;
  setCategoryDataModalShow: Function;
  title: string;
}

const CategoryDataModal: React.FC<IMyProps> = (props: IMyProps) => {
    const fastLinkState: IFastLinksState = useSelector(
        (state: IStateType) => state.fastLinkStateState
    );
  const dispatch: Dispatch<any> = useDispatch();
  const adminSettingsState: IAdminSettingsState = useSelector(
    (state: IStateType) => state.adminSettingsState
  );

    const [category, setCategory] = useState<CategoryData>({
        id:"",
    categoryName: "",
    description: "",
  });

    useEffect(() => {
        if (fastLinkState.category.categoryName) {
            setCategory(fastLinkState.category);
        }
    }, [fastLinkState.category]);

  const getAdminApiBaseUrl = useCallback((): string => {
    return normalizeAdminApiUrl(adminSettingsState.adminSettings.searchAdminApiUrl);
  }, [adminSettingsState.adminSettings]);

  const handleCreateCategories = async () => {
      await dispatch(updateCategoryData(getAdminApiBaseUrl(), category));
      const data = { query: "all" };
      await dispatch(retrieveFastLink(getAdminApiBaseUrl(), data));
      props.setCategoryDataModalShow(false);
  };

  // On successful validation of each step set the wizard queryRule to pass to the next step
  // Set defaults for properties if not passed in.
  return (
    <Modal
          show={props.categoryDataModalShow}
          onHide={() => props.setCategoryDataModalShow(false)}
    >
      {/* @ts-ignore */}
      <div>
        {/* @ts-ignore */}
        <Modal.Header closeButton>
          {/* @ts-ignore */}
          <Modal.Title>{props.title} Category</Modal.Title>
        </Modal.Header>
        {/* @ts-ignore */}
        <Modal.Body>
          <div>
            <label>Category Name</label>
          <input
                      className="form-control"
                      placeholder=""
                      value={category.categoryName}
            onChange={(e) =>
              setCategory({ ...category, categoryName: e.target.value })
            }
          />
        </div>
        <div>
          <label>Description</label>
          <input
            className="form-control"
            onChange={(e) =>
              setCategory({ ...category, description: e.target.value })
            }
                      placeholder=""
                      value={category.description}
          />
          </div>
        {/* @ts-ignore */}
      </Modal.Body>
      {/* @ts-ignore */}
      <Modal.Footer>
        {/* @ts-ignore */}
        <Button
          className="btn-modal-synonym"
          variant="primary"
          onClick={handleCreateCategories}
        >
          Save
        </Button>
      </Modal.Footer>
      </div>
    </Modal>
  );
};

export default CategoryDataModal;
