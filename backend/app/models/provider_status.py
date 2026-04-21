# backend/app/models/provider_status.py

from sqlalchemy import Column, String, Float, DateTime
from app.db.base import Base
from datetime import datetime, timezone

class ProviderStatus(Base):
    __tablename__ = "provider_status"

    provider = Column(String, primary_key=True, index=True)
    status = Column(String, default="operational")  # operational | degraded | down
    uptime = Column(Float, default=100.0)
    last_checked = Column(DateTime, default=lambda: datetime.now(timezone.utc))
