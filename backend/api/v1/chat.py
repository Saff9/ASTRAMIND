# backend/api/v1/chat.py
"""
ASTRAMIND Chat API - Production-ready streaming chat endpoint.
Supports both streaming (SSE) and non-streaming (JSON) responses.
"""

from fastapi import APIRouter, Depends, Request, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Literal, Dict, List, Optional

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
import json
import logging
import time
from core.version import APP_VERSION

logger = logging.getLogger(__name__)

router = APIRouter(tags=["chat"])

# ===== IP / USER DAILY RATE LIMITER =====
# Lightweight in-memory daily quota (resets at midnight UTC).
# No Redis required. Covers guests (by IP) and logged-in users (by email).
# Limits: authenticated users → 50/day · guests → 70/day (by IP)

_DAILY_LIMIT_USER = int(__import__("os").getenv("DAILY_LIMIT_USER", "50"))
_DAILY_LIMIT_IP   = int(__import__("os").getenv("DAILY_LIMIT_IP", "70"))

# { "user:email@x.com" | "ip:1.2.3.4" : (date_str, count) }
_daily_counts: Dict[str, tuple] = {}

def _today_utc() -> str:
    return __import__("datetime").date.today().isoformat()

def _check_and_increment(key: str, limit: int) -> tuple:
    """Returns (allowed: bool, remaining: int)."""
    today = _today_utc()
    
    # Memory leak prevention: periodically clean old entries (e.g., ~1 in 100 requests)
    if __import__("random").random() < 0.01:
        keys_to_delete = [k for k, v in _daily_counts.items() if v[0] != today]
        for k in keys_to_delete:
            del _daily_counts[k]
            
    existing = _daily_counts.get(key)
    if existing is None or existing[0] != today:
        _daily_counts[key] = (today, 1)
        return True, limit - 1
    date_str, count = existing
    if count >= limit:
        return False, 0
    _daily_counts[key] = (date_str, count + 1)
    return True, limit - count - 1

def _get_client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    xri = request.headers.get("x-real-ip")
    if xri:
        return xri.strip()
    return request.client.host if request.client else "unknown"

# ===== BACKGROUND TASKS =====

async def atomic_increment_quota(user_id: int, db: AsyncSession) -> bool:
    """
    Atomically increment user quota usage safely using SQLAlchemy ORM.
    """
    if not isinstance(user_id, int) or user_id <= 0:
        return False
        
    from sqlalchemy import update
    from app.db.models import User
    
    result = await db.execute(
        update(User)
        .where(User.id == user_id)
        .where(User.daily_used < User.daily_quota)
        .values(daily_used=User.daily_used + 1)
        .returning(User.daily_used)
    )
    await db.commit()
    row = result.fetchone()
    return row is not None

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

class ChatMessage(BaseModel):
    """A single message in a conversation."""
    role: str = Field(..., description="'user' or 'assistant'")
    content: str = Field(..., min_length=0, max_length=8000)


class ChatRequest(BaseModel):
    """Validated chat request with conversation history support."""

    prompt: str = Field(
        ...,
        min_length=1,
        max_length=8000,
        description="Current user prompt (max 8000 chars)",
    )
    model: str = Field(
        default="fast",
        description="AI model tier: fast | balanced | smart",
    )
    stream: bool = Field(
        default=False,
        description="Enable streaming SSE response (false = JSON)",
    )
    messages: Optional[List[ChatMessage]] = Field(
        default=None,
        description="Conversation history (last N turns, optional)",
        max_length=100,
    )

    @field_validator("prompt")
    @classmethod
    def validate_prompt(cls, v: str) -> str:
        """Sanitize prompt to prevent injection attacks."""
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

    # ===== QUOTA ENFORCEMENT (DB + IN-MEMORY) =====
    orm_user = user.get("orm_user") if isinstance(user, dict) else getattr(user, "orm_user", None)
    if orm_user is not None:
        # DB-based atomic quota for users
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
        # Also track in memory (fast sync limit)
        key = f"user:{user_email}"
        allowed, rem = _check_and_increment(key, _DAILY_LIMIT_USER)
        if not allowed:
            raise HTTPException(status_code=429, detail="Daily rate limit exceeded. Try again tomorrow.")
    else:
        # GUEST USER - Use IP address limit
        ip = _get_client_ip(request)
        key = f"ip:{ip}"
        allowed, rem = _check_and_increment(key, _DAILY_LIMIT_IP)
        if not allowed:
            logger.warning(f"Daily IP limit exceeded for guest IP {ip} [request_id: {request_id}]")
            raise HTTPException(status_code=429, detail="Daily limit reached for your IP. Please sign in for more messages.")
        logger.debug(f"Guest IP {ip} quota remaining: {rem}")

    # ===== ROUTE TO AI PROVIDER =====
    try:
        # BUG FIX: user is a dict — use user_email variable (already extracted above)
        logger.info(
            f"Chat request from {user_email}: "
            f"provider={provider}, model={payload.model}, prompt_len={len(payload.prompt)} "
            f"[request_id: {request_id}]"
        )
        
        # ── WEB SEARCH INTEGRATION ────────────────────────────────────
        if getattr(settings, "ENABLE_WEB_SEARCH", False):
            search_keywords = ["who", "what", "where", "when", "why", "how", "latest", "news", "current", "today", "now", "price", "stock", "weather"]
            if any(kw in safe_prompt.lower() for kw in search_keywords) and len(safe_prompt) > 5:
                try:
                    from services.web_search import fetch_web_search
                    logger.info(f"Triggering DuckDuckGo real-time search for: {safe_prompt}")
                    search_context = await fetch_web_search(safe_prompt)
                    if search_context:
                        safe_prompt = f"{safe_prompt}\n\n{search_context}"
                except Exception as e:
                    logger.error(f"Web search integration failed: {e}")

        # ── NON-STREAMING PATH (stream=false) ─────────────────────────────────
        if not payload.stream:
            # Build conversation history for the provider
            history = [
                {"role": m.role, "content": m.content}
                for m in (payload.messages or [])[-50:]
                if m.role in ("user", "assistant") and m.content
            ]

            async def execute_ai_json():
                chunks: List[str] = []
                async for chunk in ai_router.stream_with_fallback(
                    prompt=safe_prompt,
                    model=payload.model,  # The tier string (e.g. 'balanced')
                    preferred_provider=provider,
                    messages=history or None,
                ):
                    try:
                        parsed = json.loads(chunk)
                        choices = parsed.get("choices", [])
                        content = ""
                        if choices:
                            content = choices[0].get("delta", {}).get("content", "") or ""
                        if content:
                            chunks.append(content)
                    except (json.JSONDecodeError, IndexError, AttributeError, TypeError):
                        if chunk and chunk.strip():
                            chunks.append(chunk)
                full_text = "".join(chunks)
                return JSONResponse(content={
                    "response": full_text,
                    "provider": provider,
                    "model": real_model,
                    "tier": payload.model,
                    "request_id": request_id,
                })

            async def fallback_json():
                return JSONResponse(content={
                    "response": (
                        f"Sorry, we're experiencing technical difficulties. "
                        f"Please try again in a moment! ✨"
                    ),
                    "provider": "fallback",
                    "model": "none",
                    "tier": payload.model,
                    "request_id": request_id,
                })

            return await stability_engine.execute_with_stability(
                operation=execute_ai_json,
                service_name="ai_router",
                operation_name="chat_json",
                fallback=fallback_json,
            )

        # ── STREAMING PATH (stream=true, SSE) ─────────────────────────────────
        # Note: Frontend history array logic has not been requested for SSE yet, 
        # but passing it here for consistency if frontend sends it.
        history_sse = [
            {"role": m.role, "content": m.content}
            for m in (payload.messages or [])[-50:]
            if m.role in ("user", "assistant") and m.content
        ]
        
        base_stream_generator = ai_router.stream_with_fallback(
            prompt=safe_prompt,
            model=payload.model,
            preferred_provider=provider,
            messages=history_sse or None,
        )

        async def execute_ai_stream():
            return stream_response(base_stream_generator)

        async def fallback_sse():
            async def fallback_generator():
                yield (
                    f"Sorry, we're experiencing technical difficulties. "
                    f"Please try again in a moment! ✨"
                )
            return stream_response(fallback_generator())

        return await stability_engine.execute_with_stability(
            operation=execute_ai_stream,
            service_name="ai_router",
            operation_name="chat_stream",
            fallback=fallback_sse,
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
        elif "unavailable" in error_str:
            logger.warning(f"Provider unavailable: {e}")
            raise HTTPException(
                status_code=503,
                detail="AI provider temporarily unavailable",
            )
        else:
            logger.error(f"Provider error: {e}")
            raise HTTPException(
                status_code=503,
                detail="AI service temporarily unavailable",
            )
    except Exception as e:
        logger.error(f"Unexpected error in chat endpoint: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Internal server error",
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
