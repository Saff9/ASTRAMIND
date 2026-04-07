# backend/app/db/models.py
"""
SQLAlchemy models for ASTRAMIND Platform.
All fields required for quota tracking and authentication.
"""

from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, DateTime, Integer, Boolean
from datetime import datetime, date


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
        DateTime,
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
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        comment="Account creation timestamp",
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
        comment="Last update timestamp",
    )

    def __repr__(self) -> str:
        return (
            f"<User(id={self.id}, email={self.email}, "
            f"quota={self.daily_used}/{self.daily_quota})>"
        )
