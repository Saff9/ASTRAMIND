# backend/render_config.py
"""
Render-specific configuration and deployment settings for ASTRAMIND Backend
"""

import os
from typing import Dict, Any

def get_render_environment_config() -> Dict[str, Any]:
    """
    Get Render-specific environment configuration
    """
    return {
        "port": int(os.environ.get("PORT", 10000)),
        "environment": os.environ.get("ENV", "production"),
        "render_external_url": os.environ.get("RENDER_EXTERNAL_URL"),
        "render_service_id": os.environ.get("RENDER_SERVICE_ID"),
        "render_instance_id": os.environ.get("RENDER_INSTANCE_ID"),
        "is_render": os.environ.get("RENDER") == "true",
        "is_production": os.environ.get("ENV", "development") == "production",
    }

def configure_render_specific_settings():
    """
    Configure Render-specific settings and optimizations
    """
    config = get_render_environment_config()

    # Set Render-specific environment variables if not already set
    if config["is_render"]:
        # Ensure proper logging for Render environment
        os.environ.setdefault("LOG_LEVEL", "INFO")

        # Set database connection pool settings optimized for Render
        os.environ.setdefault("DATABASE_POOL_SIZE", "10")
        os.environ.setdefault("DATABASE_POOL_MAX_OVERFLOW", "20")

        # Set Render-specific timeouts
        os.environ.setdefault("REQUEST_TIMEOUT_SECONDS", "30")
        os.environ.setdefault("UVICORN_TIMEOUT", "300")

        # Configure for Render's ephemeral filesystem
        os.environ.setdefault("USE_EPHEMERAL_STORAGE", "true")

def get_render_health_check_config() -> Dict[str, Any]:
    """
    Get health check configuration optimized for Render
    """
    return {
        "health_check_path": "/health",
        "readiness_check_path": "/ready",
        "health_check_interval": 30,  # seconds
        "readiness_check_timeout": 5,  # seconds
        "max_consecutive_failures": 3,
    }

def get_render_database_config() -> Dict[str, Any]:
    """
    Get database configuration optimized for Render PostgreSQL
    """
    return {
        "ssl_mode": "require",
        "ssl_root_cert": None,  # Render handles SSL automatically
        "connection_timeout": 5,
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5,
    }

def configure_render_middleware(app):
    """
    Configure middleware specifically for Render deployment
    """
    from fastapi.middleware.gzip import GZipMiddleware

    # Add GZip compression for better performance
    app.add_middleware(
        GZipMiddleware,
        minimum_size=1000,
        compresslevel=6,
    )

    # Configure CORS for Render environment
    from core.config import settings

    allowed_origins = settings.allowed_origins
    render_url = os.environ.get("RENDER_EXTERNAL_URL")

    if render_url and render_url not in allowed_origins:
        allowed_origins.append(render_url)

    # Add common Render domains
    if "https://ASTRAMINDai.onrender.com" not in allowed_origins:
        allowed_origins.append("https://ASTRAMINDai.onrender.com")

    return allowed_origins

def get_render_performance_config() -> Dict[str, Any]:
    """
    Get performance configuration optimized for Render
    """
    return {
        "worker_count": 4,  # Optimal for Render's container sizes
        "max_requests": 1000,  # Prevent memory leaks
        "max_requests_jitter": 100,
        "timeout_keep_alive": 30,  # seconds
        "graceful_shutdown_timeout": 15,  # seconds
    }

def get_render_logging_config() -> Dict[str, Any]:
    """
    Get logging configuration optimized for Render
    """
    return {
        "log_level": os.environ.get("LOG_LEVEL", "INFO"),
        "log_format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        "log_to_console": True,
        "log_to_file": False,  # Render handles log collection
        "max_log_size": 10 * 1024 * 1024,  # 10MB
        "backup_count": 3,
    }

def get_render_security_config() -> Dict[str, Any]:
    """
    Get security configuration optimized for Render
    """
    return {
        "trusted_hosts": [
            "ASTRAMINDai.onrender.com",
            "*.onrender.com",
            "localhost",
            "127.0.0.1",
        ],
        "allowed_origins": [
            "https://ASTRAMINDai.onrender.com",
            "https://www.ASTRAMINDai.onrender.com",
            "http://localhost:3000",
            "https://localhost:3000",
        ],
        "security_headers": {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://*.onrender.com https://*.supabase.co; frame-src 'none'; object-src 'none'",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
            "Permissions-Policy": "geolocation=(), microphone=(), camera=(), payment=()",
        }
    }

def configure_render_uvicorn():
    """
    Configure Uvicorn settings optimized for Render
    """
    return {
        "host": "0.0.0.0",
        "port": int(os.environ.get("PORT", 10000)),
        "workers": int(os.environ.get("WORKERS", 4)),
        "timeout_keep_alive": int(os.environ.get("UVICORN_TIMEOUT", 300)),
        "timeout_graceful_shutdown": int(os.environ.get("GRACEFUL_SHUTDOWN_TIMEOUT", 15)),
        "log_level": os.environ.get("LOG_LEVEL", "info").lower(),
        "access_log": True,
        "reload": os.environ.get("ENV") == "development",
        "reload_dirs": ["backend"] if os.environ.get("ENV") == "development" else None,
    }

# Global configuration
RENDER_CONFIG = {
    "environment": get_render_environment_config(),
    "health_check": get_render_health_check_config(),
    "database": get_render_database_config(),
    "performance": get_render_performance_config(),
    "logging": get_render_logging_config(),
    "security": get_render_security_config(),
    "uvicorn": configure_render_uvicorn(),
}

if __name__ == "__main__":
    print("Render Configuration:")
    for key, value in RENDER_CONFIG.items():
        print(f"  {key}: {value}")
