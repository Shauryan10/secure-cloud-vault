import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/api";

function Login() {

    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError]       = useState("");

    async function handleLogin(e) {

        e.preventDefault();
        setError("");

        try {

            const form = new URLSearchParams();
            form.append("username", username);
            form.append("password", password);

            const res = await api.post(
                "/auth/login",
                form,
                {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    }
                }
            );

            localStorage.setItem("token", res.data.access_token);
            navigate("/dashboard");

        } catch {

            setError("Invalid username or password.");

        }

    }

    return (

        <div className="auth-container">

            <form className="card" onSubmit={handleLogin}>

                <h1>Secure Cloud Vault</h1>
                <h3>Sign in to your account</h3>

                {error && <p className="error">{error}</p>}

                <input
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                />

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />

                <button type="submit">Login</button>

                <p>
                    Don't have an account?{" "}
                    <Link to="/register">Register here</Link>
                </p>

            </form>

        </div>

    );

}

export default Login;
