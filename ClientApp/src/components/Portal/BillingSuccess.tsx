import React, { useState, useEffect } from "react";
import logo from "../../assets/logo.png";
import "./Register.css";
import "./BillingSuccess.css";

interface CheckoutResult {
    status: string;
    planName: string;
}

const BillingSuccess: React.FC = () => {
    const [result, setResult] = useState<CheckoutResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const sessionId = new URLSearchParams(window.location.search).get("session_id");
        if (!sessionId) {
            setError("No session found. If you completed payment, please contact support.");
            setLoading(false);
            return;
        }

        fetch(`/portal/api/billing/checkout-result?session_id=${encodeURIComponent(sessionId)}`)
            .then(async (res) => {
                if (res.ok) {
                    const data: CheckoutResult = await res.json();
                    setResult(data);
                } else {
                    const data = await res.json().catch(() => null);
                    setError(data?.error || "Unable to confirm your payment. Please contact support.");
                }
            })
            .catch(() => setError("Unable to connect. If you completed payment, please contact support."))
            .finally(() => setLoading(false));
    }, []);

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
                    {loading && (
                        <div className="ss-success-loading">
                            <div className="ss-spinner" />
                            <p>Confirming your payment…</p>
                        </div>
                    )}

                    {!loading && error && (
                        <>
                            <div className="ss-card-header">
                                <h2>Payment Confirmation</h2>
                            </div>
                            <div className="ss-alert ss-alert-error">{error}</div>
                            <div className="ss-form-footer">
                                <a href="/portal/register">Back to Registration</a>
                            </div>
                        </>
                    )}

                    {!loading && result && (
                        <div className="ss-success-content">
                            <div className="ss-success-icon">&#10003;</div>
                            <h2 className="ss-success-title">You're all set!</h2>
                            <p className="ss-success-subtitle">
                                Payment confirmed for <strong>{result.planName}</strong>.
                            </p>
                            <p className="ss-success-note">
                                Your account is being activated. You can log in once you receive
                                your welcome email, or try logging in shortly.
                            </p>
                            <a href="/adminui/login" className="ss-btn-primary ss-success-login-btn">
                                Go to Login
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BillingSuccess;
