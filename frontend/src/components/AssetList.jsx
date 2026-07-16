import { useState } from "react";
import api from "../api/api";

function AssetList({ assets, refreshAssets, showToast }) {

    const [confirmId, setConfirmId] = useState(null); // asset id awaiting confirm

    async function deleteAsset(id, name) {
        // instead of window.confirm, show inline confirm state
        if (confirmId !== id) {
            setConfirmId(id);
            return;
        }
        // second click = confirmed
        setConfirmId(null);
        try {
            await api.delete(`/assets/${id}`);
            refreshAssets();
            showToast(`"${name}" deleted successfully.`, "success");
        } catch {
            showToast("Delete failed. Please try again.", "error");
        }
    }

    async function downloadAsset(id, name) {
        try {
            const response = await api.get(`/assets/${id}/download`, {
                responseType: "blob"
            });

            const disposition = response.headers["content-disposition"];
            let filename = name || "download";
            if (disposition) {
                const match = disposition.match(/filename="(.+)"/);
                if (match) filename = match[1];
            }

            const url  = window.URL.createObjectURL(response.data);
            const link = document.createElement("a");
            link.href     = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            showToast(`"${filename}" downloaded.`, "success");

        } catch {
            showToast("Download failed. Please try again.", "error");
        }
    }

    if (assets.length === 0)
        return <p className="empty-state">No assets uploaded yet.</p>;

    return (
        <table className="assets-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Size</th>
                    <th>Classification</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {assets.map(asset => (
                    <tr key={asset.id}>
                        <td>{asset.asset_name}</td>
                        <td>{(asset.file_size / 1024).toFixed(1)} KB</td>
                        <td>{asset.classification}</td>
                        <td>
                            <button
                                className="action-btn download"
                                onClick={() => downloadAsset(asset.id, asset.asset_name)}
                            >
                                Download
                            </button>

                            {confirmId === asset.id ? (
                                /* inline confirm row */
                                <>
                                    <span style={{ fontSize: "0.8rem", color: "#991b1b", fontWeight: 600, marginRight: "6px" }}>
                                        Sure?
                                    </span>
                                    <button
                                        className="action-btn delete"
                                        style={{ background: "#ef4444", color: "#fff", marginRight: "4px" }}
                                        onClick={() => deleteAsset(asset.id, asset.asset_name)}
                                    >
                                        Yes, delete
                                    </button>
                                    <button
                                        className="action-btn"
                                        style={{ border: "1px solid #aaa", color: "#555", background: "transparent" }}
                                        onClick={() => setConfirmId(null)}
                                    >
                                        Cancel
                                    </button>
                                </>
                            ) : (
                                <button
                                    className="action-btn delete"
                                    onClick={() => deleteAsset(asset.id, asset.asset_name)}
                                >
                                    Delete
                                </button>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

export default AssetList;
