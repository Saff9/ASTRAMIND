# backend/app/services/status_service.py

from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.provider_status import ProviderStatus

def update_status(db: Session, provider: str, status: str):
    record = db.get(ProviderStatus, provider)

    if not record:
        record = ProviderStatus(provider=provider)

    record.status = status
    record.last_checked = datetime.now(timezone.utc)

    if status == "down":
        record.uptime = max(record.uptime - 0.1, 0)
    elif status == "operational":
        record.uptime = min(record.uptime + 0.02, 100)

    db.add(record)
    db.commit()
