# backend/main.py
"""
Main FastAPI application with graceful database connection handling.
FIXED: CORS and TrustedHost middleware configuration
FIXED: SQLAlchemy C extension loading issue on Windows
"""

import os
import sys

# Fix for SQLAlchemy C extension loading issue on Windows
# Disable C extensions to avoid WMI query hangs on some systems
os.environ.setdefault('SQLALCHEMY_DISABLE_CYEXTENSION', '1')

# Pre-import platform to avoid WMI hangs during SQLAlchemy init
try:
    import platform
    # Force platform detection early to avoid hangs later
    _ = platform.machine()
except KeyboardInterrupt:
    # If platform detection hangs, continue anyway
    pass

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse, Response
from starlette.exceptions import HTTPException as StarletteHTTPException

from api.v1 import chat, status, health, admin, web_search, auth
from core.config import settings, validate_startup
from core.logging import setup_logging
from core.version import APP_VERSION
from app.db.session import check_database_connection, cleanup_database
from app.middleware.request_id import RequestIDMiddleware
from app.middleware.security import SecurityHeadersMiddleware
from app.middleware.request_validation import RequestValidationMiddleware
from app.middleware.rate_limit import RateLimitMiddleware
from core.exceptions import global_exception_handler
from core.stability_engine import stability_engine
from services.provider_monitor import start_provider_monitor, stop_provider_monitor
from core.monitoring import MonitoringMiddleware, stop_monitoring

import logging
import os
import httpx
import functools
import asyncio
try:
    from opentelemetry import trace
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor
    from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
except Exception:  # optional tracing
    trace = None
    Resource = TracerProvider = BatchSpanProcessor = OTLPSpanExporter = FastAPIInstrumentor = None  # type: ignore

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle management."""
    # ===== STARTUP =====
    try:
        setup_logging()
        logger.info("[OK] Logging initialized")

        validate_startup()
        logger.info("[OK] Configuration validated")

        db_available = await check_database_connection()
        if db_available:
            logger.info("[OK] Database connection verified")
            
            # Programmatically run migrations on startup
            try:
                from alembic.config import Config
                from alembic import command
                
                # Get the path to alembic.ini relative to this file
                base_dir = os.path.dirname(os.path.abspath(__file__))
                ini_path = os.path.join(base_dir, "alembic.ini")
                
                if os.path.exists(ini_path):
                    logger.info(f"Running database migrations from {ini_path}...")
                    alembic_cfg = Config(ini_path)
                    
                    # Ensure the database URL in alembic matches our settings
                    # SQLAlchemy URL in alembic.ini needs to be synchronous for alembic's core
                    db_url = settings.DATABASE_URL
                    if db_url:
                        sync_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
                        alembic_cfg.set_main_option("sqlalchemy.url", sync_url)
                    
                    # Run the migration in a thread pool
                    import asyncio
                    import functools
                    loop = asyncio.get_running_loop()
                    await loop.run_in_executor(None, functools.partial(command.upgrade, alembic_cfg, "head"))
                    logger.info("[OK] Database migrations applied successfully")
                else:
                    logger.warning(f"[WARN] alembic.ini not found at {ini_path}, skipping migrations")
            except Exception as e:
                logger.error(f"[ERROR] Failed to apply migrations: {e}")
        else:
            logger.warning("[WARN] Database unavailable at startup - migrations skipped")

        # Initialize local database if using SQLite
        from app.db.session import initialize_local_database
        await initialize_local_database()

        # Shared outbound HTTP client (connection pooling) for external calls
        # Individual calls may override timeouts as needed.
        app.state.http_client = httpx.AsyncClient(
            follow_redirects=True,
            timeout=httpx.Timeout(
                settings.OUTBOUND_HTTP_READ_TIMEOUT_SECONDS,
                connect=settings.OUTBOUND_HTTP_CONNECT_TIMEOUT_SECONDS,
                read=settings.OUTBOUND_HTTP_READ_TIMEOUT_SECONDS,
            ),
            limits=httpx.Limits(
                max_connections=settings.OUTBOUND_HTTP_MAX_CONNECTIONS,
                max_keepalive_connections=settings.OUTBOUND_HTTP_MAX_KEEPALIVE,
            ),
        )
        logger.info("[OK] Shared HTTP client initialized")

        if os.getenv("DISABLE_BACKGROUND_TASKS") != "1":
            start_provider_monitor(app)
            logger.info("[OK] Provider monitor started")
        else:
            logger.info("[SKIP] Provider monitor disabled")

        if os.getenv("DISABLE_BACKGROUND_TASKS") != "1":
            # Start stability engine background tasks
            stability_engine.start_background_tasks()
            logger.info("[OK] Stability engine tasks started")
        else:
            logger.info("[SKIP] Background tasks disabled")

        logger.info(f"[START] ASTRAMIND Backend starting in {settings.ENV} mode")

        # Configure OpenTelemetry tracing if endpoint provided
        try:
            otel_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
            if otel_endpoint and trace and OTLPSpanExporter:
                resource = Resource.create({"service.name": "ASTRAMIND-ai-backend", "environment": settings.ENV})
                provider = TracerProvider(resource=resource)
                exporter = OTLPSpanExporter(endpoint=otel_endpoint, timeout=5)
                provider.add_span_processor(BatchSpanProcessor(exporter))
                trace.set_tracer_provider(provider)
                FastAPIInstrumentor.instrument_app(app)
                logger.info("[OK] OpenTelemetry tracing configured")
        except Exception as e:
            logger.warning(f"[WARN] Failed to configure OpenTelemetry: {e}")

    except Exception as e:
        logger.critical(f"[CRITICAL] Fatal startup error: {e}", exc_info=e)
        # Re-raise fatal errors so the process exits cleanly instead of
        # serving traffic in a broken state (broken DB, missing secret, etc.)
        raise

    yield

    # ===== SHUTDOWN =====
    try:
        await cleanup_database()
        logger.info("[OK] Database connections closed")
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")

    # Stop stability engine background tasks
    try:
        await stability_engine.stop_background_tasks()
        logger.info("[OK] Stability engine tasks stopped")
    except Exception as e:
        logger.error(f"Error stopping stability engine tasks: {e}")

    # Stop provider monitor task
    try:
        await stop_provider_monitor(app)
        logger.info("[OK] Provider monitor stopped")
    except Exception as e:
        logger.error(f"Error stopping provider monitor: {e}")

    # Close shared HTTP client
    try:
        http_client = getattr(app.state, "http_client", None)
        if http_client is not None:
            await http_client.aclose()
        logger.info("[OK] Shared HTTP client closed")
    except Exception as e:
        logger.error(f"Error closing shared HTTP client: {e}")

    # Stop monitoring threads
    try:
        stop_monitoring()
        logger.info("[OK] Monitoring stopped")
    except Exception as e:
        logger.error(f"Error stopping monitoring: {e}")


app = FastAPI(
    title="ASTRAMIND Backend",
    version=APP_VERSION,
    description="Multi-provider AI orchestration platform with enterprise-grade stability and security",
    lifespan=lifespan,
    # Disable API schema endpoints in production to prevent schema exposure
    docs_url=None if os.getenv("ENV", "development").lower() == "production" else "/docs",
    redoc_url=None if os.getenv("ENV", "development").lower() == "production" else "/redoc",
    openapi_url=None if os.getenv("ENV", "development").lower() == "production" else "/openapi.json",
)

# ===== MIDDLEWARE STACK =====

# 1. Request ID
app.add_middleware(RequestIDMiddleware)

# 2. Security headers
app.add_middleware(SecurityHeadersMiddleware)

# 3. Request validation
app.add_middleware(RequestValidationMiddleware)

# 3b. Distributed rate limiting
app.add_middleware(RateLimitMiddleware)

# 4. Trusted hosts - FIXED
trusted_hosts = ["*"]  # Allow all in development
if settings.is_production():
    trusted_hosts = []
    # Add configured origins
    for origin in settings.allowed_origins:
        hostname = origin.replace("https://", "").replace("http://", "").split("/")[0]
        trusted_hosts.append(hostname)

    # Add Render domain
    render_url = os.getenv("RENDER_EXTERNAL_URL")
    if render_url:
        hostname = render_url.replace("https://", "").replace("http://", "").split("/")[0]
        if hostname not in trusted_hosts:
            trusted_hosts.append(hostname)

    # Add localhost for health checks
    trusted_hosts.extend(["localhost", "127.0.0.1"])

logger.info(f"Configured {len(trusted_hosts)} trusted hosts")

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=trusted_hosts,
)

# 5. CORS - FIXED to use property
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,  # Now a list via @property
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    expose_headers=["X-Request-ID", "X-RateLimit-Remaining"],
    max_age=3600,
)

# 6. Monitoring middleware (request/metrics)
app.add_middleware(MonitoringMiddleware)


# ===== EXCEPTION HANDLERS =====

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle HTTP exceptions with proper logging."""
    from datetime import datetime
    request_id = getattr(request.state, "request_id", "unknown")
    user_id = getattr(request.state, "user_id", "anonymous")
    
    # Log with context
    logger.warning(
        f"HTTP {exc.status_code}: {exc.detail} [user: {user_id}, request_id: {request_id}]",
        extra={
            "status_code": exc.status_code,
            "path": request.url.path,
            "method": request.method
        }
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail if isinstance(exc.detail, str) else str(exc.detail),
            "request_id": request_id,
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions with proper logging and recovery."""
    logger.error(
        f"Unhandled exception in {request.method} {request.url.path}: {type(exc).__name__}: {str(exc)}",
        exc_info=exc
    )
    return await global_exception_handler(request, exc)


# ===== API ROUTERS =====

app.include_router(chat.router, prefix="/api/v1", tags=["chat"])
app.include_router(status.router, prefix="/api/v1", tags=["status"])
app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(auth.router, prefix="/api/v1", tags=["auth"])
app.include_router(admin.router, prefix="/api/v1", tags=["admin"])
app.include_router(web_search.router, prefix="/api/v1", tags=["search"])

from api.v1 import user, discover
app.include_router(user.router, prefix="/api/v1/user", tags=["user"])
app.include_router(discover.router, prefix="/api/v1/discover", tags=["discover"])

# ===== HEALTH ENDPOINTS =====

@app.get("/", include_in_schema=False)
async def root():
    """Root endpoint."""
    return {
        "status": "ok",
        "service": "ASTRAMIND Backend",
        "environment": settings.ENV,
        "version": APP_VERSION,
        "docs": {
            "swagger": "/docs",
            "redoc": "/redoc",
            "openapi": "/openapi.json",
        },
    }


@app.get("/health", include_in_schema=False)
async def health_check():
    """Health check for uptime monitors - provides system health status."""
    try:
        health_status = stability_engine.get_health_status()

        # Determine overall health based on multiple factors
        error_rate = health_status.get("error_rate", 0)
        recovery_rate = health_status.get("recovery_success_rate", 0)
        circuit_breakers = health_status.get("circuit_breakers", {})
        
        # Health is good if: error rate < 1 error/min, recovery > 80%, no open circuits
        is_healthy = (
            error_rate < 1.0 and
            recovery_rate > 0.8 and
            all(cb.get("state") != "open" for cb in circuit_breakers.values())
        )

        return {
            "status": "healthy" if is_healthy else "degraded",
            "version": APP_VERSION,
            "service": "ASTRAMIND Backend",
            "uptime": health_status.get("uptime", 0),
            "stability_metrics": {
                "error_rate": error_rate,
                "recovery_success_rate": recovery_rate,
                "active_circuit_breakers": len([cb for cb in circuit_breakers.values() if cb.get("state") != "closed"]),
                "recent_errors": health_status.get("recent_errors", 0)
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Error in health check: {e}", exc_info=e)
        return JSONResponse(
            status_code=503,
            content={
                "status": "unknown",
                "error": str(e),
                "version": APP_VERSION,
                "timestamp": datetime.utcnow().isoformat(),
            },
        )


@app.get("/ready", include_in_schema=False)
async def ready_check():
    """Readiness probe - checks if service can accept traffic."""
    try:
        # Check database connectivity
        db_ready = await check_database_connection()

        # Check if at least one AI provider is configured
        ai_ready = (
            len(settings.groq_api_keys) > 0 or
            len(settings.openrouter_api_keys) > 0 or
            len(settings.together_api_keys) > 0 or
            len(settings.mistral_api_keys) > 0 or
            len(settings.cerebras_api_keys) > 0 or
            len(settings.siliconflow_api_keys) > 0 or
            len(settings.google_ai_studio_api_keys) > 0 or
            len(settings.alibaba_bailian_api_keys) > 0 or
            len(settings.deepseek_api_keys) > 0 or
            len(settings.xai_api_keys) > 0 or
            len(settings.anthropic_api_keys) > 0 or
            len(settings.cohere_api_keys) > 0 or
            len(settings.ai21_api_keys) > 0 or
            len(settings.novita_api_keys) > 0 or
            len(settings.sambanova_api_keys) > 0 or
            (settings.CLOUDFLARE_ACCOUNT_ID is not None and settings.CLOUDFLARE_API_TOKEN is not None) or
            settings.HUGGINGFACE_API_KEY is not None or
            settings.OPENAI_API_KEY is not None
        )

        ready = db_ready and ai_ready

        if ready:
            return {
                "ready": True,
                "database": "connected",
                "ai_providers": "configured",
                "environment": settings.ENV,
                "timestamp": datetime.utcnow().isoformat(),
            }

        return JSONResponse(
            status_code=503,
            content={
                "ready": False,
                "database": "disconnected" if not db_ready else "connected",
                "ai_providers": "not_configured" if not ai_ready else "configured",
                "environment": settings.ENV,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        )
    except Exception as e:
        logger.error(f"Error in readiness check: {e}", exc_info=e)
        return JSONResponse(
            status_code=503,
            content={
                "ready": False,
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        )


# ===== METRICS ENDPOINT =====
@app.get("/metrics", include_in_schema=False)
async def metrics():
    """Prometheus metrics endpoint - optional, requires prometheus_client."""
    try:
        from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
        
        data = generate_latest()
        return Response(content=data, media_type=CONTENT_TYPE_LATEST)
    except ImportError:
        logger.debug("prometheus_client not installed, metrics endpoint disabled")
        return JSONResponse(
            status_code=501,
            content={"error": "Metrics endpoint not configured", "detail": "Install prometheus-client to enable metrics"}
        )
    except Exception as e:
        logger.error(f"Error generating metrics: {e}", exc_info=e)
        return JSONResponse(
            status_code=500,
            content={"error": "Failed to generate metrics", "detail": str(e)}
        )


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8000))

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=settings.is_development(),
        log_level=settings.LOG_LEVEL.lower(),
    )
