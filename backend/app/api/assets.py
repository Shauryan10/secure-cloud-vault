from io import BytesIO

import hashlib

from fastapi import APIRouter,HTTPException,Depends, File, UploadFile
from fastapi.responses import StreamingResponse
from app.services.s3_service import (
    upload_file as upload_to_s3,
    download_file,
    generate_presigned_url,
    delete_file
)
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

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file selected."
    )
    content = await file.read()
    MAX_FILE_SIZE = 10 * 1024 * 1024

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File size exceeds 10 MB limit."
    )

    ALLOWED_TYPES = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "text/plain"
]

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type."
    )

    sha256 = hashlib.sha256(content).hexdigest()

    storage_key = upload_to_s3(
    BytesIO(content),
    file.filename
)

    asset = VaultAsset(
        owner_id=current_user.id,
        asset_name=file.filename,
        description="Uploaded via API",
        classification="INTERNAL",
        file_size=len(content),
        content_type=file.content_type,
        sha256_hash=sha256,
        storage_key=storage_key,
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

@router.get("/{asset_id}/url")
def get_download_url(
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

    url = generate_presigned_url(asset.storage_key)

    return {
        "download_url": url,
        "expires_in": "5 minutes"
    }
    

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

    obj = download_file(asset.storage_key)

    return StreamingResponse(
        obj["Body"],
        media_type=asset.content_type,
        headers={
            "Content-Disposition":
            f'attachment; filename="{asset.asset_name}"'
    }
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
            detail="Asset does not exist or you don't have permission"
        )

    delete_file(asset.storage_key)

    db.delete(asset)
    db.commit()

    return {
    "message": "Asset deleted successfully",
    "asset_id": asset.id
}