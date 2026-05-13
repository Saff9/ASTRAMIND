"""
AstraMind Monitoring — Memory-Optimized for Render Free Tier (512MB RAM)

REDESIGNED: Eliminated the memory hog patterns:
- Removed 10,000-metric in-memory store (was eating 50-100MB)
- Removed leaking DistributedTracer spans dict
- Removed 2 background threads running every 10s
- Replaced with lightweight counters + bounded deques (max 200 entries)
- Reduced psutil calls from every 10s to every 60s
"""

import time
import logging
import threading
from typing import Dict, Any, Optional
from collections import deque
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class LightMonitor:
    """
    Ultra-lightweight request monitor. O(1) memory per metric.
    Replaces the 670-line heavy monitoring.py that was OOM-killing Render.
    """

    def __init__(self):
        # Counters (just integers — no history)
        self.request_count: int = 0
        self.error_count: int = 0
        self.total_duration: float = 0.0

        # Bounded sliding window for response times (200 max)
        self._recent: deque = deque(maxlen=200)
        self._lock = threading.Lock()

        # System snapshot — taken lazily, max once per 60s
        self._sys_snapshot: Dict[str, float] = {}
        self._sys_last: float = 0.0

        # Background system check thread (60s interval, daemon)
        self._running = True
        t = threading.Thread(target=self._sys_loop, daemon=True)
        t.start()

    def record(self, duration: float, status_code: int):
        with self._lock:
            self.request_count += 1
            self.total_duration += duration
            if status_code >= 400:
                self.error_count += 1
            self._recent.append((time.time(), duration, status_code))

    def _sys_loop(self):
        while self._running:
            try:
                import psutil
                mem = psutil.virtual_memory()
                cpu = psutil.cpu_percent(interval=1)
                self._sys_snapshot = {
                    "cpu_pct": round(cpu, 1),
                    "mem_pct": round(mem.percent, 1),
                    "mem_mb": round(mem.used / 1024 / 1024, 1),
                }
            except Exception:
                pass
            for _ in range(60):  # sleep 60s total, interruptible
                if not self._running:
                    return
                time.sleep(1)

    def get_stats(self) -> Dict[str, Any]:
        with self._lock:
            now = time.time()
            window = [r for r in self._recent if now - r[0] < 300]
            avg_ms = (
                round(sum(r[1] for r in window) / len(window) * 1000, 1)
                if window else 0
            )
            err_rate = (
                round(sum(1 for r in window if r[2] >= 400) / len(window) * 100, 1)
                if window else 0
            )
            return {
                "requests_total": self.request_count,
                "errors_total": self.error_count,
                "avg_response_ms": avg_ms,
                "error_rate_pct_5min": err_rate,
                "system": self._sys_snapshot,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

    def stop(self):
        self._running = False


# Single global instance
_monitor = LightMonitor()


class MonitoringMiddleware:
    """Lightweight ASGI middleware — records timing and status code only."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        start = time.time()
        status_code = 200

        async def send_wrapper(message):
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message.get("status", 200)
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        except Exception:
            status_code = 500
            raise
        finally:
            _monitor.record(time.time() - start, status_code)


def get_detailed_health_status() -> Dict[str, Any]:
    return _monitor.get_stats()


def stop_monitoring():
    _monitor.stop()
    logger.info("Monitoring stopped")
