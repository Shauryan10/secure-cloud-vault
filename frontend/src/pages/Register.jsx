import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/api";

function Register() {

    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [email, setEmail]       = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm]   = useState("");
    const [error, setError]       = useState("");

    async function handleRegister(e) {

        e.preventDefault();
        setError("");

        if (password !== confirm) {
            setError("Passwords do not match.");
            return;
        }

        try {

            await api.post("/auth/register", {
                username,
                email,
                password
            });

            navigate("/");

        } catch (err) {

            const detail = err.response?.data?.detail;
            setError(detail || "Registration failed. Please try again.");

        }

    }

    return (

        <div className="auth-container">

            <form className="card" onSubmit={handleRegister}>

                <h1>Secure Cloud Vault</h1>
                <h3>Create a new account</h3>

                {error && <p className="error">{error}</p>}

                <input
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                />

                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />

                <input
                    type="password"
                    placeholder="Confirm Password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                />

                <button type="submit">Register</button>

                <p>
                    Already have an account?{" "}
                    <Link to="/">Sign in</Link>
                </p>

            </form>

        </div>

    );

}

export default Register;
