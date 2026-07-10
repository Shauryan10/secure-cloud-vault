    import { useState } from "react";
    import api from "../api/api";

    function UploadForm({ refreshAssets }) {

        const [file, setFile] = useState(null);

        async function upload() {

            if (!file) {
                alert("Choose a file");
                return;
            }

            const formData = new FormData();
            formData.append("file", file);

            try {

                await api.post(
                    "/assets/upload",
                    formData,
                    {
                        headers: {
                            "Content-Type": "multipart/form-data"
                        }
                    }
                );

                alert("Upload Successful");

                setFile(null);

                refreshAssets();

            } catch {

                alert("Upload Failed");

            }

        }

        return (

            <div style={{marginBottom:"25px"}}>

                <input
                    type="file"
                    onChange={(e)=>setFile(e.target.files[0])}
                />

                <button
                    onClick={upload}
                    style={{marginLeft:"10px"}}
                >
                    Upload
                </button>

            </div>

        );

    }

    export default UploadForm;