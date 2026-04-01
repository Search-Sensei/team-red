// @ts-nocheck
import React from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';

export type ConfirmDeletionModalProps = {
    showConfirmationModal: boolean;
    onCancel: () => void;
    onConfirm: () => void;
    itemName?: string;
    // Check the available sizes here: https://react-bootstrap.github.io/components/modal/#modal-props
    size?: 'sm' | 'lg' | 'xl';
}

const ConfirmDeletionModal: React.FC<ConfirmDeletionModalProps> = (props) => {
    // Provide text if the itemName has not been supplied.
    const itemName: string = props.itemName ? `'${props.itemName}'` : "this item";

    return (
        <Modal show={props.showConfirmationModal} id="delete-confirmation-modal" size={props.size} aria-labelledby="contained-modal-title-vcenter" dialogClassName="delete-confirmation-modal" centered onHide={props.onCancel}>
            <Modal.Header closeButton>
                <Modal.Title id="contained-modal-title-vcenter">
                    Confirm Deletion
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p className="text-center">
                    Are you sure you want to delete {itemName}?
                </p>
            </Modal.Body>
            <Modal.Footer>
                <Button className="btn btn-light" onClick={props.onCancel}>Cancel</Button>
                <Button className="btn btn-secondary" onClick={props.onConfirm}>OK</Button>
            </Modal.Footer>
        </Modal>
    );
}

export default ({ showConfirmationModal, onCancel, onConfirm, itemName, size }: { showConfirmationModal: boolean, onCancel: () => void, onConfirm: () => void, itemName?: string, size?: 'sm' | 'lg' | 'xl' }) => (
    <ConfirmDeletionModal showConfirmationModal={showConfirmationModal} onCancel={onCancel} onConfirm={onConfirm} itemName={itemName} size={size}></ConfirmDeletionModal>
)
