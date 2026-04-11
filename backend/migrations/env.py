from __future__ import annotations

from logging.config import fileConfig
from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context
import os
import sys

# Add backend directory to PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Add your model's MetaData object here for 'autogenerate' support
from app.db.models import Base
target_metadata = Base.metadata

# Override sqlalchemy.url from environment (DATABASE_URL)
db_url = os.getenv("DATABASE_URL")
if db_url:
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql+psycopg://", 1)
    elif db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)
    
    # Strip aiosqlite for Alembic's synchronous migrations
    if db_url.startswith("sqlite+aiosqlite:///"):
        db_url = db_url.replace("sqlite+aiosqlite:///", "sqlite:///", 1)
        
    config.set_main_option("sqlalchemy.url", db_url)
else:
    # Fallback to config file URL, also stripping aiosqlite if present
    db_url = config.get_main_option("sqlalchemy.url")
    if db_url and db_url.startswith("sqlite+aiosqlite:///"):
        db_url = db_url.replace("sqlite+aiosqlite:///", "sqlite:///", 1)
        config.set_main_option("sqlalchemy.url", db_url)


def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
