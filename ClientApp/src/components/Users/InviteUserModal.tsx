import React, { useState } from "react";
import Modal from "react-bootstrap/Modal";
import fetcher from "../Fetcher";

interface IProps {
    show: boolean;
    onHide: () => void;
}

const InviteUserModal: React.FC<IProps> = ({ show, onHide }) => {
    const [formData, setFormData] = useState({ email: "", firstName: "", lastName: "", role: "contributor" });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
        setFormData({ email: "", firstName: "", lastName: "", role: "contributor" });
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
                setFormData({ email: "", firstName: "", lastName: "", role: "contributor" });
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
            <Modal.Header closeButton style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                <Modal.Title style={{ fontSize: "1.2rem", fontWeight: 700, color: "#1d5d66" }}>
                    Invite User
                </Modal.Title>
            </Modal.Header>
            <form onSubmit={handleSubmit}>
                <Modal.Body style={{ padding: "1.5rem 2rem" }}>
                    {successMessage && (
                        <div className="ss-alert ss-alert-success">{successMessage}</div>
                    )}
                    {errorMessage && (
                        <div className="ss-alert ss-alert-error">{errorMessage}</div>
                    )}

                    <div className="ss-form" style={{ gap: "1rem" }}>
                        <div className="ss-form-group">
                            <label htmlFor="invite-email">Email address</label>
                            <input
                                type="email"
                                className={fieldErrors.email ? "ss-input-error" : ""}
                                id="invite-email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="user@example.com"
                                required
                                autoFocus
                            />
                            {fieldErrors.email && (
                                <span className="ss-field-error">{fieldErrors.email}</span>
                            )}
                        </div>

                        <div className="ss-form-row">
                            <div className="ss-form-group">
                                <label htmlFor="invite-firstName">First name</label>
                                <input
                                    type="text"
                                    className={fieldErrors.firstName ? "ss-input-error" : ""}
                                    id="invite-firstName"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    required
                                    placeholder="Jane"
                                />
                                {fieldErrors.firstName && (
                                    <span className="ss-field-error">{fieldErrors.firstName}</span>
                                )}
                            </div>
                            <div className="ss-form-group">
                                <label htmlFor="invite-lastName">Last name</label>
                                <input
                                    type="text"
                                    id="invite-lastName"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    placeholder="Doe"
                                />
                            </div>
                        </div>

                        <div className="ss-form-group">
                            <label htmlFor="invite-role">Role</label>
                            <select
                                className={fieldErrors.role ? "ss-input-error" : ""}
                                id="invite-role"
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                required
                            >
                                <option value="contributor">Contributor</option>
                                <option value="org-admin">Org Admin</option>
                            </select>
                            {fieldErrors.role && (
                                <span className="ss-field-error">{fieldErrors.role}</span>
                            )}
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer style={{ borderTop: "1px solid rgba(0,0,0,0.08)", gap: "0.5rem" }}>
                    <button
                        type="button"
                        className="ss-btn-secondary"
                        onClick={handleClose}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="ss-btn-primary"
                        disabled={isSubmitting}
                        style={{ marginTop: 0 }}
                    >
                        {isSubmitting ? "Sending..." : "Send Invitation"}
                    </button>
                </Modal.Footer>
            </form>
        </Modal>
    );
};

export default InviteUserModal;
