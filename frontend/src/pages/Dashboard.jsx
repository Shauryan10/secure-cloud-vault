import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import UploadForm from "../components/UploadForm";
import AssetList from "../components/AssetList";

// ── action badge colours ──────────────────────────────────────────────────────
const ACTION_STYLE = {
    UPLOAD:   { background: "#dcfce7", color: "#166534", label: "⬆ Upload" },
    DOWNLOAD: { background: "#dbeafe", color: "#1e40af", label: "⬇ Download" },
    DELETE:   { background: "#fee2e2", color: "#991b1b", label: "✕ Delete" },
};

function ActivityLogTab({ logs, loading }) {
    if (loading) return <p className="empty-state">Loading logs…</p>;
    if (!logs.length) return <p className="empty-state">No activity yet.</p>;

    return (
        <table className="assets-table">
            <thead>
                <tr>
                    <th>Action</th>
                    <th>File</th>
                    <th>Size</th>
                    <th>Type</th>
                    <th>IP</th>
                    <th>Time</th>
                </tr>
            </thead>
            <tbody>
                {logs.map(log => {
                    const style = ACTION_STYLE[log.action] || {};
                    return (
                        <tr key={log.id}>
                            <td>
                                <span style={{
                                    background: style.background,
                                    color: style.color,
                                    padding: "3px 10px",
                                    borderRadius: "999px",
                                    fontSize: "0.78rem",
                                    fontWeight: 700,
                                    whiteSpace: "nowrap",
                                }}>
                                    {style.label}
                                </span>
                            </td>
                            <td style={{ maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {log.asset_name}
                            </td>
                            <td style={{ whiteSpace: "nowrap" }}>
                                {log.file_size != null
                                    ? (log.file_size / 1024).toFixed(1) + " KB"
                                    : "—"}
                            </td>
                            <td style={{ fontSize: "0.8rem", color: "#777" }}>
                                {log.content_type ? log.content_type.split("/")[1] : "—"}
                            </td>
                            <td style={{ fontSize: "0.8rem", color: "#999", fontFamily: "monospace" }}>
                                {log.ip_address || "—"}
                            </td>
                            <td style={{ fontSize: "0.8rem", color: "#555", whiteSpace: "nowrap" }}>
                                {new Date(log.created_at).toLocaleString()}
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}

function Dashboard() {

    const [user, setUser]       = useState(null);
    const [assets, setAssets]   = useState([]);
    const [logs, setLogs]       = useState([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [tab, setTab]         = useState("assets");   // "assets" | "logs"

    const navigate = useNavigate();

    async function loadAssets() {
        const res = await api.get("/assets/");
        setAssets(res.data);
    }

    async function loadLogs() {
        setLogsLoading(true);
        try {
            const res = await api.get("/assets/logs/all");
            setLogs(res.data);
        } finally {
            setLogsLoading(false);
        }
    }

    useEffect(() => {
        async function loadData() {
            const userRes = await api.get("/auth/me");
            setUser(userRes.data);
            await loadAssets();
        }
        loadData();
    }, []);

    // load logs when tab is first opened
    useEffect(() => {
        if (tab === "logs" && logs.length === 0) loadLogs();
    }, [tab]);

    function logout() {
        localStorage.removeItem("token");
        navigate("/");
    }

    if (!user)
        return (
            <div style={{ color: "#65a30d", padding: "40px", textAlign: "center" }}>
                Loading…
            </div>
        );

    return (
        <div>

            {/* ── Navbar ── */}
            <nav className="dashboard-navbar">
                <div className="navbar-logo">
                    <div className="navbar-logo-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <rect x="5" y="11" width="14" height="10" rx="2" fill="#1a1a1a"/>
                            <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" fill="none"/>
                            <circle cx="12" cy="16" r="1.5" fill="#a3e635"/>
                        </svg>
                    </div>
                    <span className="navbar-logo-name">Secure <span>Vault</span></span>
                </div>

                <div className="navbar-profile">
                    <div className="avatar">{user.username.charAt(0).toUpperCase()}</div>
                    <div className="profile-info">
                        <span className="profile-username">{user.username}</span>
                        <span className="profile-email">{user.email}</span>
                    </div>
                    <button className="logout-btn" onClick={logout}>Logout</button>
                </div>
            </nav>

            {/* ── Body ── */}
            <div className="dashboard-body">

                {/* tabs */}
                <div className="dash-tabs">
                    <button
                        className={`dash-tab ${tab === "assets" ? "active" : ""}`}
                        onClick={() => setTab("assets")}
                    >
                        Assets
                    </button>
                    <button
                        className={`dash-tab ${tab === "logs" ? "active" : ""}`}
                        onClick={() => setTab("logs")}
                    >
                        Activity Log
                    </button>
                    {tab === "logs" && (
                        <button
                            className="action-btn download"
                            style={{ marginLeft: "auto", padding: "5px 14px" }}
                            onClick={loadLogs}
                        >
                            ↺ Refresh
                        </button>
                    )}
                </div>

                {tab === "assets" && (
                    <>
                        <UploadForm refreshAssets={loadAssets} />
                        <AssetList assets={assets} refreshAssets={loadAssets} />
                    </>
                )}

                {tab === "logs" && (
                    <ActivityLogTab logs={logs} loading={logsLoading} />
                )}

            </div>
        </div>
    );
}

export default Dashboard;
