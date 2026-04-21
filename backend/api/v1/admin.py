# backend/app/api/v1/admin.py
# Admin-only endpoints (read-only)

from fastapi import APIRouter, Depends, HTTPException
from app.deps.auth import get_current_user
from core.config import settings
from app.db.models import User
from datetime import datetime, timezone

router = APIRouter(prefix="/admin", tags=["admin"])

def require_admin(user: User):
    if user.email not in settings.ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Forbidden")

@router.get("/overview")
async def overview(user: User = Depends(get_current_user)):
    require_admin(user)

    return {
        "service": "ASTRAMIND",
        "status": "operational",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "notes": "All systems nominal"
    }
