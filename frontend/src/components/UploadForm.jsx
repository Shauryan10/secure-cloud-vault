import { useState } from "react";
import api from "../api/api";

function UploadForm({ refreshAssets }) {

    const [file, setFile] = useState(null);

    async function upload() {

        if (!file) {
            alert("Choose a file first.");
            return;
        }

        const formData = new FormData();
        formData.append("file", file);

        try {

            await api.post("/assets/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            setFile(null);
            // reset the file input visually
            document.getElementById("file-input").value = "";
            refreshAssets();

        } catch (err) {

            const detail = err.response?.data?.detail;
            alert("Upload failed: " + (detail || "Unknown error"));

        }

    }

    return (

        <div className="upload-row">

            <input
                id="file-input"
                type="file"
                onChange={(e) => setFile(e.target.files[0])}
            />

            <button className="upload-btn" onClick={upload}>
                Upload
            </button>

        </div>

    );

}

export default UploadForm;
