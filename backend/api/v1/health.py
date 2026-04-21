# backend/app/api/v1/health.py

from fastapi import APIRouter
from datetime import datetime, timezone

router = APIRouter(tags=["health"])

@router.get("/health")
async def health():
    """
    Public health endpoint.
    Used by frontend and uptime monitors.
    """

    # This can later check provider availability
    return {
        "status": "ok",            # ok | degraded | down
        "ai": "operational",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
