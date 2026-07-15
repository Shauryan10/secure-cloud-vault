from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    username      = Column(String(100), unique=True, nullable=False)
    email         = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role          = Column(String(20), default="USER")
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    # ── login OTP ────────────────────────────────────────────────────────────
    otp_code        = Column(String(6),  nullable=True)
    otp_expiry      = Column(DateTime(timezone=True), nullable=True)
    otp_attempts    = Column(Integer, default=0, nullable=False)
    otp_locked_until = Column(DateTime(timezone=True), nullable=True)

    # ── forgot-password OTP ──────────────────────────────────────────────────
    reset_otp_code   = Column(String(6),  nullable=True)
    reset_otp_expiry = Column(DateTime(timezone=True), nullable=True)

    assets = relationship("VaultAsset", back_populates="owner")