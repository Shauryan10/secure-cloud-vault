import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/api";
import BrandLogo from "../components/BrandLogo";

// ── text + number captcha ─────────────────────────────────────────────────────
const LETTERS  = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const NUMBERS  = "23456789";

function generateCaptchaText() {
    // Always 2 uppercase letters + 2 numbers, shuffled
    const chars = [
        LETTERS[Math.floor(Math.random() * LETTERS.length)],
        LETTERS[Math.floor(Math.random() * LETTERS.length)],
        NUMBERS[Math.floor(Math.random() * NUMBERS.length)],
        NUMBERS[Math.floor(Math.random() * NUMBERS.length)],
    ];
    // Fisher-Yates shuffle
    for (let i = chars.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join("");
}

function CaptchaDisplay({ text }) {
    return (
        <div style={{
            display: "flex",
            justifyContent: "center",
            gap: "10px",
            background: "#f7fee7",
            border: "2px solid #a3e635",
            borderRadius: "10px",
            padding: "16px 24px",
            marginBottom: "16px",
            userSelect: "none",
        }}>
            {text.split("").map((ch, i) => (
                <span key={i} style={{
                    fontSize: "1.8rem",
                    fontWeight: 700,
                    fontFamily: "monospace",
                    color: /[0-9]/.test(ch) ? "#2563eb" : "#3f6212",
                    letterSpacing: "2px",
                    minWidth: "28px",
                    textAlign: "center",
                }}>
                    {ch}
                </span>
            ))}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────

function Login() {

    const navigate = useNavigate();

    // "credentials" → "captcha" → "totp-setup" | "totp-verify"
    const [step, setStep]               = useState("credentials");
    const [email, setEmail]             = useState("");
    const [password, setPassword]       = useState("");
    const [totpEnabled, setTotpEnabled] = useState(false);

    // captcha
    const [captchaText, setCaptchaText]   = useState(() => generateCaptchaText());
    const [captchaInput, setCaptchaInput] = useState("");
    const [captchaError, setCaptchaError] = useState("");

    // TOTP — single hidden input, displayed as 6 boxes
    const [qrBase64, setQrBase64]   = useState("");
    const [secret, setSecret]       = useState("");
    const [totp, setTotp]           = useState("");
    const [totpError, setTotpError] = useState("");
    const hiddenInputRef = useRef(null);

    const [error, setError]     = useState("");
    const [loading, setLoading] = useState(false);

    const currentIdx =
        step === "credentials"            ? 0
      : step === "captcha"               ? 1
      : /* totp-setup | totp-verify */     2;

    // ── step 1 ────────────────────────────────────────────────────────────────
    async function handleCredentials(e) {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await api.post("/auth/login", { email, password });
            setTotpEnabled(res.data.totp_enabled);
            setCaptchaText(generateCaptchaText());
            setCaptchaInput("");
            setCaptchaError("");
            setStep("captcha");
        } catch (err) {
            setError(err.response?.data?.detail || "Invalid email or password.");
        } finally {
            setLoading(false);
        }
    }

    // ── step 2 ────────────────────────────────────────────────────────────────
    async function handleCaptcha(e) {
        e.preventDefault();
        setCaptchaError("");

        if (captchaInput.trim().toUpperCase() !== captchaText.toUpperCase()) {
            setCaptchaError("Incorrect. Try again.");
            setCaptchaText(generateCaptchaText());
            setCaptchaInput("");
            return;
        }

        setLoading(true);
        try {
            if (totpEnabled) {
                setTotp("");
                setTotpError("");
                setStep("totp-verify");
                setTimeout(() => hiddenInputRef.current?.focus(), 100);
            } else {
                const res = await api.post("/auth/setup-totp", { email, password });
                setQrBase64(res.data.qr_base64);
                setSecret(res.data.secret);
                setTotp("");
                setTotpError("");
                setStep("totp-setup");
                setTimeout(() => hiddenInputRef.current?.focus(), 100);
            }
        } catch (err) {
            setError(err.response?.data?.detail || "Something went wrong.");
            setStep("credentials");
        } finally {
            setLoading(false);
        }
    }

    // ── step 3 ────────────────────────────────────────────────────────────────
    async function handleVerifyTotp(e) {
        e.preventDefault();
        setTotpError("");
        setLoading(true);
        try {
            const res = await api.post("/auth/verify-totp", { email, code: totp });
            localStorage.setItem("token", res.data.access_token);
            navigate("/dashboard");
        } catch (err) {
            setTotpError(err.response?.data?.detail || "Incorrect code.");
            setTotp("");
            hiddenInputRef.current?.focus();
        } finally {
            setLoading(false);
        }
    }

    function TotpCodeForm({ onSubmit, hint }) {
        return (
            <form onSubmit={onSubmit}>
                <p style={{ textAlign: "center", color: "#555", fontSize: "0.88rem", marginBottom: "16px" }}>
                    {hint}
                </p>
                {totpError && <p className="error">{totpError}</p>}

                {/* ── 6-box display backed by a single hidden input ── */}
                <div
                    style={{ position: "relative", cursor: "text" }}
                    onClick={() => hiddenInputRef.current?.focus()}
                >
                    {/* hidden real input */}
                    <input
                        ref={hiddenInputRef}
                        type="tel"
                        inputMode="numeric"
                        maxLength={6}
                        value={totp}
                        onChange={e => setTotp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        autoFocus
                        autoComplete="one-time-code"
                        style={{
                            position: "absolute",
                            opacity: 0,
                            width: "100%",
                            height: "100%",
                            top: 0, left: 0,
                            cursor: "text",
                            zIndex: 1,
                        }}
                    />

                    {/* visible boxes */}
                    <div className="otp-boxes" style={{ pointerEvents: "none" }}>
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div
                                key={i}
                                className={`otp-box ${totp.length === i ? "otp-box-active" : ""}`}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                {totp[i] || ""}
                            </div>
                        ))}
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading || totp.length < 6}
                    style={{ marginTop: "16px" }}
                >
                    {loading ? "Verifying…" : "Verify Code"}
                </button>
                <p>
                    <span
                        onClick={() => { setStep("captcha"); setTotpError(""); setTotp(""); }}
                        style={{ color: "#65a30d", cursor: "pointer", fontWeight: 600 }}
                    >
                        ← Back
                    </span>
                </p>
            </form>
        );
    }

    return (
        <div className="auth-container">
            <div className="card">

                <BrandLogo />

                {/* step indicator */}
                <div className="step-indicator">
                    {["Credentials", "Verify", "2FA"].map((label, i) => (
                        <div key={label} className="step-item">
                            <div className={`step-dot ${i <= currentIdx ? "active" : ""}`}>
                                {i < currentIdx ? "✓" : i + 1}
                            </div>
                            <span className={`step-label ${i <= currentIdx ? "active" : ""}`}>
                                {label}
                            </span>
                        </div>
                    ))}
                </div>

                {/* ── STEP 1 ── */}
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

                {/* ── STEP 2: Text captcha ── */}
                {step === "captcha" && (
                    <form onSubmit={handleCaptcha}>
                        <h3>Human verification</h3>
                        <p style={{ textAlign: "center", color: "#555", fontSize: "0.85rem", marginBottom: "16px" }}>
                            Type the 4 characters shown below<br />
                            <span style={{ color: "#999", fontSize: "0.78rem" }}>
                                🟢 green = letters &nbsp;·&nbsp; 🔵 blue = numbers &nbsp;·&nbsp; not case-sensitive
                            </span>
                        </p>

                        <CaptchaDisplay text={captchaText} />

                        {captchaError && <p className="error">{captchaError}</p>}

                        <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "16px" }}>
                            <input
                                placeholder="Type the 4 characters above"
                                value={captchaInput}
                                onChange={e => setCaptchaInput(e.target.value)}
                                style={{ marginBottom: 0, flex: 1, textTransform: "uppercase", letterSpacing: "4px", textAlign: "center", fontSize: "1.1rem" }}
                                maxLength={4}
                                autoFocus
                                required
                                autoComplete="off"
                                spellCheck={false}
                            />
                            <button
                                type="button"
                                title="Generate new captcha"
                                onClick={() => {
                                    setCaptchaText(generateCaptchaText());
                                    setCaptchaInput("");
                                    setCaptchaError("");
                                }}
                                style={{
                                    width: "42px", height: "44px", padding: 0,
                                    background: "#f7fee7",
                                    border: "1.5px solid #a3e635",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    fontSize: "1.2rem",
                                    color: "#65a30d",
                                    flexShrink: 0,
                                    lineHeight: 1,
                                }}
                            >
                                ↺
                            </button>
                        </div>

                        <button type="submit" disabled={loading || !captchaInput.trim()}>
                            {loading ? "Loading…" : "Continue"}
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

                {/* ── STEP 3a: First-time TOTP setup ── */}
                {step === "totp-setup" && (
                    <div>
                        <h3>Set up Google Authenticator</h3>
                        <p style={{ textAlign: "center", color: "#555", fontSize: "0.85rem", marginBottom: "16px" }}>
                            Scan this QR code with <strong>Google Authenticator</strong>,
                            then enter the 6-digit code to confirm.
                        </p>
                        {qrBase64 && (
                            <div style={{ textAlign: "center", marginBottom: "14px" }}>
                                <img
                                    src={`data:image/png;base64,${qrBase64}`}
                                    alt="TOTP QR Code"
                                    style={{
                                        width: "180px", height: "180px",
                                        border: "3px solid #a3e635",
                                        borderRadius: "10px",
                                        padding: "6px",
                                        background: "#fff",
                                    }}
                                />
                            </div>
                        )}
                        <details style={{ marginBottom: "14px" }}>
                            <summary style={{ fontSize: "0.8rem", color: "#65a30d", cursor: "pointer", textAlign: "center" }}>
                                Can't scan? Enter key manually
                            </summary>
                            <div style={{
                                background: "#f7fee7", border: "1px solid #a3e635",
                                borderRadius: "6px", padding: "10px", marginTop: "8px",
                                fontFamily: "monospace", fontSize: "0.85rem",
                                wordBreak: "break-all", textAlign: "center",
                                color: "#3f6212", letterSpacing: "2px",
                            }}>
                                {secret}
                            </div>
                        </details>
                        <TotpCodeForm
                            onSubmit={handleVerifyTotp}
                            hint="Enter the 6-digit code shown in your authenticator app."
                        />
                    </div>
                )}

                {/* ── STEP 3b: TOTP verify (returning user) ── */}
                {step === "totp-verify" && (
                    <div>
                        <h3>Two-factor authentication</h3>
                        <TotpCodeForm
                            onSubmit={handleVerifyTotp}
                            hint="Open Google Authenticator and enter the 6-digit code for Secure Vault."
                        />
                    </div>
                )}

            </div>
        </div>
    );
}

export default Login;
