# backend/app/db/models.py
"""
SQLAlchemy models for ASTRAMIND Platform.
Auth is handled by NextAuth on the frontend.
Backend only tracks quota and user config.
"""

from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, DateTime, Date, Integer, Boolean
from datetime import datetime, date, timezone


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


class User(Base):
    """
    User model with quota tracking.
    user_id is the email address (set by NextAuth).
    """
    __tablename__ = "users"

    # Primary Key
    id: Mapped[int] = mapped_column(primary_key=True)

    # Auth identity — email from NextAuth session
    user_id: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
        comment="User identity (email from NextAuth)",
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
    """
    __tablename__ = "user_configs"

    id: Mapped[int] = mapped_column(primary_key=True)

    # user_id = email from NextAuth
    user_id: Mapped[str] = mapped_column(String(255), index=True, nullable=False)

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
        return f"<UserConfig(user_id={self.user_id}, model={self.last_used_model})>"
