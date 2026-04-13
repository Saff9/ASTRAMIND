# backend/app/db/models.py
"""
SQLAlchemy models for ASTRAMIND Platform.
Auth is handled by NextAuth on the frontend.
Backend tracks quota, user config, and discover news.
"""

from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, DateTime, Date, Integer, Boolean, Text
from datetime import datetime, date, timezone


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


class User(Base):
    """
    User model with quota tracking.
    clerk_id field is kept for DB schema compatibility —
    it now stores the NextAuth user identity (email).
    """
    __tablename__ = "users"

    # Primary Key
    id: Mapped[int] = mapped_column(primary_key=True)

    # User identity — stores email/user_id from NextAuth
    clerk_id: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
        comment="User identity (email from NextAuth, kept for schema compatibility)",
    )

    # Email
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
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(tz=timezone.utc),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(tz=timezone.utc),
        onupdate=lambda: datetime.now(tz=timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return (
            f"<User(email={self.email}, "
            f"quota={self.daily_used}/{self.daily_quota})>"
        )


class UserConfig(Base):
    """
    User configuration for UI settings and behaviour tracking.
    clerk_id field kept for schema compatibility — stores NextAuth user identity.
    """
    __tablename__ = "user_configs"

    id: Mapped[int] = mapped_column(primary_key=True)

    # User identity (email from NextAuth)
    clerk_id: Mapped[str] = mapped_column(
        String(255),
        index=True,
        nullable=False,
        comment="User identity (email from NextAuth)",
    )

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

    def __repr__(self) -> str:
        return f"<UserConfig(clerk_id={self.clerk_id}, model={self.last_used_model})>"


class DiscoverNews(Base):
    """
    AI/Tech news items for the Discover feed.
    Populated by the background scraper task.
    """
    __tablename__ = "discover_news"

    id: Mapped[int] = mapped_column(primary_key=True)

    title: Mapped[str] = mapped_column(String(500), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=True)
    source_name: Mapped[str] = mapped_column(String(255), nullable=True)
    source_url: Mapped[str] = mapped_column(String(1000), nullable=True)
    image_url: Mapped[str] = mapped_column(String(1000), nullable=True)

    published_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(tz=timezone.utc),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(tz=timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<DiscoverNews(title={self.title[:40]}, source={self.source_name})>"
