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
            <div style={{ color: "#65a30d", padding: "40px", textAlign: "center" }}>
                Loading...
            </div>
        );

    return (

        <div>

            {/* ── Navbar ── */}
            <nav className="dashboard-navbar">

                {/* Left: lock logo + name */}
                <div className="navbar-logo">
                    <div className="navbar-logo-icon">
                        {/* Lock SVG */}
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                             xmlns="http://www.w3.org/2000/svg">
                            <rect x="5" y="11" width="14" height="10" rx="2"
                                  fill="#1a1a1a"/>
                            <path d="M8 11V7a4 4 0 0 1 8 0v4"
                                  stroke="#1a1a1a" strokeWidth="2"
                                  strokeLinecap="round" fill="none"/>
                            <circle cx="12" cy="16" r="1.5" fill="#a3e635"/>
                        </svg>
                    </div>
                    <span className="navbar-logo-name">
                        Secure <span>Vault</span>
                    </span>
                </div>

                {/* Right: profile + logout */}
                <div className="navbar-profile">

                    <div className="avatar">
                        {user.username.charAt(0).toUpperCase()}
                    </div>

                    <div className="profile-info">
                        <span className="profile-username">{user.username}</span>
                        <span className="profile-email">{user.email}</span>
                    </div>

                    <button className="logout-btn" onClick={logout}>
                        Logout
                    </button>

                </div>

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
