from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    BigInteger,
    ForeignKey,
    Boolean
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class VaultAsset(Base):
    __tablename__ = "vault_assets"

    id = Column(Integer, primary_key=True, index=True)

    # Owner of the asset
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Asset Details
    asset_name = Column(String(255), nullable=False)
    description = Column(String(500))
    classification = Column(String(50), nullable=False)

    # File Metadata
    file_size = Column(BigInteger, nullable=False)
    content_type = Column(String(100), nullable=False)

    # Security
    sha256_hash = Column(String(64), nullable=False)
    encryption_key_id = Column(String(255), nullable=True)

    # Storage
    storage_key = Column(String(255), nullable=False)

    # Versioning
    version = Column(Integer, default=1)

    # Asset Status
    status = Column(String(20), default="ACTIVE")

    # Integrity Check
    integrity_verified = Column(Boolean, default=True)

    # Audit Fields
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    # Relationship
    owner = relationship("User", back_populates="assets")