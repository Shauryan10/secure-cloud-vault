import api from "../api/api";

function AssetList({ assets, refreshAssets }) {

    async function deleteAsset(id) {

        if (!window.confirm("Delete this asset?")) return;

        await api.delete(`/assets/${id}`);
        refreshAssets();

    }

    async function downloadAsset(id) {

        try {

            const response = await api.get(`/assets/${id}/download`, {
                responseType: "blob"
            });

            const disposition = response.headers["content-disposition"];
            let filename = "download";

            if (disposition) {
                const match = disposition.match(/filename="(.+)"/);
                if (match) filename = match[1];
            }

            const url  = window.URL.createObjectURL(response.data);
            const link = document.createElement("a");
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

        } catch {
            alert("Download failed");
        }

    }

    if (assets.length === 0) {
        return <p className="empty-state">No assets uploaded yet.</p>;
    }

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
                                onClick={() => downloadAsset(asset.id)}
                            >
                                Download
                            </button>

                            <button
                                className="action-btn delete"
                                onClick={() => deleteAsset(asset.id)}
                            >
                                Delete
                            </button>
                        </td>

                    </tr>
                ))}
            </tbody>

        </table>

    );

}

export default AssetList;
