import React, { useState } from "react";
import logo from "../../assets/logo.png";
import "./Register.css";

interface FieldError {
    field: string;
    error: string;
}

const Register: React.FC = () => {
    const [formData, setFormData] = useState({
        organisationName: "",
        organisationUrl: "",
        contactPerson: "",
        contactPhone: "",
        email: "",
        password: "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const handleUrlBlur = () => {
        const url = formData.organisationUrl.trim();
        if (url && !/^https?:\/\//i.test(url)) {
            setFormData((prev) => ({ ...prev, organisationUrl: `https://${url}` }));
        }
    };

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
                    organisationUrl: "",
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
        <div className="ss-page">
            <div className="ss-panel-left">
                <div className="ss-brand">
                    <img src={logo} alt="Search Sensei" className="ss-logo" />
                    <p className="ss-brand-tagline">Customer Portal</p>
                </div>
            </div>

            <div className="ss-panel-right">
                <div className="ss-card">
                    <div className="ss-card-header">
                        <h2>Register Your Organisation</h2>
                        <p>Fill in the details below to create your account.</p>
                    </div>

                    {successMessage && (
                        <div className="ss-alert ss-alert-success">
                            {successMessage}
                            <div>
                                <a href="/adminui/login" className="ss-btn-login">Go to Login</a>
                            </div>
                        </div>
                    )}

                    {errorMessage && (
                        <div className="ss-alert ss-alert-error">{errorMessage}</div>
                    )}

                    {!successMessage && (
                        <form onSubmit={handleSubmit} className="ss-form">
                            <div className="ss-form-group">
                                <label htmlFor="organisationName">Organisation Name</label>
                                <input
                                    type="text"
                                    className={fieldErrors.organisationName ? "ss-input-error" : ""}
                                    id="organisationName"
                                    name="organisationName"
                                    value={formData.organisationName}
                                    onChange={handleChange}
                                    required
                                    placeholder="Your company name"
                                />
                                {fieldErrors.organisationName && (
                                    <span className="ss-field-error">{fieldErrors.organisationName}</span>
                                )}
                            </div>

                            <div className="ss-form-group">
                                <label htmlFor="organisationUrl">Organisation URL</label>
                                <input
                                    type="url"
                                    className={fieldErrors.organisationUrl ? "ss-input-error" : ""}
                                    id="organisationUrl"
                                    name="organisationUrl"
                                    value={formData.organisationUrl}
                                    onChange={handleChange}
                                    onBlur={handleUrlBlur}
                                    required
                                    placeholder="www.yourcompany.com"
                                />
                                {fieldErrors.organisationUrl && (
                                    <span className="ss-field-error">{fieldErrors.organisationUrl}</span>
                                )}
                                <span className="ss-field-hint">Your organisation's website address.</span>
                            </div>

                            <div className="ss-form-row">
                                <div className="ss-form-group">
                                    <label htmlFor="contactPerson">Contact Person</label>
                                    <input
                                        type="text"
                                        className={fieldErrors.contactPerson ? "ss-input-error" : ""}
                                        id="contactPerson"
                                        name="contactPerson"
                                        value={formData.contactPerson}
                                        onChange={handleChange}
                                        required
                                        placeholder="Jane Doe"
                                    />
                                    {fieldErrors.contactPerson && (
                                        <span className="ss-field-error">{fieldErrors.contactPerson}</span>
                                    )}
                                </div>
                                <div className="ss-form-group">
                                    <label htmlFor="contactPhone">Contact Phone</label>
                                    <input
                                        type="tel"
                                        className={fieldErrors.contactPhone ? "ss-input-error" : ""}
                                        id="contactPhone"
                                        name="contactPhone"
                                        value={formData.contactPhone}
                                        onChange={handleChange}
                                        required
                                        placeholder="+61 400 000 000"
                                    />
                                    {fieldErrors.contactPhone && (
                                        <span className="ss-field-error">{fieldErrors.contactPhone}</span>
                                    )}
                                </div>
                            </div>

                            <div className="ss-form-group">
                                <label htmlFor="email">Email</label>
                                <input
                                    type="email"
                                    className={fieldErrors.email ? "ss-input-error" : ""}
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    placeholder="you@example.com"
                                />
                                {fieldErrors.email && (
                                    <span className="ss-field-error">{fieldErrors.email}</span>
                                )}
                            </div>

                            <div className="ss-form-group">
                                <label htmlFor="password">Password</label>
                                <input
                                    type="password"
                                    className={fieldErrors.password ? "ss-input-error" : ""}
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    minLength={8}
                                    placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;"
                                />
                                {fieldErrors.password && (
                                    <span className="ss-field-error">{fieldErrors.password}</span>
                                )}
                                <span className="ss-field-hint">Must be at least 8 characters.</span>
                            </div>

                            <button
                                type="submit"
                                className="ss-btn-primary"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Registering..." : "Register Organisation"}
                            </button>

                            <div className="ss-form-footer">
                                <a href="/adminui/login">Already have an account? Log in</a>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Register;
