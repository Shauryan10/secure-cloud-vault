from pydantic import BaseModel
from datetime import datetime


class AssetResponse(BaseModel):
    id: int
    asset_name: str
    description: str | None = None
    classification: str
    file_size: int
    content_type: str
    sha256_hash: str
    version: int
    status: str
    integrity_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True