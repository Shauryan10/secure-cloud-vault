import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/api";
import BrandLogo from "../components/BrandLogo";
import PasswordInput from "../components/PasswordInput";
import AuthLayout from "../components/AuthLayout";

// ── password rule checker ─────────────────────────────────────────────────────
const rules = [
    { id: "len",     label: "At least 8 characters",              test: p => p.length >= 8 },
    { id: "upper",   label: "At least one uppercase letter (A-Z)", test: p => /[A-Z]/.test(p) },
    { id: "lower",   label: "At least one lowercase letter (a-z)", test: p => /[a-z]/.test(p) },
    { id: "special", label: "At least one special character (@#$!%&…)", test: p => /[^A-Za-z0-9]/.test(p) },
];

function PasswordStrength({ password }) {
    const passed = rules.filter(r => r.test(password)).length;
    const pct    = (passed / rules.length) * 100;

    const color =
        passed === 0 ? "#e5e7eb"
      : passed <= 1  ? "#f87171"
      : passed <= 2  ? "#fbbf24"
      : passed <= 3  ? "#60a5fa"
      :                "#a3e635";

    const label =
        passed === 0 ? ""
      : passed <= 1  ? "Weak"
      : passed <= 2  ? "Fair"
      : passed <= 3  ? "Good"
      :                "Strong";

    return (
        <div className="pw-strength-wrapper">
            {/* strength bar */}
            <div className="pw-bar-track">
                <div className="pw-bar-fill" style={{ width: `${pct}%`, background: color }} />
            </div>
            {label && <span className="pw-bar-label" style={{ color }}>{label}</span>}

            {/* rule checklist */}
            <ul className="pw-rules">
                {rules.map(r => {
                    const ok = r.test(password);
                    return (
                        <li key={r.id} className={`pw-rule ${ok ? "ok" : "pending"}`}>
                            <span className="pw-rule-icon">{ok ? "✓" : "○"}</span>
                            {r.label}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

function Register() {

    const navigate = useNavigate();

    const [username, setUsername]   = useState("");
    const [email, setEmail]         = useState("");
    const [password, setPassword]   = useState("");
    const [confirm, setConfirm]     = useState("");
    const [showRules, setShowRules] = useState(false);
    const [error, setError]         = useState("");
    const [loading, setLoading]     = useState(false);

    const allRulesPassed = rules.every(r => r.test(password));

    async function handleRegister(e) {
        e.preventDefault();
        setError("");

        if (!allRulesPassed) {
            setError("Password does not meet the security requirements.");
            return;
        }

        if (password !== confirm) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            await api.post("/auth/register", { username, email, password });
            navigate("/");
        } catch (err) {
            setError(err.response?.data?.detail || "Registration failed. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthLayout>
            <form className="card" style={{ width: "100%", maxWidth: "400px", boxShadow: "none" }} onSubmit={handleRegister}>

                <BrandLogo />
                <h3>Create a new account</h3>

                {error && <p className="error">{error}</p>}

                <input
                    placeholder="Username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                />

                <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                />

                <PasswordInput
                    placeholder="Password"
                    value={password}
                    onChange={e => {
                        setPassword(e.target.value);
                        setShowRules(true);
                    }}
                    onFocus={() => setShowRules(true)}
                    required
                />

                {/* live password strength shown as soon as user types */}
                {showRules && <PasswordStrength password={password} />}

                <PasswordInput
                    placeholder="Confirm Password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    style={{ marginTop: showRules ? "8px" : "0" }}
                />

                <button type="submit" disabled={loading || !allRulesPassed}>
                    {loading ? "Creating account…" : "Register"}
                </button>

                <p>
                    Already have an account?{" "}
                    <Link to="/">Sign in</Link>
                </p>

            </form>
        </AuthLayout>
    );
}

export default Register;
