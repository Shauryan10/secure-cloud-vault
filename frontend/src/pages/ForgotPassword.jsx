import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";
import BrandLogo from "../components/BrandLogo";
import AuthLayout from "../components/AuthLayout";

function ForgotPassword() {

    const [step, setStep]               = useState(1);
    const [email, setEmail]             = useState("");
    const [otp, setOtp]                 = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirm, setConfirm]         = useState("");
    const [error, setError]             = useState("");
    const [success, setSuccess]         = useState("");
    const [loading, setLoading]         = useState(false);

    async function handleRequestOtp(e) {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await api.post("/auth/forgot-password", { email });
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.detail || "Something went wrong.");
        } finally {
            setLoading(false);
        }
    }

    async function handleReset(e) {
        e.preventDefault();
        setError("");
        if (newPassword !== confirm) {
            setError("Passwords do not match.");
            return;
        }
        setLoading(true);
        try {
            await api.post("/auth/reset-password", {
                email,
                otp,
                new_password: newPassword,
            });
            setSuccess("Password reset successfully! You can now log in.");
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to reset password.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthLayout>
            <div className="card" style={{ width: "100%", maxWidth: "400px", boxShadow: "none" }}>

                <BrandLogo />
                <h3>{step === 1 ? "Forgot your password?" : "Enter OTP & new password"}</h3>

                <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: "20px" }}>
                    {[1, 2].map(s => (
                        <div key={s} style={{
                            width: "10px", height: "10px", borderRadius: "50%",
                            background: step >= s ? "#a3e635" : "#ddd",
                            transition: "background 0.3s"
                        }} />
                    ))}
                </div>

                {error   && <p className="error">{error}</p>}

                {success ? (
                    <>
                        <p style={{ color: "#65a30d", textAlign: "center", marginBottom: "16px", fontSize: "0.95rem" }}>
                            {success}
                        </p>
                        <Link to="/"><button type="button">Go to Login</button></Link>
                    </>
                ) : step === 1 ? (
                    <form onSubmit={handleRequestOtp}>
                        <input
                            type="email"
                            placeholder="Registered email address"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                        />
                        <button type="submit" disabled={loading}>
                            {loading ? "Sending OTP…" : "Send OTP"}
                        </button>
                        <p>Remember it? <Link to="/">Back to Login</Link></p>
                    </form>
                ) : (
                    <form onSubmit={handleReset}>
                        <input
                            placeholder="6-digit OTP"
                            value={otp}
                            onChange={e => setOtp(e.target.value)}
                            maxLength={6}
                            inputMode="numeric"
                            required
                            style={{ letterSpacing: "6px", textAlign: "center", fontSize: "1.2rem" }}
                        />
                        <input
                            type="password"
                            placeholder="New password"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            required
                        />
                        <input
                            type="password"
                            placeholder="Confirm new password"
                            value={confirm}
                            onChange={e => setConfirm(e.target.value)}
                            required
                        />
                        <button type="submit" disabled={loading}>
                            {loading ? "Resetting…" : "Reset Password"}
                        </button>
                        <p>
                            Didn't get it?{" "}
                            <span
                                onClick={() => { setStep(1); setError(""); }}
                                style={{ color: "#65a30d", cursor: "pointer", fontWeight: 600 }}
                            >
                                Resend
                            </span>
                        </p>
                    </form>
                )}
            </div>
        </AuthLayout>
    );
}

export default ForgotPassword;
