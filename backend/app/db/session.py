# backend/app/db/session.py
"""
SQLAlchemy async session factory with proper AsyncIO pooling.
Fixed for Supabase compatibility - no server_settings parameter.
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker,
)
# from sqlalchemy.pool import AsyncAdaptedQueuePool  # Not needed for async engine
from core.config import settings
import logging

logger = logging.getLogger(__name__)


def get_engine_kwargs() -> dict:
    """
    Generate engine configuration based on environment and database type.
    CRITICAL: asyncpg does NOT support sslmode in URL — use connect_args instead.
    SQLite does NOT support connection pooling — use StaticPool instead.
    """
    db_url = settings.effective_database_url
    is_sqlite = db_url.startswith("sqlite")

    if is_sqlite:
        # SQLite needs StaticPool for async usage
        from sqlalchemy.pool import StaticPool
        return {
            "echo": settings.is_development(),
            "connect_args": {"check_same_thread": False},
            "poolclass": StaticPool,
        }

    kwargs: dict = {
        "echo": settings.is_development(),
        "pool_pre_ping": True,
        "pool_size": settings.DATABASE_POOL_SIZE,
        "max_overflow": settings.DATABASE_POOL_MAX_OVERFLOW,
        "pool_recycle": settings.DATABASE_POOL_RECYCLE_SECONDS,
        "pool_timeout": settings.DATABASE_POOL_TIMEOUT_SECONDS,
    }

    # SSL must be passed via connect_args for asyncpg — never in URL
    if settings.is_production():
        kwargs["connect_args"] = {"ssl": True}

    return kwargs


# Create async engine — non-fatal so server starts even if DB is unavailable
engine = None
try:
    engine = create_async_engine(
        settings.effective_database_url,
        **get_engine_kwargs(),
    )
    logger.info("Database engine created successfully (PostgreSQL)")
except Exception as e:
    logger.warning(f"⚠ Database engine creation failed: {e} — DB features disabled")


# Session factory — only created if engine is available
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
) if engine is not None else None


# Dedicated local SQLite database for conversation history & agent memory
sqlite_engine = None
sqlite_session_maker = None
try:
    import os
    from sqlalchemy.pool import StaticPool
    base_dir = os.path.dirname(os.path.abspath(__file__))
    sqlite_db_path = os.path.join(os.path.dirname(base_dir), "astramind_local.db")
    sqlite_url = f"sqlite+aiosqlite:///{sqlite_db_path}"
    
    sqlite_engine = create_async_engine(
        sqlite_url,
        echo=settings.is_development(),
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    sqlite_session_maker = async_sessionmaker(
        sqlite_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )
    logger.info(f"Local SQLite database engine initialized at {sqlite_db_path}")
except Exception as e:
    logger.error(f"Failed to initialize local SQLite engine: {e}")


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency for database session.
    Yields None if DB is unavailable — endpoints must handle this.
    """
    if async_session_maker is None:
        logger.warning("DB unavailable — yielding None session")
        yield None  # type: ignore
        return
    async with async_session_maker() as session:
        try:
            yield session
        except Exception as e:
            await session.rollback()
            logger.error(f"Database session error: {e}")
            raise
        finally:
            await session.close()


@asynccontextmanager
async def get_db_session():
    """
    Context manager for background tasks that need DB access.
    No-ops gracefully if DB engine is unavailable.
    """
    if async_session_maker is None:
        logger.warning("DB unavailable — skipping background DB session")
        yield None
        return
    async with async_session_maker() as session:
        try:
            yield session
        except Exception as e:
            await session.rollback()
            logger.error(f"Background DB session error: {e}")
            raise
        finally:
            await session.close()


@asynccontextmanager
async def get_sqlite_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Context manager for local SQLite session.
    Always points to the local astramind_local.db regardless of settings.DATABASE_URL.
    """
    if sqlite_session_maker is None:
        logger.warning("Local SQLite session maker is unavailable")
        yield None
        return
    async with sqlite_session_maker() as session:
        try:
            yield session
        except Exception as e:
            await session.rollback()
            logger.error(f"Local SQLite session error: {e}")
            raise
        finally:
            await session.close()


async def check_database_connection() -> bool:
    """
    Verify database is reachable at startup with timeout protection.
    
    Returns:
        True if connection successful, False otherwise
    """
    import asyncio
    if engine is None:
        logger.error("✗ Database engine not initialized")
        return False
    try:
        # Set a timeout for the connection check
        async with asyncio.timeout(5):  # 5 second timeout
            async with engine.begin() as conn:
                await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
        logger.info("✓ Database connection verified")
        return True
    except asyncio.TimeoutError:
        logger.error("✗ Database connection timeout (exceeded 5 seconds)")
        return False
    except Exception as e:
        logger.error(f"✗ Database connection failed: {type(e).__name__}: {str(e)}")
        return False


async def cleanup_database():
    """
    Called on app shutdown to properly close database connections.
    """
    if engine is None:
        return
    try:
        await engine.dispose()
        logger.info("Database connections closed")
    except Exception as e:
        logger.error(f"Error closing database: {e}")
    if sqlite_engine is not None:
        try:
            await sqlite_engine.dispose()
            logger.info("Local SQLite database engine disposed")
        except Exception as e:
            logger.error(f"Error closing SQLite database: {e}")


async def initialize_local_database():
    """
    Initialize local SQLite database with required tables.
    Always runs at startup to ensure local conversation history is supported.
    """
    if sqlite_engine is None:
        return

    try:
        # Import models to ensure they're registered with SQLAlchemy
        from . import models

        # Create all tables in local SQLite database
        async with sqlite_engine.begin() as conn:
            await conn.run_sync(models.Base.metadata.create_all)

        logger.info("✓ Local SQLite database initialized (tables created/verified)")

        # Create a development admin user in Neon/main database if using SQLite fallback
        # or if SQLite engine is used as primary DB
        if settings.effective_database_url.startswith("sqlite"):
            from .models import User
            from sqlalchemy import select

            async with get_db_session() as session:
                if session:
                    # Check if admin user exists
                    stmt = select(User).where(User.email == "admin@localhost")
                    result = await session.execute(stmt)
                    existing_user = result.scalar_one_or_none()

                    if not existing_user:
                        admin_user = User(
                            email="admin@localhost",
                            daily_quota=10000,  # High quota for development
                            daily_used=0,
                            last_reset=datetime.now(timezone.utc),
                            is_admin=True,
                            created_at=datetime.now(timezone.utc),
                            updated_at=datetime.now(timezone.utc),
                        )
                        session.add(admin_user)
                        await session.commit()
                        logger.info("✓ Development admin user created: admin@localhost")
                    else:
                        logger.debug("Admin user already exists")

    except Exception as e:
        logger.warning(f"⚠ Failed to initialize local SQLite database: {type(e).__name__}: {str(e)}")
        # Don't raise error - allow app to continue without local DB
