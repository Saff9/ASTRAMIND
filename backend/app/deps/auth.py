# backend/app/deps/auth.py
"""
Authentication dependencies.
FIXED: Admin email check now uses settings.admin_emails property
"""

from datetime import date
from fastapi import Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.security import verify_jwt
from app.db.session import get_db
from app.db.models import User
from core.config import settings

import logging

logger = logging.getLogger(__name__)


async def get_current_user(
    jwt_payload: dict = Depends(verify_jwt),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Get or create user from JWT payload."""

    user_id = jwt_payload.get("sub")
    email = jwt_payload.get("email")

    if not user_id or not email:
        logger.warning("Invalid JWT payload: missing sub or email")
        raise HTTPException(status_code=401, detail="Invalid token")

    # ===== LOOKUP OR CREATE USER =====
    try:
        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

        if user is None:
            logger.info(f"Creating new user: {email}")
            user = User(
                id=user_id,
                auth_id=email,
                email=email,
                daily_quota=settings.PREMIUM_DAILY_QUOTA,
                daily_used=0,
                last_reset=date.today(),
                is_premium=True,
            )
            db.add(user)
            await db.flush()
            await db.commit()
        else:
            # Upgrade existing users to Premium automatically if they aren't already
            needs_update = False
            if not getattr(user, 'is_premium', False):
                user.is_premium = True
                user.daily_quota = settings.PREMIUM_DAILY_QUOTA
                needs_update = True
            elif user.daily_quota < settings.PREMIUM_DAILY_QUOTA:
                user.daily_quota = settings.PREMIUM_DAILY_QUOTA
                needs_update = True
            
            if needs_update:
                await db.commit()
                
            if user.email != email:
                logger.warning(
                    f"Email mismatch for user {user_id}: "
                    f"token={email}, db={user.email}"
                )
                raise HTTPException(status_code=401, detail="Invalid token")

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error looking up user: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Authentication failed")

    # ===== RESET DAILY QUOTA =====
    today = date.today()
    if user.last_reset != today:
        logger.info(f"Resetting quota for {email}")
        user.daily_used = 0
        user.last_reset = today

        try:
            await db.commit()
        except Exception as e:
            await db.rollback()
            logger.error(f"Error resetting quota: {e}")
            raise HTTPException(status_code=500, detail="Quota reset failed")

    # ===== ENFORCE QUOTA =====
    if user.daily_used >= user.daily_quota:
        logger.warning(
            f"Quota exceeded for {email}: {user.daily_used}/{user.daily_quota}"
        )
        raise HTTPException(
            status_code=429,
            detail={
                "error": "Daily quota exceeded",
                "used": user.daily_used,
                "limit": user.daily_quota,
            },
        )

    logger.debug(f"User authenticated: {email} ({user.daily_used}/{user.daily_quota})")
    return user


async def get_admin_user(
    user: User = Depends(get_current_user),
) -> User:
    """
    Verify user is an admin.
    FIXED: Uses settings.admin_emails property (returns list)
    """
    # Use the property which returns a list
    if user.email not in settings.admin_emails:
        logger.warning(f"Admin access denied for: {user.email}")
        raise HTTPException(status_code=403, detail="Admin access required")

    return user
