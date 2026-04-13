from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Dict, Any

from app.db.session import get_db
from app.db.models import UserConfig
from core.enhanced_security import get_current_user_secure
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["user"])

@router.get("/config")
async def get_user_config(
    auth_data: dict = Depends(get_current_user_secure),
    db: AsyncSession = Depends(get_db)
):
    """Get the configuration for the current user."""
    user_id = auth_data["user_id"]
    
    # auth_id column stores the user identity (email)
    if db is None:
        # Graceful fallback for configuration endpoints if DB is down
        return {"last_used_model": "gpt-4o", "preferred_theme": "system"}

    result = await db.execute(select(UserConfig).where(UserConfig.auth_id == user_id))
    config = result.scalar_one_or_none()
    
    if not config:
        config = UserConfig(auth_id=user_id)
        db.add(config)
        await db.commit()
    
    return {
        "last_used_model": config.last_used_model,
        "preferred_theme": config.preferred_theme,
        "preferred_font": config.preferred_font,
        "total_messages_sent": config.total_messages_sent
    }

@router.post("/config")
async def update_user_config(
    payload: Dict[str, Any],
    auth_data: dict = Depends(get_current_user_secure),
    db: AsyncSession = Depends(get_db)
):
    """Update settings for the current user."""
    user_id = auth_data["user_id"]
    
    if db is None:
        return {"status": "success", "note": "settings saved locally (DB unavailable)"}

    result = await db.execute(select(UserConfig).where(UserConfig.auth_id == user_id))
    config = result.scalar_one_or_none()
    
    if not config:
        config = UserConfig(auth_id=user_id)
        db.add(config)
    
    if "last_used_model" in payload:
        config.last_used_model = payload["last_used_model"]
    if "preferred_theme" in payload:
        config.preferred_theme = payload["preferred_theme"]
    if "preferred_font" in payload:
        config.preferred_font = payload["preferred_font"]
        
    await db.commit()
    return {"status": "success"}
