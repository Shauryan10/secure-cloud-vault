from sqlalchemy import Column, Integer, String, DateTime, BigInteger, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=False)
    action      = Column(String(20),  nullable=False)   # UPLOAD | DOWNLOAD | DELETE
    asset_name  = Column(String(255), nullable=False)
    file_size   = Column(BigInteger,  nullable=True)     # NULL for DELETE
    content_type = Column(String(100), nullable=True)
    ip_address  = Column(String(45),  nullable=True)
    created_at  = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    user = relationship("User")
