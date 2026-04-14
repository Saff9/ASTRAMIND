# backend/api/v1/chat.py
"""
ASTRAMIND Chat API - Production-ready streaming chat endpoint.
"""

from fastapi import APIRouter, Depends, Request, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Literal, Dict, List

from core.enhanced_security import (
    get_current_user_secure,
    validate_prompt_security,
    validate_model_access,
    log_security_event
)
from core.astramind_ai_personality import AstraMindPersonalityEngine
from app.db.session import get_db
from services.ai_router import AIRouter
from services.stream import stream_response
from services.models import resolve_model
from services.prompts import sanitize_prompt
from core.config import settings
from core.content_filter import content_filter
from core.stability_engine import stability_engine
from app.db.models import User
import logging
import time
from core.version import APP_VERSION

logger = logging.getLogger(__name__)

router = APIRouter(tags=["chat"])

# ===== BACKGROUND TASKS =====

async def atomic_increment_quota(user_id: int, db: AsyncSession) -> bool:
    """
    Atomically increment user quota usage in a single DB round-trip.

    Returns True if the quota was incremented successfully (user had remaining quota).
    Returns False if the user has already exhausted their quota.

    This prevents the race condition (C-1) where multiple concurrent requests
    all read the same stale daily_used value and all pass the quota check.
    """
    from sqlalchemy import text
    result = await db.execute(text("""
        UPDATE users
        SET daily_used = daily_used + 1
        WHERE id = :user_id
          AND daily_used < daily_quota
        RETURNING daily_used
    """), {"user_id": user_id})
    await db.commit()
    row = result.fetchone()
    return row is not None  # None means quota was already exhausted

# ===== DEPENDENCIES =====

_ai_router_cache: AIRouter | None = None


def get_ai_router(request: Request) -> AIRouter:
    """FastAPI dependency for an AI router instance using shared connection pools.

    The router is a per-process singleton — provider objects are expensive and
    should not be re-created on every request (H-1 fix).
    """
    global _ai_router_cache
    if _ai_router_cache is None:
        _ai_router_cache = AIRouter(
            groq_keys=settings.groq_api_keys,
            openrouter_keys=settings.openrouter_api_keys,
            together_keys=settings.together_api_keys,
            mistral_keys=settings.mistral_api_keys,
            cerebras_keys=settings.cerebras_api_keys,
            siliconflow_keys=settings.siliconflow_api_keys,
            google_keys=settings.google_ai_studio_api_keys,
            alibaba_bailian_keys=settings.alibaba_bailian_api_keys,
            deepseek_keys=settings.deepseek_api_keys,
            xai_keys=settings.xai_api_keys,
            anthropic_keys=settings.anthropic_api_keys,
            cohere_keys=settings.cohere_api_keys,
            ai21_keys=settings.ai21_api_keys,
            novita_keys=settings.novita_api_keys,
            sambanova_keys=settings.sambanova_api_keys,
            hf_key=settings.HUGGINGFACE_API_KEY,
            openai_key=settings.OPENAI_API_KEY,
            http_client=getattr(request.app.state, "http_client", None),
        )
    else:
        # Keep http_client in sync with app state (updated after startup)
        if hasattr(request.app.state, "http_client"):
            _ai_router_cache.groq_provider.http_client = getattr(request.app.state, "http_client", None)
    return _ai_router_cache


# ===== REQUEST VALIDATION =====

class ChatRequest(BaseModel):
    """Validated chat request with strict input constraints for security."""

    prompt: str = Field(
        ...,
        min_length=1,
        max_length=8000,
        description="User prompt (max 8000 chars)",
    )
    model: str = Field(
        default="fast",
        description="AI model or tier to use",
    )
    stream: bool = Field(
        default=True,
        description="Enable streaming response",
    )

    @field_validator("prompt")
    @classmethod
    def validate_prompt(cls, v: str) -> str:
        """Sanitize prompt to prevent injection attacks and ensure content safety."""
        try:
            return sanitize_prompt(v)
        except ValueError as e:
            raise ValueError(f"Invalid prompt: {str(e)}")


# ===== CHAT ENDPOINT =====

@router.post(
    "/chat",
    summary="Chat with AI",
    description="Send a message and get an AI response",
)
async def chat(  # CRITICAL SECURITY: Zero Trust Implementation
    request: Request,
    payload: ChatRequest,
    background_tasks: BackgroundTasks,
    auth_data: dict = Depends(get_current_user_secure),
    db: AsyncSession = Depends(get_db),
    ai_router: AIRouter = Depends(get_ai_router),
):
    """
    Main chat endpoint with multi-provider support.

    Args:
        request: FastAPI request (for validation)
        payload: Chat request body
        user: Authenticated user (injected)
        db: Database session (injected)

    Returns:
        Streaming response with AI output
    """

    # Get request ID for tracing
    request_id = getattr(request.state, "request_id", "unknown")

    # Get authenticated user from enhanced security
    user = auth_data["user"]
    user_id = auth_data["user_id"]
    user_email = auth_data["email"]

    # Validate user exists (should be guaranteed by enhanced security, but double-check)
    if not user:
        logger.warning(f"Security breach: authenticated user not found [request_id: {request_id}]")
        await log_security_event("user_not_found", user_id, {"request_id": request_id}, request)
        raise HTTPException(status_code=401, detail="User not authenticated")

    # ===== REQUEST SIZE VALIDATION =====
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            size = int(content_length)
            if size > settings.MAX_REQUEST_SIZE_BYTES:
                logger.warning(
                    f"Request too large from {user_email}: "
                    f"{size} bytes (limit: {settings.MAX_REQUEST_SIZE_BYTES}) "
                    f"[request_id: {request_id}]"
                )
                raise HTTPException(
                    status_code=413,
                    detail=f"Request payload too large (max {settings.MAX_REQUEST_SIZE_BYTES} bytes)",
                )
        except ValueError:
            pass  # Invalid header, ignore

    # ===== ENHANCED SECURITY: Prompt Validation =====
    try:
        security_result = validate_prompt_security(payload.prompt)
        safe_prompt = security_result["sanitized"]
    except HTTPException:
        # Re-raise security validation errors
        raise
    except Exception as e:
        logger.error(f"Prompt security validation failed: {e}")
        await log_security_event("prompt_validation_error", user_id, {"error": str(e)}, request)
        raise HTTPException(status_code=400, detail="Prompt validation failed")

    # ===== CONTENT FILTERING (Additional Layer) =====
    filter_result = content_filter.filter_content(safe_prompt)
    if filter_result.blocked:
        logger.warning(
            f"Content blocked for user {user_email}: {filter_result.reasons[:1]} "
            f"[request_id: {request_id}]"
        )
        await log_security_event("content_blocked", user_id, {
            "reasons": filter_result.reasons[:2],
            "request_id": request_id
        }, request)
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Content policy violation",
                "message": "Your request contains content that violates our safety guidelines.",
                "reasons": filter_result.reasons[:2],  # Show first 2 reasons
            },
        )

    # Use sanitized content if available
    safe_prompt = filter_result.sanitized_content or safe_prompt

    # NOTE: Quota is enforced atomically below (after model resolution) via atomic_increment_quota().
    # A pre-check here would reintroduce the race condition (C-1) and is intentionally omitted.

    # ===== MODEL RESOLUTION =====
    try:
        provider, real_model = await resolve_model(payload.model)
        logger.info(
            f"Model resolved: {payload.model} -> {provider}/{real_model} "
            f"for user {user_email} "
            f"[request_id: {request_id}]"
        )
    except KeyError as e:
        logger.error(f"Invalid model selection: {payload.model}")
        raise HTTPException(
            status_code=400,
            detail=f"Invalid model: {payload.model}",
        )

    # ===== ATOMIC QUOTA ENFORCEMENT =====
    # Skip quota for guest users (orm_user is None)
    orm_user = user.get("orm_user") if isinstance(user, dict) else getattr(user, "orm_user", None)
    if orm_user is not None:
        quota_granted = await atomic_increment_quota(orm_user.id, db)
        if not quota_granted:
            logger.warning(
                f"Daily quota exceeded for user: {user_email} [request_id: {request_id}]"
            )
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "Daily quota exceeded",
                    "limit": orm_user.daily_quota,
                    "reset_date": orm_user.last_reset.isoformat() if orm_user.last_reset else None,
                },
            )
    else:
        logger.debug(f"Guest user {user_id} — quota enforcement skipped")

    # ===== ROUTE TO AI PROVIDER =====
    try:
        # CRITICAL FIX: user can be dict or object, handle both cases safely
        if isinstance(user, dict):
            user_email_for_log = user.get("email", user_email)
        else:
            user_email_for_log = getattr(user, "email", user_email)
        
        logger.info(
            f"Chat request from {user_email_for_log}: "
            f"provider={provider}, model={payload.model}, prompt_len={len(payload.prompt)} "
            f"[request_id: {request_id}]"
        )

        # Validate provider is available before streaming
        if not provider:
            logger.error(f"No provider available for model: {payload.model}")
            raise RuntimeError("No AI provider available")

        # Stream response from provider
        base_stream_generator = ai_router.stream(
            prompt=safe_prompt,
            model=real_model,
            provider=provider,
        )

        # Execute with stability protection
        async def execute_ai_stream():
            return stream_response(base_stream_generator)

        async def fallback_response():
            # Return a helpful fallback message
            async def fallback_generator():
                yield f"Sorry {user_email}, we're experiencing technical difficulties. Please try again in a moment! ✨"
            return stream_response(fallback_generator())

        return await stability_engine.execute_with_stability(
            operation=execute_ai_stream,
            service_name="ai_router",
            operation_name="chat_stream",
            fallback=fallback_response
        )

    except ValueError as e:
        logger.warning(f"AI provider configuration error: {e}")
        raise HTTPException(
            status_code=503,
            detail="AI provider not configured",
        )
    except RuntimeError as e:
        error_str = str(e).lower()
        
        if "rate limit" in error_str:
            logger.warning(f"Provider rate limited: {e}")
            raise HTTPException(
                status_code=429,
                detail="AI provider rate limited. Please try again in a few minutes.",
            )
        elif "key" in error_str or "unauthorized" in error_str:
            logger.error(f"Provider authentication failed: {e}")
            raise HTTPException(
                status_code=503,
                detail="AI provider authentication failed",
            )
        elif "unavailable" in error_str or "no provider" in error_str or "no ai provider" in error_str:
            logger.warning(f"Provider unavailable: {e}")
            raise HTTPException(
                status_code=503,
                detail="AI provider temporarily unavailable. Please try again shortly.",
            )
        else:
            logger.error(f"Provider error: {e}")
            raise HTTPException(
                status_code=503,
                detail="AI service temporarily unavailable",
            )
    except Exception as e:
        logger.error(f"Unexpected error in chat endpoint: {e}", exc_info=True)
        # Return a user-friendly error message instead of 500
        raise HTTPException(
            status_code=503,
            detail={
                "error": "Service temporarily unavailable",
                "message": "We're experiencing technical difficulties. Please try again in a moment.",
                "request_id": request_id,
            },
        )


# ===== QUOTA ENDPOINT =====

@router.get("/quota", summary="Get user quota")
async def get_quota(
    auth_data: dict = Depends(get_current_user_secure),
):
    """
    Get current user's quota information.
    """
    user = auth_data["user"]
    return {
        "used": user.daily_used,
        "limit": user.daily_quota,
        "remaining": max(0, user.daily_quota - user.daily_used),
        "resets_at": user.last_reset.isoformat() if user.last_reset else None,
        "reset_time_utc": "00:00 UTC",
    }


# ===== MODELS ENDPOINT =====

@router.get("/models", summary="List available models")
async def list_models(
    auth_data: dict = Depends(get_current_user_secure),
):
    """
    List available AI models for this user with real-time availability.
    """
    from core.model_provider import model_router

    # Check provider health for each model type
    fast_provider = await model_router.get_best_provider("fast")
    balanced_provider = await model_router.get_best_provider("balanced")
    smart_provider = await model_router.get_best_provider("smart")

    fast_available = await model_router._check_provider_health(fast_provider)
    balanced_available = await model_router._check_provider_health(balanced_provider)
    smart_available = await model_router._check_provider_health(smart_provider)

    return {
        "models": [
            {
                "id": "fast",
                "name": "Fast ⚡",
                "description": "Quick responses, good for simple queries",
                "available": fast_available,
                "auto_provider": True,  # Indicates intelligent provider selection
            },
            {
                "id": "balanced",
                "name": "Balanced ⚖️",
                "description": "Balance of speed and quality",
                "available": balanced_available,
                "auto_provider": True,
            },
            {
                "id": "smart",
                "name": "Smart 🧠",
                "description": "Best quality, slower responses",
                "available": smart_available,
                "auto_provider": True,
            },
        ],
        "features": {
            "local_detection": True,
            "auto_fallback": True,
            "health_monitoring": True,
        }
    }


@router.get("/stability", summary="Get system stability status")
async def get_stability_status(
    auth_data: dict = Depends(get_current_user_secure),
):
    """
    Get system stability and health metrics.
    """
    health_status = stability_engine.get_health_status()
    error_summary = stability_engine.get_error_summary()

    return {
        "version": APP_VERSION,
        "health": health_status,
        "errors": error_summary,
        "stability_score": min(100, max(0, 100 - (health_status["error_rate"] * 10))),  # 0-100 score
        "recommendations": _generate_stability_recommendations(health_status, error_summary)
    }


def _generate_stability_recommendations(health_status: Dict, error_summary: Dict) -> List[str]:
    """Generate stability recommendations based on current status."""
    recommendations = []

    if health_status["error_rate"] > 2.0:
        recommendations.append("High error rate detected - consider scaling resources")
    elif health_status["error_rate"] > 1.0:
        recommendations.append("Moderate error rate - monitor closely")

    if health_status["recovery_success_rate"] < 0.7:
        recommendations.append("Low recovery success rate - review error handling strategies")

    open_breakers = [name for name, cb in health_status["circuit_breakers"].items() if cb["state"] == "open"]
    if open_breakers:
        recommendations.append(f"Services with open circuit breakers: {', '.join(open_breakers)}")

    if error_summary["unresolved_errors"] > 50:
        recommendations.append("High number of unresolved errors - investigate root causes")

    if not recommendations:
        recommendations.append("System is operating normally with good stability")

    return recommendations
