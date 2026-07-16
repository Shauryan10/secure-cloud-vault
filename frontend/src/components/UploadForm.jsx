import { useState } from "react";
import api from "../api/api";

function UploadForm({ refreshAssets, showToast }) {

    const [file, setFile]       = useState(null);
    const [loading, setLoading] = useState(false);

    async function upload() {

        if (!file) {
            showToast("Please choose a file first.", "warn");
            return;
        }

        const formData = new FormData();
        formData.append("file", file);

        setLoading(true);
        try {
            await api.post("/assets/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            setFile(null);
            document.getElementById("file-input").value = "";
            refreshAssets();
            showToast(`"${file.name}" uploaded successfully.`, "success");

        } catch (err) {
            const detail = err.response?.data?.detail || "Unknown error";
            showToast(`Upload failed: ${detail}`, "error");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="upload-row">
            <input
                id="file-input"
                type="file"
                onChange={e => setFile(e.target.files[0])}
            />
            <button className="upload-btn" onClick={upload} disabled={loading}>
                {loading ? "Uploading…" : "Upload"}
            </button>
        </div>
    );
}

export default UploadForm;
