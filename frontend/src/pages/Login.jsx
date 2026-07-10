import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";

function Login() {

    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    async function handleLogin(e) {

        e.preventDefault();

        try {

            const form = new URLSearchParams();

            form.append("username", username);
            form.append("password", password);

            const res = await api.post(
                "/auth/login",
                form,
                {
                    headers: {
                        "Content-Type":
                        "application/x-www-form-urlencoded"
                    }
                }
            );

            localStorage.setItem(
                "token",
                res.data.access_token
            );

            navigate("/dashboard");

        } catch (err) {

            alert("Invalid Credentials");

        }

    }

    return (

        <div
            style={{
                display: "flex",
                justifyContent: "center",
                marginTop: "100px"
            }}
        >

            <form onSubmit={handleLogin}>

                <h2>Secure Cloud Vault</h2>

                <input
                    placeholder="Username"
                    value={username}
                    onChange={(e)=>setUsername(e.target.value)}
                />

                <br/><br/>

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e)=>setPassword(e.target.value)}
                />

                <br/><br/>

                <button>

                    Login

                </button>

            </form>

        </div>

    );

}

export default Login;