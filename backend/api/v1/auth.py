# backend/app/api/v1/auth.py
"""
Authentication endpoint - JWT token generation and user management
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import date

from app.db.session import get_db
from app.db.models import User
from core.security import create_access_token
from core.config import settings
from app.deps.auth import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


# ===== REQUEST/RESPONSE MODELS =====

class LoginRequest(BaseModel):
    """Email login request"""
    email: EmailStr = Field(
        ...,
        description="User email address",
        json_schema_extra={"example": "user@example.com"},
    )


class TokenResponse(BaseModel):
    """JWT token response"""
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(default=86400, description="Seconds until expiry")
    user: dict = Field(..., description="User information")


class UserInfoResponse(BaseModel):
    """User information response"""
    id: int
    email: str
    daily_quota: int
    daily_used: int
    remaining: int
    is_admin: bool
    created_at: str


# ===== ENDPOINTS =====

@router.post(
    "/login",
    response_model=TokenResponse,
    summary="User login with email",
    description="Generate JWT token for user (creates account if new)"
)
async def login(
    request: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Login endpoint - handles both new and existing users.
    
    Args:
        request: LoginRequest with email
        db: Database session
    
    Returns:
        TokenResponse with JWT token
    
    Raises:
        400: Invalid email format
        500: Database error
    """
    
    email = request.email.lower().strip()
    
    logger.info(f"🔐 Login attempt: {email}")
    
    try:
        # ===== LOOKUP OR CREATE USER =====
        stmt = select(User).where(User.email == email)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if user is None:
            # New user - create account with tier-based quota
            is_admin = email in settings.admin_emails
            
            # Determine quota based on role
            if is_admin:
                quota = settings.ADMIN_DAILY_QUOTA
                logger.info(f"✅ Creating admin user: {email} (quota: {quota})")
            else:
                quota = settings.USER_DAILY_QUOTA
                logger.info(f"✅ Creating regular user: {email} (quota: {quota})")
            
            user = User(
                email=email,
                auth_id=email,  # NextAuth uses email as unique ID
                daily_quota=quota,
                daily_used=0,
                last_reset=date.today(),
                is_admin=is_admin,
            )
            db.add(user)
            await db.flush()  # Get user.id
            await db.commit()
        else:
            # Existing user - verify
            logger.debug(f"✅ Found existing user: {email}")
            
            # Reset quota if new day
            today = date.today()
            if user.last_reset != today:
                logger.info(f"🔄 Resetting quota for {email}")
                
                # Update quota if user role changed or tiers enabled
                if settings.ENABLE_QUOTA_TIERS:
                    if user.is_admin and user.daily_quota != settings.ADMIN_DAILY_QUOTA:
                        user.daily_quota = settings.ADMIN_DAILY_QUOTA
                    elif not user.is_admin and user.daily_quota != settings.USER_DAILY_QUOTA:
                        user.daily_quota = settings.USER_DAILY_QUOTA
                
                user.daily_used = 0
                user.last_reset = today
                await db.commit()
        
        # ===== CREATE JWT TOKEN =====
        access_token = create_access_token(
            subject=str(user.id),
            email=user.email,
        )
        
        logger.info(f"🎫 Token created for user: {email}")
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.JWT_EXPIRATION_HOURS * 3600,
            user={
                "id": user.id,
                "email": user.email,
                "daily_quota": user.daily_quota,
                "daily_used": user.daily_used,
                "is_admin": user.is_admin,
            }
        )
    
    except Exception as e:
        logger.error(f"❌ Login error for {email}: {e}", exc_info=True)
        if db is not None:
            await db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Authentication failed. Please try again."
        )


@router.get(
    "/me",
    response_model=UserInfoResponse,
    summary="Get current user info",
    description="Returns authenticated user's information and quota"
)
async def get_user_info(
    user: User = Depends(get_current_user),
):
    """
    Get current user information.
    
    Requires: Authorization header with valid JWT token
    """
    return UserInfoResponse(
        id=user.id,
        email=user.email,
        daily_quota=user.daily_quota,
        daily_used=user.daily_used,
        remaining=max(0, user.daily_quota - user.daily_used),
        is_admin=user.is_admin,
        created_at=user.created_at.isoformat(),
    )


@router.post(
    "/logout",
    summary="User logout",
    description="Invalidates token (frontend should delete localStorage token)"
)
async def logout(
    user: User = Depends(get_current_user),
):
    """
    Logout endpoint - frontend should delete stored token.
    
    This is mainly for frontend to know logout was successful.
    JWT invalidation happens client-side by deleting the token.
    """
    logger.info(f"👋 Logout: {user.email}")
    
    return {
        "status": "success",
        "message": "Logged out successfully",
        "instruction": "Delete your stored JWT token"
    }


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh JWT token",
    description="Get a new token using current credentials"
)
async def refresh_token(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a new JWT token.
    
    Useful when current token is about to expire.
    """
    
    # Verify user still exists
    stmt = select(User).where(User.id == user.id)
    result = await db.execute(stmt)
    current_user = result.scalar_one_or_none()
    
    if not current_user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Create new token
    access_token = create_access_token(
        subject=str(current_user.id),
        email=current_user.email,
    )
    
    logger.info(f"🔄 Token refreshed for: {current_user.email}")
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.JWT_EXPIRATION_HOURS * 3600,
        user={
            "id": current_user.id,
            "email": current_user.email,
            "daily_quota": current_user.daily_quota,
            "daily_used": current_user.daily_used,
            "is_admin": current_user.is_admin,
        }
    )
