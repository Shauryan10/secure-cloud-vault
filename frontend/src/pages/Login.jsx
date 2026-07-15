import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/api";
import BrandLogo from "../components/BrandLogo";

// ── math captcha generator ────────────────────────────────────────────────────
function generateCaptcha() {
    const a  = Math.floor(Math.random() * 9) + 1;
    const b  = Math.floor(Math.random() * 9) + 1;
    const ops = ["+", "-", "×"];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let answer;
    if (op === "+") answer = a + b;
    else if (op === "-") answer = a - b;
    else answer = a * b;
    return { question: `${a} ${op} ${b}`, answer };
}

function Login() {

    const navigate = useNavigate();

    // ── step: "credentials" | "captcha" | "otp" ──────────────────────────────
    const [step, setStep]       = useState("credentials");

    // step 1
    const [email, setEmail]     = useState("");
    const [password, setPassword] = useState("");

    // step 2 – captcha
    const [captcha, setCaptcha]       = useState(() => generateCaptcha());
    const [captchaInput, setCaptchaInput] = useState("");
    const [captchaError, setCaptchaError] = useState("");

    // step 3 – OTP
    const [otp, setOtp]           = useState("");
    const [otpError, setOtpError] = useState("");
    const [resendCooldown, setResendCooldown] = useState(0);
    const otpRefs = useRef([]);

    const [error, setError]   = useState("");
    const [loading, setLoading] = useState(false);

    // cooldown timer for resend
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [resendCooldown]);

    // ── step 1: verify credentials ────────────────────────────────────────────
    async function handleCredentials(e) {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await api.post("/auth/login", { email, password });
            // credentials OK → show captcha
            setCaptcha(generateCaptcha());
            setCaptchaInput("");
            setCaptchaError("");
            setStep("captcha");
        } catch (err) {
            setError(err.response?.data?.detail || "Invalid email or password.");
        } finally {
            setLoading(false);
        }
    }

    // ── step 2: solve captcha → send OTP ──────────────────────────────────────
    async function handleCaptcha(e) {
        e.preventDefault();
        setCaptchaError("");

        if (parseInt(captchaInput, 10) !== captcha.answer) {
            setCaptchaError("Incorrect answer. Try again.");
            setCaptcha(generateCaptcha());
            setCaptchaInput("");
            return;
        }

        setLoading(true);
        try {
            await api.post("/auth/send-login-otp", { email });
            setOtp("");
            setOtpError("");
            setResendCooldown(60);
            setStep("otp");
            setTimeout(() => otpRefs.current[0]?.focus(), 100);
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to send OTP. Try again.");
            setStep("credentials");
        } finally {
            setLoading(false);
        }
    }

    // ── step 3: verify OTP ────────────────────────────────────────────────────
    async function handleOtp(e) {
        e.preventDefault();
        setOtpError("");
        setLoading(true);
        try {
            const res = await api.post("/auth/verify-login-otp", { email, otp });
            localStorage.setItem("token", res.data.access_token);
            navigate("/dashboard");
        } catch (err) {
            const detail = err.response?.data?.detail || "Incorrect OTP.";
            setOtpError(detail);
            setOtp("");
            otpRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    }

    // OTP input: split into 6 boxes
    function handleOtpInput(val, idx) {
        const digits = val.replace(/\D/g, "").slice(0, 1);
        const arr    = otp.split("").concat(Array(6).fill("")).slice(0, 6);
        arr[idx]     = digits;
        const joined = arr.join("");
        setOtp(joined);
        if (digits && idx < 5) otpRefs.current[idx + 1]?.focus();
    }

    function handleOtpKeyDown(e, idx) {
        if (e.key === "Backspace" && !otp[idx] && idx > 0) {
            otpRefs.current[idx - 1]?.focus();
        }
    }

    async function resendOtp() {
        if (resendCooldown > 0) return;
        setLoading(true);
        setOtpError("");
        try {
            await api.post("/auth/send-login-otp", { email });
            setOtp("");
            setResendCooldown(60);
        } catch (err) {
            setOtpError(err.response?.data?.detail || "Failed to resend OTP.");
        } finally {
            setLoading(false);
        }
    }

    // ── step dots ─────────────────────────────────────────────────────────────
    const steps      = ["credentials", "captcha", "otp"];
    const stepLabels = ["Credentials", "Verify", "OTP"];
    const currentIdx = steps.indexOf(step);

    return (
        <div className="auth-container">
            <div className="card">

                <BrandLogo />

                {/* step indicator */}
                <div className="step-indicator">
                    {steps.map((s, i) => (
                        <div key={s} className="step-item">
                            <div className={`step-dot ${i <= currentIdx ? "active" : ""}`}>
                                {i < currentIdx ? "✓" : i + 1}
                            </div>
                            <span className={`step-label ${i <= currentIdx ? "active" : ""}`}>
                                {stepLabels[i]}
                            </span>
                        </div>
                    ))}
                </div>

                {/* ── STEP 1: Credentials ── */}
                {step === "credentials" && (
                    <form onSubmit={handleCredentials}>
                        <h3>Sign in to your account</h3>
                        {error && <p className="error">{error}</p>}

                        <input
                            type="email"
                            placeholder="Email address"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            autoComplete="email"
                            required
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            autoComplete="current-password"
                            required
                        />

                        <button type="submit" disabled={loading}>
                            {loading ? "Verifying…" : "Continue"}
                        </button>

                        <p>Don't have an account?{" "}<Link to="/register">Register here</Link></p>
                        <p><Link to="/forgot-password">Forgot password?</Link></p>
                    </form>
                )}

                {/* ── STEP 2: Captcha ── */}
                {step === "captcha" && (
                    <form onSubmit={handleCaptcha}>
                        <h3>Human verification</h3>
                        <p style={{ textAlign: "center", color: "#555", fontSize: "0.9rem", marginBottom: "20px" }}>
                            Solve this to continue
                        </p>

                        <div className="captcha-box">
                            <span className="captcha-question">{captcha.question} = ?</span>
                        </div>

                        {captchaError && <p className="error">{captchaError}</p>}

                        <input
                            type="number"
                            placeholder="Your answer"
                            value={captchaInput}
                            onChange={e => setCaptchaInput(e.target.value)}
                            style={{ textAlign: "center", fontSize: "1.1rem", letterSpacing: "4px" }}
                            required
                            autoFocus
                        />

                        <button type="submit" disabled={loading}>
                            {loading ? "Sending OTP…" : "Verify & Send OTP"}
                        </button>

                        <p>
                            <span
                                onClick={() => { setStep("credentials"); setError(""); }}
                                style={{ color: "#65a30d", cursor: "pointer", fontWeight: 600 }}
                            >
                                ← Back
                            </span>
                        </p>
                    </form>
                )}

                {/* ── STEP 3: OTP ── */}
                {step === "otp" && (
                    <form onSubmit={handleOtp}>
                        <h3>Enter your OTP</h3>
                        <p style={{ textAlign: "center", color: "#555", fontSize: "0.88rem", marginBottom: "20px" }}>
                            A 6-digit code was sent to<br />
                            <strong style={{ color: "#3f6212" }}>{email}</strong>
                        </p>

                        {otpError && <p className="error">{otpError}</p>}

                        <div className="otp-boxes">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <input
                                    key={i}
                                    ref={el => otpRefs.current[i] = el}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={otp[i] || ""}
                                    onChange={e => handleOtpInput(e.target.value, i)}
                                    onKeyDown={e => handleOtpKeyDown(e, i)}
                                    className="otp-box"
                                />
                            ))}
                        </div>

                        <button
                            type="submit"
                            disabled={loading || otp.replace(/\s/g, "").length < 6}
                            style={{ marginTop: "12px" }}
                        >
                            {loading ? "Verifying…" : "Verify OTP"}
                        </button>

                        <p style={{ marginTop: "14px" }}>
                            {resendCooldown > 0 ? (
                                <span style={{ color: "#aaa", fontSize: "0.88rem" }}>
                                    Resend in {resendCooldown}s
                                </span>
                            ) : (
                                <span
                                    onClick={resendOtp}
                                    style={{ color: "#65a30d", cursor: "pointer", fontWeight: 600, fontSize: "0.88rem" }}
                                >
                                    Resend OTP
                                </span>
                            )}
                        </p>
                    </form>
                )}

            </div>
        </div>
    );
}

export default Login;
