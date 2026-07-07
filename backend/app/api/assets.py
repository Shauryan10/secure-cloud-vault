from pathlib import Path
import os
import hashlib
import shutil
from fastapi.responses import FileResponse
from fastapi import APIRouter,HTTPException,Depends, File, UploadFile
from sqlalchemy.orm import Session
from app.schemas.asset import AssetResponse
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
    "message": "Asset uploaded successfully",
    "asset_id": asset.id,
    "asset_name": asset.asset_name,
    "classification": asset.classification,
    "sha256": asset.sha256_hash,
}

@router.get("/", response_model=list[AssetResponse])
def get_my_assets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    assets = (
        db.query(VaultAsset)
        .filter(VaultAsset.owner_id == current_user.id)
        .all()
    )

    return assets

@router.get("/{asset_id}", response_model=AssetResponse)
def get_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    asset = (
        db.query(VaultAsset)
        .filter(
            VaultAsset.id == asset_id,
            VaultAsset.owner_id == current_user.id
        )
        .first()
    )

    if not asset:
        raise HTTPException(
            status_code=404,
            detail="Asset not found"
        )

    return asset

@router.get("/{asset_id}/download")
def download_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    asset = (
        db.query(VaultAsset)
        .filter(
            VaultAsset.id == asset_id,
            VaultAsset.owner_id == current_user.id
        )
        .first()
    )

    if not asset:
        raise HTTPException(
            status_code=404,
            detail="Asset not found"
        )

    return FileResponse(
        asset.storage_key,
        filename=asset.asset_name,
        media_type=asset.content_type
    )
@router.delete("/{asset_id}")
def delete_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    asset = (
        db.query(VaultAsset)
        .filter(
            VaultAsset.id == asset_id,
            VaultAsset.owner_id == current_user.id
        )
        .first()
    )

    if not asset:
        raise HTTPException(
            status_code=404,
            detail="Asset not found"
        )

    if os.path.exists(asset.storage_key):
        os.remove(asset.storage_key)

    db.delete(asset)
    db.commit()

    return {
    "message": "Asset deleted successfully",
    "asset_id": asset.id
}