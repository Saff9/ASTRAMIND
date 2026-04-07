# Production Dockerfile for ASTRAMIND Backend
# - Slim Python base
# - Non-root user
# - Gunicorn with Uvicorn workers
# - Installs only backend dependencies

FROM python:3.13-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONFAULTHANDLER=1 \
    ENV=production \
    LOG_LEVEL=INFO

# System deps (minimal)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       build-essential \
       ca-certificates \
       libmagic1 \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN useradd -ms /bin/bash appuser

WORKDIR /app

# Only copy backend requirements first for better layer caching
COPY backend/requirements.txt /app/backend/requirements.txt

RUN python -m pip install --upgrade pip \
    && pip install -r /app/backend/requirements.txt

# Copy backend source code
COPY backend /app/backend

# Ensure runtime directory ownership
RUN chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Run from backend directory so `main:app` resolves correctly
WORKDIR /app/backend

# Gunicorn (Uvicorn workers) configuration is in `gunicorn_conf.py`
CMD ["gunicorn", "main:app", "-k", "uvicorn.workers.UvicornWorker", "-c", "gunicorn_conf.py"]
