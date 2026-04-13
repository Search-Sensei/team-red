import React, { useState } from "react";

interface FieldError {
    field: string;
    error: string;
}

const Register: React.FC = () => {
    const [formData, setFormData] = useState({
        organisationName: "",
        address: "",
        contactPerson: "",
        contactPhone: "",
        email: "",
        password: "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        // Clear field-specific error when user starts typing
        if (fieldErrors[name]) {
            setFieldErrors((prev) => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSuccessMessage("");
        setErrorMessage("");
        setFieldErrors({});

        try {
            const response = await fetch("/portal/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                setSuccessMessage("Organisation registered successfully! You can now log in.");
                setFormData({
                    organisationName: "",
                    address: "",
                    contactPerson: "",
                    contactPhone: "",
                    email: "",
                    password: "",
                });
            } else if (response.status === 409) {
                const data: FieldError = await response.json();
                setFieldErrors({ [data.field]: data.error });
            } else if (response.status === 400) {
                const data = await response.json();
                // Handle model validation errors
                if (data.errors) {
                    const errors: Record<string, string> = {};
                    for (const key of Object.keys(data.errors)) {
                        const fieldName = key.charAt(0).toLowerCase() + key.slice(1);
                        errors[fieldName] = data.errors[key][0];
                    }
                    setFieldErrors(errors);
                } else {
                    setErrorMessage("Invalid input. Please check your form.");
                }
            } else {
                const data = await response.json().catch(() => null);
                setErrorMessage(data?.error || "Registration failed. Please try again later.");
            }
        } catch {
            setErrorMessage("Unable to connect to the server. Please try again later.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div id="content-wrapper">
            <div className="container">
                <div className="row justify-content-center">
                    <div className="col-xl-8 col-lg-10 col-md-11">
                        <div className="card o-hidden border-0 shadow-lg my-5">
                            <div className="card-body p-0">
                                <div className="p-5">
                                    <div className="text-center mb-4">
                                        <h1 className="h4 text-gray-900">Register Your Organisation</h1>
                                        <p className="text-muted">Fill in the details below to create your organisation account.</p>
                                    </div>

                                    {successMessage && (
                                        <div className="alert alert-success" role="alert">
                                            {successMessage}
                                            <div className="mt-2">
                                                <a href="/adminui/login" className="btn btn-sm btn-primary">Go to Login</a>
                                            </div>
                                        </div>
                                    )}

                                    {errorMessage && (
                                        <div className="alert alert-danger" role="alert">{errorMessage}</div>
                                    )}

                                    {!successMessage && (
                                        <form onSubmit={handleSubmit}>
                                            <div className="form-group">
                                                <label htmlFor="organisationName">Organisation Name</label>
                                                <input
                                                    type="text"
                                                    className={`form-control ${fieldErrors.organisationName ? "is-invalid" : ""}`}
                                                    id="organisationName"
                                                    name="organisationName"
                                                    value={formData.organisationName}
                                                    onChange={handleChange}
                                                    required
                                                />
                                                {fieldErrors.organisationName && (
                                                    <div className="invalid-feedback">{fieldErrors.organisationName}</div>
                                                )}
                                            </div>

                                            <div className="form-group">
                                                <label htmlFor="address">Address</label>
                                                <input
                                                    type="text"
                                                    className={`form-control ${fieldErrors.address ? "is-invalid" : ""}`}
                                                    id="address"
                                                    name="address"
                                                    value={formData.address}
                                                    onChange={handleChange}
                                                    required
                                                />
                                                {fieldErrors.address && (
                                                    <div className="invalid-feedback">{fieldErrors.address}</div>
                                                )}
                                            </div>

                                            <div className="form-row">
                                                <div className="form-group col-md-6">
                                                    <label htmlFor="contactPerson">Contact Person</label>
                                                    <input
                                                        type="text"
                                                        className={`form-control ${fieldErrors.contactPerson ? "is-invalid" : ""}`}
                                                        id="contactPerson"
                                                        name="contactPerson"
                                                        value={formData.contactPerson}
                                                        onChange={handleChange}
                                                        required
                                                    />
                                                    {fieldErrors.contactPerson && (
                                                        <div className="invalid-feedback">{fieldErrors.contactPerson}</div>
                                                    )}
                                                </div>
                                                <div className="form-group col-md-6">
                                                    <label htmlFor="contactPhone">Contact Phone</label>
                                                    <input
                                                        type="tel"
                                                        className={`form-control ${fieldErrors.contactPhone ? "is-invalid" : ""}`}
                                                        id="contactPhone"
                                                        name="contactPhone"
                                                        value={formData.contactPhone}
                                                        onChange={handleChange}
                                                        required
                                                    />
                                                    {fieldErrors.contactPhone && (
                                                        <div className="invalid-feedback">{fieldErrors.contactPhone}</div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="form-group">
                                                <label htmlFor="email">Email</label>
                                                <input
                                                    type="email"
                                                    className={`form-control ${fieldErrors.email ? "is-invalid" : ""}`}
                                                    id="email"
                                                    name="email"
                                                    value={formData.email}
                                                    onChange={handleChange}
                                                    required
                                                />
                                                {fieldErrors.email && (
                                                    <div className="invalid-feedback">{fieldErrors.email}</div>
                                                )}
                                            </div>

                                            <div className="form-group">
                                                <label htmlFor="password">Password</label>
                                                <input
                                                    type="password"
                                                    className={`form-control ${fieldErrors.password ? "is-invalid" : ""}`}
                                                    id="password"
                                                    name="password"
                                                    value={formData.password}
                                                    onChange={handleChange}
                                                    required
                                                    minLength={8}
                                                />
                                                {fieldErrors.password && (
                                                    <div className="invalid-feedback">{fieldErrors.password}</div>
                                                )}
                                                <small className="form-text text-muted">Must be at least 8 characters.</small>
                                            </div>

                                            <button
                                                type="submit"
                                                className="btn btn-primary btn-block"
                                                disabled={isSubmitting}
                                            >
                                                {isSubmitting ? "Registering..." : "Register Organisation"}
                                            </button>

                                            <div className="text-center mt-3">
                                                <a href="/adminui/login">Already have an account? Log in</a>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
