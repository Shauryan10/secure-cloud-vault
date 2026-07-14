import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import UploadForm from "../components/UploadForm";
import AssetList from "../components/AssetList";

function Dashboard() {

    const [user, setUser]     = useState(null);
    const [assets, setAssets] = useState([]);

    const navigate = useNavigate();

    async function loadAssets() {
        const res = await api.get("/assets/");
        setAssets(res.data);
    }

    useEffect(() => {

        async function loadData() {
            const userRes = await api.get("/auth/me");
            setUser(userRes.data);
            await loadAssets();
        }

        loadData();

    }, []);

    function logout() {
        localStorage.removeItem("token");
        navigate("/");
    }

    if (!user)
        return (
            <div style={{ color: "#a3e635", padding: "40px", textAlign: "center" }}>
                Loading...
            </div>
        );

    return (

        <div>

            {/* ── Navbar ── */}
            <nav className="dashboard-navbar">

                <div className="navbar-profile">

                    <div className="avatar">
                        {user.username.charAt(0).toUpperCase()}
                    </div>

                    <div className="profile-info">
                        <span className="profile-username">{user.username}</span>
                        <span className="profile-email">{user.email}</span>
                    </div>

                </div>

                <span className="navbar-brand">Secure Cloud Vault</span>

                <button className="logout-btn" onClick={logout}>
                    Logout
                </button>

            </nav>

            {/* ── Body ── */}
            <div className="dashboard-body">

                <h2>Your Assets</h2>

                <UploadForm refreshAssets={loadAssets} />

                <AssetList
                    assets={assets}
                    refreshAssets={loadAssets}
                />

            </div>

        </div>

    );

}

export default Dashboard;
