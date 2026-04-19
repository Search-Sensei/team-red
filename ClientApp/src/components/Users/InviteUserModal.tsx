import React, { useState } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import fetcher from "../Fetcher";

interface IProps {
    show: boolean;
    onHide: () => void;
}

const InviteUserModal: React.FC<IProps> = ({ show, onHide }) => {
    const [formData, setFormData] = useState({ email: "", firstName: "", lastName: "" });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (fieldErrors[name]) {
            setFieldErrors((prev) => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
    };

    const handleClose = () => {
        setFormData({ email: "", firstName: "", lastName: "" });
        setSuccessMessage("");
        setErrorMessage("");
        setFieldErrors({});
        onHide();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSuccessMessage("");
        setErrorMessage("");
        setFieldErrors({});

        try {
            const response = await fetcher("/portal/api/invite", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                const data = await response.json();
                setSuccessMessage(data.message || `Invitation sent to ${formData.email}.`);
                setFormData({ email: "", firstName: "", lastName: "" });
            } else if (response.status === 409) {
                const data = await response.json();
                setFieldErrors({ email: data.error });
            } else if (response.status === 400) {
                const data = await response.json();
                if (data.errors) {
                    const errors: Record<string, string> = {};
                    for (const key of Object.keys(data.errors)) {
                        const fieldName = key.charAt(0).toLowerCase() + key.slice(1);
                        errors[fieldName] = data.errors[key][0];
                    }
                    setFieldErrors(errors);
                } else {
                    setErrorMessage(data.error || "Invalid input. Please check the form.");
                }
            } else {
                const data = await response.json().catch(() => null);
                setErrorMessage(data?.error || "Failed to send invitation. Please try again.");
            }
        } catch {
            setErrorMessage("Unable to connect to the server. Please try again later.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>Invite User</Modal.Title>
            </Modal.Header>
            <form onSubmit={handleSubmit}>
                <Modal.Body>
                    {successMessage && (
                        <div className="alert alert-success" role="alert">{successMessage}</div>
                    )}
                    {errorMessage && (
                        <div className="alert alert-danger" role="alert">{errorMessage}</div>
                    )}

                    <div className="form-group">
                        <label htmlFor="invite-email">Email address</label>
                        <input
                            type="email"
                            className={`form-control ${fieldErrors.email ? "is-invalid" : ""}`}
                            id="invite-email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="user@example.com"
                            required
                            autoFocus
                        />
                        {fieldErrors.email && (
                            <div className="invalid-feedback">{fieldErrors.email}</div>
                        )}
                    </div>

                    <div className="form-row">
                        <div className="form-group col-md-6">
                            <label htmlFor="invite-firstName">First name</label>
                            <input
                                type="text"
                                className={`form-control ${fieldErrors.firstName ? "is-invalid" : ""}`}
                                id="invite-firstName"
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleChange}
                                required
                            />
                            {fieldErrors.firstName && (
                                <div className="invalid-feedback">{fieldErrors.firstName}</div>
                            )}
                        </div>
                        <div className="form-group col-md-6">
                            <label htmlFor="invite-lastName">Last name</label>
                            <input
                                type="text"
                                className="form-control"
                                id="invite-lastName"
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button variant="primary" type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Sending..." : "Send Invitation"}
                    </Button>
                </Modal.Footer>
            </form>
        </Modal>
    );
};

export default InviteUserModal;
