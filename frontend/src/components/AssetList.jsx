import api from "../api/api";

function AssetList({ assets, refreshAssets }) {

    async function deleteAsset(id) {

        if (!window.confirm("Delete this asset?"))
            return;

        await api.delete(`/assets/${id}`);

        refreshAssets();
    }

    async function downloadAsset(id) {
        try {
    
            const response = await api.get(
                `/assets/${id}/download`,
                {
                    responseType: "blob"
                }
            );
    
            const disposition = response.headers["content-disposition"];
    
            let filename = "download";
    
            if (disposition) {
                const match = disposition.match(/filename="(.+)"/);
                if (match) {
                    filename = match[1];
                }
            }
    
            const url = window.URL.createObjectURL(response.data);
    
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

    return (

        <table border="1" cellPadding="8">

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

                        <td>{asset.file_size} bytes</td>

                        <td>{asset.classification}</td>

                        <td>

                            <button
                                onClick={() => downloadAsset(asset.id)}
                            >
                                Download
                            </button>

                            <button
                                onClick={() => deleteAsset(asset.id)}
                                style={{ marginLeft: "10px" }}
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