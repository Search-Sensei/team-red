import "bootstrap/dist/css/bootstrap.css";
import React, { Dispatch, useCallback, useState } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { IStateType } from "../../store/models/root.interface";
import { useDispatch, useSelector } from "react-redux";
import { IAdminSettingsState } from "../../store/models/adminsettingsstate.interface";
import { PutCategories, UpdateCategories } from "../../store/models/fastlinks";
import { updateCategories, retrieveFastLink } from "../../store/actions/fastlink.action";
import { normalizeAdminApiUrl } from "../../store/actions/adminsettings.actions";

interface IMyProps {
    categoriesModalShow: boolean;
    setCategoriesModalShow: Function;
    title: string;
}

const CategoriesModal: React.FC<IMyProps> = (props: IMyProps) => {
    const dispatch: Dispatch<any> = useDispatch();
    const adminSettingsState: IAdminSettingsState = useSelector(
        (state: IStateType) => state.adminSettingsState
    );

    const [category, setCategory] = useState<PutCategories>({
        categoryName: "",
        description: "",
    });

    const getAdminApiBaseUrl = useCallback((): string => {
        return normalizeAdminApiUrl(adminSettingsState.adminSettings.searchAdminApiUrl);
    }, [adminSettingsState.adminSettings]);

    const handleGetFastLink = async (search = "all") => {
        const data = { query: search };
        await dispatch(retrieveFastLink(getAdminApiBaseUrl(), data));
    };

    const handleCreateCategories = async () => {
        let data: UpdateCategories = {
            categories: [
                {
                    categoryName: category.categoryName,
                    description: category.description,
                },
            ],
            fastLink: [],
        };
        await dispatch(updateCategories(getAdminApiBaseUrl(), data));
        await handleGetFastLink();
        props.setCategoriesModalShow(false);

    };

    // On successful validation of each step set the wizard queryRule to pass to the next step
    // Set defaults for properties if not passed in.
    return (
        <Modal
            show={props.categoriesModalShow}
            onHide={() => props.setCategoriesModalShow(false)}
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

export default CategoriesModal;
