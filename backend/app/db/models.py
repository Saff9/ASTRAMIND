# backend/app/db/models.py
"""
SQLAlchemy models for ASTRAMIND Platform.
All fields required for quota tracking and authentication.
"""

from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, DateTime, Date, Integer, Boolean
from datetime import datetime, date, timezone


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


class User(Base):
    """
    User model with quota tracking and authentication fields.
    """
    __tablename__ = "users"

    # Primary Key
    id: Mapped[int] = mapped_column(primary_key=True)

    # Clerk Auth ID
    clerk_id: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
        comment="Clerk Provider User ID",
    )

    # Authentication
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )

    # Daily Quota Tracking
    daily_quota: Mapped[int] = mapped_column(
        Integer,
        default=50,
        nullable=False,
        comment="Maximum API calls allowed per day",
    )

    daily_used: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="Number of API calls used today",
    )

    last_reset: Mapped[date] = mapped_column(
        Date,
        default=date.today,
        nullable=False,
        comment="Date when daily quota was last reset",
    )

    # Admin Status
    is_admin: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        comment="Whether user has admin privileges",
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(tz=timezone.utc),
        nullable=False,
        comment="Account creation timestamp",
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(tz=timezone.utc),
        onupdate=lambda: datetime.now(tz=timezone.utc),
        nullable=False,
        comment="Last update timestamp",
    )

    def __repr__(self) -> str:
        return (
            f"<User(clerk_id={self.clerk_id}, email={self.email}, "
            f"quota={self.daily_used}/{self.daily_quota})>"
        )


class UserConfig(Base):
    """
    User configuration for UI settings and behaviour tracking.
    """
    __tablename__ = "user_configs"

    id: Mapped[int] = mapped_column(primary_key=True)
    clerk_id: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    
    last_used_model: Mapped[str] = mapped_column(String, default="gpt-4o", nullable=False)
    preferred_theme: Mapped[str] = mapped_column(String, default="system", nullable=False)
    preferred_font: Mapped[str] = mapped_column(String, default="var(--font-fira)", nullable=False)
    total_messages_sent: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(tz=timezone.utc),
        onupdate=lambda: datetime.now(tz=timezone.utc),
        nullable=False,
    )


class DiscoverNews(Base):
    """
    Scraped tech and AI news for the Discover feed.
    """
    __tablename__ = "discover_news"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    summary: Mapped[str] = mapped_column(String, nullable=False)
    source_name: Mapped[str] = mapped_column(String, nullable=False)
    source_url: Mapped[str] = mapped_column(String, nullable=False)
    image_url: Mapped[str] = mapped_column(String, nullable=True)
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(tz=timezone.utc),
        nullable=False,
    )
