from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.db.models import UserConfig
from core.enhanced_security import get_current_user_secure
from pydantic import BaseModel

router = APIRouter()


class UserConfigUpdate(BaseModel):
    last_used_model: str | None = None
    preferred_theme: str | None = None
    preferred_font: str | None = None


@router.get("/config", summary="Get user configuration")
async def get_user_config(
    auth_data: dict = Depends(get_current_user_secure),
    db: AsyncSession = Depends(get_db)
):
    # clerk_id column stores the NextAuth user identity (email)
    user_id = auth_data.get("user_id", "anonymous")

    if db is None:
        return {"last_used_model": "fast", "preferred_theme": "system", "preferred_font": "var(--font-fira)", "total_messages_sent": 0}

    result = await db.execute(select(UserConfig).where(UserConfig.clerk_id == user_id))
    config = result.scalar_one_or_none()

    if not config:
        config = UserConfig(clerk_id=user_id)
        db.add(config)
        await db.commit()
        await db.refresh(config)

    return {
        "last_used_model": config.last_used_model,
        "preferred_theme": config.preferred_theme,
        "preferred_font": config.preferred_font,
        "total_messages_sent": config.total_messages_sent
    }


@router.patch("/config", summary="Update user configuration")
async def update_user_config(
    payload: UserConfigUpdate,
    auth_data: dict = Depends(get_current_user_secure),
    db: AsyncSession = Depends(get_db)
):
    user_id = auth_data.get("user_id", "anonymous")

    if db is None:
        return {"status": "ok", "note": "DB unavailable, config not persisted"}

    result = await db.execute(select(UserConfig).where(UserConfig.clerk_id == user_id))
    config = result.scalar_one_or_none()

    if not config:
        config = UserConfig(clerk_id=user_id)
        db.add(config)

    if payload.last_used_model is not None:
        config.last_used_model = payload.last_used_model
    if payload.preferred_theme is not None:
        config.preferred_theme = payload.preferred_theme
    if payload.preferred_font is not None:
        config.preferred_font = payload.preferred_font

    await db.commit()
    return {"status": "success"}
