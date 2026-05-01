import multiprocessing
import os


def _clamp_int(value: str | None, *, default: int, minimum: int, maximum: int) -> int:
    try:
        if value is None:
            return default
        parsed = int(value)
        return max(minimum, min(maximum, parsed))
    except Exception:
        return default


# Network — Render/Heroku/PaaS set PORT; honor it unless BIND overrides fully
_port = os.getenv("PORT", "8000")
bind = os.getenv("BIND", f"0.0.0.0:{_port}")
backlog = _clamp_int(os.getenv("GUNICORN_BACKLOG"), default=2048, minimum=128, maximum=65535)

# Workers
# For IO-bound async workloads, keep workers modest and scale horizontally.
_cpu = multiprocessing.cpu_count()
workers = _clamp_int(os.getenv("WEB_CONCURRENCY"), default=max(2, min(8, _cpu * 2)), minimum=1, maximum=64)
worker_class = "uvicorn.workers.UvicornWorker"
threads = _clamp_int(os.getenv("GUNICORN_THREADS"), default=1, minimum=1, maximum=8)

# Timeouts
timeout = _clamp_int(os.getenv("GUNICORN_TIMEOUT"), default=60, minimum=10, maximum=300)
graceful_timeout = _clamp_int(os.getenv("GUNICORN_GRACEFUL_TIMEOUT"), default=30, minimum=5, maximum=120)
keepalive = _clamp_int(os.getenv("GUNICORN_KEEPALIVE"), default=5, minimum=1, maximum=30)

# Worker recycling — reduces long-term memory growth from C-extensions / fragmentation
max_requests = _clamp_int(os.getenv("GUNICORN_MAX_REQUESTS"), default=2000, minimum=0, maximum=100000)
max_requests_jitter = _clamp_int(os.getenv("GUNICORN_MAX_REQUESTS_JITTER"), default=200, minimum=0, maximum=5000)

# Logging
loglevel = os.getenv("LOG_LEVEL", "info").lower()
accesslog = "-"  # stdout
errorlog = "-"   # stderr

# Hardening
limit_request_line = _clamp_int(os.getenv("GUNICORN_LIMIT_REQUEST_LINE"), default=4094, minimum=1024, maximum=8190)
limit_request_fields = _clamp_int(os.getenv("GUNICORN_LIMIT_REQUEST_FIELDS"), default=100, minimum=50, maximum=200)
limit_request_field_size = _clamp_int(os.getenv("GUNICORN_LIMIT_REQUEST_FIELD_SIZE"), default=8190, minimum=1024, maximum=16384)

