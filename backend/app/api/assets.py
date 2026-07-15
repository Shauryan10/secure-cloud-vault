from io import BytesIO
import hashlib

from fastapi import APIRouter, HTTPException, Depends, File, UploadFile, Request
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
from app.models.activity_log import ActivityLog
from app.security.dependencies import get_current_user


router = APIRouter(
    prefix="/assets",
    tags=["Assets"]
)


# ── helper ────────────────────────────────────────────────────────────────────

def _log(
    db: Session,
    user: User,
    action: str,
    asset_name: str,
    file_size: int | None = None,
    content_type: str | None = None,
    ip: str | None = None,
):
    db.add(ActivityLog(
        user_id=user.id,
        action=action,
        asset_name=asset_name,
        file_size=file_size,
        content_type=content_type,
        ip_address=ip,
    ))
    db.commit()


def _ip(request: Request) -> str | None:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


# ── upload ────────────────────────────────────────────────────────────────────

@router.post("/upload")
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected.")

    content = await file.read()

    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 10 MB limit.")

    ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg", "text/plain"]
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported file type.")

    sha256 = hashlib.sha256(content).hexdigest()

    try:
        storage_key = upload_to_s3(BytesIO(content), file.filename)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to upload file to storage: {str(e)}")

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

    _log(db, current_user, "UPLOAD", file.filename, len(content), file.content_type, _ip(request))

    return {
        "message": "Asset uploaded successfully",
        "asset_id": asset.id,
        "asset_name": asset.asset_name,
        "classification": asset.classification,
        "sha256": asset.sha256_hash,
    }


# ── list ──────────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[AssetResponse])
def get_my_assets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return (
        db.query(VaultAsset)
        .filter(VaultAsset.owner_id == current_user.id)
        .all()
    )


# ── single asset ──────────────────────────────────────────────────────────────

@router.get("/{asset_id}", response_model=AssetResponse)
def get_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    asset = (
        db.query(VaultAsset)
        .filter(VaultAsset.id == asset_id, VaultAsset.owner_id == current_user.id)
        .first()
    )
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset


# ── presigned URL ─────────────────────────────────────────────────────────────

@router.get("/{asset_id}/url")
def get_download_url(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    asset = (
        db.query(VaultAsset)
        .filter(VaultAsset.id == asset_id, VaultAsset.owner_id == current_user.id)
        .first()
    )
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    url = generate_presigned_url(asset.storage_key)
    return {"download_url": url, "expires_in": "5 minutes"}


# ── download ──────────────────────────────────────────────────────────────────

@router.get("/{asset_id}/download")
def download_asset(
    asset_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    asset = (
        db.query(VaultAsset)
        .filter(VaultAsset.id == asset_id, VaultAsset.owner_id == current_user.id)
        .first()
    )
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    obj = download_file(asset.storage_key)

    _log(db, current_user, "DOWNLOAD", asset.asset_name, asset.file_size, asset.content_type, _ip(request))

    return StreamingResponse(
        obj["Body"],
        media_type=asset.content_type,
        headers={"Content-Disposition": f'attachment; filename="{asset.asset_name}"'}
    )


# ── delete ────────────────────────────────────────────────────────────────────

@router.delete("/{asset_id}")
def delete_asset(
    asset_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    asset = (
        db.query(VaultAsset)
        .filter(VaultAsset.id == asset_id, VaultAsset.owner_id == current_user.id)
        .first()
    )
    if not asset:
        raise HTTPException(status_code=404, detail="Asset does not exist or you don't have permission")

    name         = asset.asset_name
    file_size    = asset.file_size
    content_type = asset.content_type

    delete_file(asset.storage_key)
    db.delete(asset)
    db.commit()

    _log(db, current_user, "DELETE", name, file_size, content_type, _ip(request))

    return {"message": "Asset deleted successfully", "asset_id": asset_id}


# ── activity logs ─────────────────────────────────────────────────────────────

@router.get("/logs/all")
def get_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    logs = (
        db.query(ActivityLog)
        .filter(ActivityLog.user_id == current_user.id)
        .order_by(ActivityLog.created_at.desc())
        .limit(200)
        .all()
    )
    return [
        {
            "id":           l.id,
            "action":       l.action,
            "asset_name":   l.asset_name,
            "file_size":    l.file_size,
            "content_type": l.content_type,
            "ip_address":   l.ip_address,
            "created_at":   l.created_at.isoformat(),
        }
        for l in logs
    ]
