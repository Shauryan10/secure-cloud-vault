import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import UploadForm from "../components/UploadForm";
import AssetList from "../components/AssetList";

function Dashboard() {

    const [user, setUser] = useState(null);
    const [assets, setAssets] = useState([]);

    async function loadAssets() {

        const res = await api.get("/assets");

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

    const navigate = useNavigate();

    function logout() {
        localStorage.removeItem("token");
        navigate("/");
    }   

    if (!user)
        return <h2>Loading...</h2>;

    return (

        <div style={{ padding: "30px" }}>

            <h1>Secure Cloud Vault</h1>

            <h3>Welcome {user.username}</h3>

            <p>{user.email}</p>

            <button onClick={logout}>
                Logout
            </button>

            <hr />

            <UploadForm refreshAssets={loadAssets} />

            <AssetList
                assets={assets}
                refreshAssets={loadAssets}
            />

        </div>

    );

}

export default Dashboard;