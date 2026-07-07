from pathlib import Path
import hashlib
import shutil

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.asset import VaultAsset
from app.models.user import User
from app.security.dependencies import get_current_user

router = APIRouter(
    prefix="/assets",
    tags=["Assets"]
)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    file_path = UPLOAD_DIR / file.filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    sha256 = hashlib.sha256()

    with open(file_path, "rb") as f:
        while chunk := f.read(8192):
            sha256.update(chunk)

    asset = VaultAsset(
        owner_id=current_user.id,
        asset_name=file.filename,
        description="Uploaded via API",
        classification="INTERNAL",
        file_size=file_path.stat().st_size,
        content_type=file.content_type,
        sha256_hash=sha256.hexdigest(),
        storage_key=str(file_path),
    )

    db.add(asset)
    db.commit()
    db.refresh(asset)

    return {
        "message": "File uploaded successfully",
        "asset_id": asset.id,
        "sha256": asset.sha256_hash,
    }