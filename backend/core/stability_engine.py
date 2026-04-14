# backend/core/stability_engine.py
"""
STABILITY ENGINE v1.1.2 - Advanced error recovery and system stability
Ensures ASTRAMIND runs smoothly with intelligent recovery mechanisms.
"""

import asyncio
import logging
import time
from typing import Dict, List, Optional, Any, Callable, Awaitable
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass, field
import traceback
import sys

from core.config import settings

logger = logging.getLogger(__name__)

@dataclass
class ErrorRecord:
    """Records error information for analysis and recovery."""
    error_id: str
    timestamp: datetime
    error_type: str
    error_message: str
    stack_trace: str
    context: Dict[str, Any]
    recovery_attempts: int = 0
    resolved: bool = False
    recovery_time: Optional[float] = None

@dataclass
class SystemHealth:
    """Tracks system health metrics."""
    uptime: float
    memory_usage: float
    cpu_usage: float
    active_connections: int
    error_rate: float
    recovery_success_rate: float
    last_health_check: datetime

@dataclass
class CircuitBreaker:
    """Circuit breaker pattern for service protection."""
    service_name: str
    failure_threshold: int = 5
    recovery_timeout: float = 60.0
    failure_count: int = 0
    last_failure_time: Optional[float] = None
    state: str = "closed"  # closed, open, half-open

class StabilityEngine:
    """
    Advanced stability engine providing error recovery, circuit breakers,
    health monitoring, and graceful degradation.
    """

    def __init__(self):
        self.error_records: List[ErrorRecord] = []
        self.system_health = SystemHealth(
            uptime=0.0,
            memory_usage=0.0,
            cpu_usage=0.0,
            active_connections=0,
            error_rate=0.0,
            recovery_success_rate=0.0,
            last_health_check=datetime.now(timezone.utc)
        )
        self.circuit_breakers: Dict[str, CircuitBreaker] = {}
        self.recovery_strategies: Dict[str, Callable] = {}
        self.start_time = time.time()
        self.health_check_interval = 30.0  # seconds
        self.error_cleanup_interval = 3600.0  # 1 hour

        self._health_task: asyncio.Task | None = None
        self._cleanup_task: asyncio.Task | None = None

        # Initialize default circuit breakers
        self._initialize_circuit_breakers()

        # Initialize recovery strategies
        self._initialize_recovery_strategies()

        # Don't start background tasks during import - will be started when app starts

    def _initialize_circuit_breakers(self):
        """Initialize circuit breakers for critical services."""
        services = [
            "ai_router",
            "database",
            "cache",
            "external_api",
            "file_storage",
            "authentication"
        ]

        for service in services:
            self.circuit_breakers[service] = CircuitBreaker(service_name=service)

    def _initialize_recovery_strategies(self):
        """Initialize recovery strategies for different error types."""
        self.recovery_strategies = {
            "database_connection": self._recover_database_connection,
            "ai_provider_timeout": self._recover_ai_provider_timeout,
            "memory_error": self._recover_memory_error,
            "network_error": self._recover_network_error,
            "authentication_error": self._recover_authentication_error
        }

    async def execute_with_stability(
        self,
        operation: Callable[[], Awaitable[Any]],
        service_name: str,
        operation_name: str,
        fallback: Optional[Callable[[], Awaitable[Any]]] = None
    ) -> Any:
        """
        Execute operation with stability guarantees.
        Implements circuit breaker pattern, error recovery, and graceful degradation.
        """

        # Check circuit breaker
        if not self._check_circuit_breaker(service_name):
            if fallback:
                logger.warning(f"Circuit breaker open for {service_name}, using fallback")
                try:
                    return await fallback()
                except Exception as fallback_error:
                    logger.error(f"Fallback also failed for {service_name}: {fallback_error}")
                    # Return a safe default response
                    return self._get_safe_default_response(service_name, operation_name)
            raise RuntimeError(f"Service {service_name} is currently unavailable")

        try:
            # Execute operation with timeout protection
            result = await asyncio.wait_for(operation(), timeout=settings.REQUEST_TIMEOUT_SECONDS or 60)

            # Reset circuit breaker on success
            self._reset_circuit_breaker(service_name)

            return result

        except asyncio.TimeoutError:
            logger.error(f"Operation timeout for {service_name}.{operation_name}")
            await self._record_error(
                error_type="TimeoutError",
                error_message=f"Operation timed out after {settings.REQUEST_TIMEOUT_SECONDS or 60}s",
                context={"service": service_name, "operation": operation_name}
            )
            self._record_circuit_failure(service_name)
            
            if fallback:
                logger.warning(f"Using fallback after timeout for {service_name}.{operation_name}")
                return await fallback()
            
            return self._get_safe_default_response(service_name, operation_name)

        except Exception as e:
            # Record failure (no stack trace in production for security)
            error_details = {}
            if settings.ENV == "development":
                error_details["stack_trace"] = traceback.format_exc()
            
            await self._record_error(
                error_type=type(e).__name__,
                error_message=str(e) if settings.ENV == "development" else "An error occurred",
                context={
                    "service": service_name,
                    "operation": operation_name,
                    **error_details
                }
            )

            # Update circuit breaker
            self._record_circuit_failure(service_name)

            # Attempt recovery
            if await self._attempt_recovery(service_name, e):
                # Retry operation after recovery
                try:
                    result = await asyncio.wait_for(operation(), timeout=settings.REQUEST_TIMEOUT_SECONDS or 60)
                    logger.info(f"Recovery successful for {service_name}.{operation_name}")
                    return result
                except Exception as retry_error:
                    logger.error(f"Retry failed after recovery: {retry_error}")

            # Use fallback if available
            if fallback:
                logger.warning(f"Using fallback for {service_name}.{operation_name}")
                try:
                    return await fallback()
                except Exception as fallback_error:
                    logger.error(f"Fallback also failed for {service_name}: {fallback_error}")

            # Return safe default response instead of raising
            logger.error(f"All recovery attempts failed for {service_name}.{operation_name}")
            return self._get_safe_default_response(service_name, operation_name)

    def _get_safe_default_response(self, service_name: str, operation_name: str) -> Any:
        """Return a safe default response when all else fails."""
        
        if service_name == "ai_router" and operation_name == "chat_stream":
            # For chat streaming, return a helpful error message as a stream
            async def error_stream():
                yield "We're experiencing high traffic. Please try again in a moment! ✨"
            return error_stream()
        
        # Generic fallback for other operations
        return {"status": "degraded", "message": "Service temporarily unavailable"}

    async def _record_error(
        self,
        error_type: str,
        error_message: str,
        context: Dict[str, Any]
    ):
        """Record error for analysis and recovery."""
        error_record = ErrorRecord(
            error_id=f"{int(time.time())}_{len(self.error_records)}",
            timestamp=datetime.now(timezone.utc),
            error_type=error_type,
            error_message=error_message,
            stack_trace=context.get("stack_trace", ""),
            context=context
        )

        self.error_records.append(error_record)

        # Keep only recent errors (last 1000)
        if len(self.error_records) > 1000:
            self.error_records = self.error_records[-1000:]

        logger.error(f"Error recorded: {error_type} - {error_message}")

    def _check_circuit_breaker(self, service_name: str) -> bool:
        """Check if circuit breaker allows operation."""
        cb = self.circuit_breakers.get(service_name)
        if not cb:
            return True

        if cb.state == "closed":
            return True
        elif cb.state == "open":
            # Check if recovery timeout has passed
            if time.time() - (cb.last_failure_time or 0) > cb.recovery_timeout:
                cb.state = "half-open"
                logger.info(f"Circuit breaker for {service_name} moved to half-open")
                return True
            return False
        elif cb.state == "half-open":
            return True

        return True

    def _record_circuit_failure(self, service_name: str):
        """Record circuit breaker failure."""
        cb = self.circuit_breakers.get(service_name)
        if not cb:
            return

        cb.failure_count += 1
        cb.last_failure_time = time.time()

        if cb.failure_count >= cb.failure_threshold:
            cb.state = "open"
            logger.warning(f"Circuit breaker for {service_name} opened")

    def _reset_circuit_breaker(self, service_name: str):
        """Reset circuit breaker on success."""
        cb = self.circuit_breakers.get(service_name)
        if cb:
            cb.failure_count = 0
            if cb.state == "half-open":
                cb.state = "closed"
                logger.info(f"Circuit breaker for {service_name} closed")

    async def _attempt_recovery(self, service_name: str, error: Exception) -> bool:
        """Attempt to recover from error."""
        error_type = type(error).__name__
        recovery_strategy = self.recovery_strategies.get(error_type)

        if not recovery_strategy:
            return False

        try:
            success = await recovery_strategy(service_name, error)
            if success:
                logger.info(f"Recovery successful for {error_type}")
                return True
            else:
                logger.warning(f"Recovery failed for {error_type}")
                return False
        except Exception as recovery_error:
            logger.error(f"Recovery strategy failed: {recovery_error}")
            return False

    # Recovery Strategies
    async def _recover_database_connection(self, service_name: str, error: Exception) -> bool:
        """Recover database connection."""
        # Implement database reconnection logic
        logger.info("Attempting database reconnection...")
        await asyncio.sleep(1)  # Simulate reconnection time
        # In real implementation, would reconnect to database
        return True

    async def _recover_ai_provider_timeout(self, service_name: str, error: Exception) -> bool:
        """Recover from AI provider timeout."""
        logger.info("Attempting AI provider recovery...")
        await asyncio.sleep(0.5)  # Brief pause
        # In real implementation, would switch providers or retry
        return True

    async def _recover_memory_error(self, service_name: str, error: Exception) -> bool:
        """Recover from memory error."""
        logger.info("Attempting memory recovery...")
        # Force garbage collection
        import gc
        gc.collect()
        return True

    async def _recover_network_error(self, service_name: str, error: Exception) -> bool:
        """Recover from network error."""
        logger.info("Attempting network recovery...")
        await asyncio.sleep(2)  # Wait for network recovery
        return True

    async def _recover_authentication_error(self, service_name: str, error: Exception) -> bool:
        """Recover from authentication error."""
        logger.info("Attempting authentication recovery...")
        # In real implementation, would refresh tokens
        return False  # Usually can't auto-recover auth errors

    async def _health_monitor(self):
        """Background health monitoring."""
        try:
            while True:
                try:
                    await self._update_health_metrics()
                    await asyncio.sleep(self.health_check_interval)
                except Exception as e:
                    logger.error(f"Health monitor error: {e}")
                    await asyncio.sleep(5)
        except asyncio.CancelledError:
            return

    async def _error_cleanup(self):
        """Background error cleanup."""
        try:
            while True:
                try:
                    await self._cleanup_old_errors()
                    await asyncio.sleep(self.error_cleanup_interval)
                except Exception as e:
                    logger.error(f"Error cleanup error: {e}")
                    await asyncio.sleep(60)
        except asyncio.CancelledError:
            return

    async def _update_health_metrics(self):
        """Update system health metrics."""
        try:
            import psutil
            current_time = datetime.now(timezone.utc)

            self.system_health.uptime = time.time() - self.start_time
            self.system_health.memory_usage = psutil.virtual_memory().percent
            # Non-blocking: do not sleep inside the event loop.
            self.system_health.cpu_usage = psutil.cpu_percent(interval=None)
            self.system_health.last_health_check = current_time

            # Calculate error rate (errors per minute in last hour)
            recent_errors = [
                e for e in self.error_records
                if (current_time - e.timestamp).total_seconds() < 3600
            ]
            self.system_health.error_rate = len(recent_errors) / 60.0

            # Calculate recovery success rate
            recovery_attempts = sum(1 for e in recent_errors if e.recovery_attempts > 0)
            successful_recoveries = sum(1 for e in recent_errors if e.resolved)
            self.system_health.recovery_success_rate = (
                successful_recoveries / recovery_attempts if recovery_attempts > 0 else 1.0
            )

        except ImportError:
            # psutil not available, use basic metrics
            current_time = datetime.now(timezone.utc)
            self.system_health.uptime = time.time() - self.start_time
            self.system_health.memory_usage = 0.0  # Unknown
            self.system_health.cpu_usage = 0.0  # Unknown
            self.system_health.last_health_check = current_time

            # Calculate error rate (errors per minute in last hour)
            recent_errors = [
                e for e in self.error_records
                if (current_time - e.timestamp).total_seconds() < 3600
            ]
            self.system_health.error_rate = len(recent_errors) / 60.0
            self.system_health.recovery_success_rate = 1.0  # Assume success when no monitoring

    async def _cleanup_old_errors(self):
        """Clean up old error records."""
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=24)
        self.error_records = [
            e for e in self.error_records
            if e.timestamp > cutoff_time
        ]

    def get_health_status(self) -> Dict[str, Any]:
        """Get current health status."""
        return {
            "uptime": self.system_health.uptime,
            "memory_usage": self.system_health.memory_usage,
            "cpu_usage": self.system_health.cpu_usage,
            "error_rate": self.system_health.error_rate,
            "recovery_success_rate": self.system_health.recovery_success_rate,
            "circuit_breakers": {
                name: {
                    "state": cb.state,
                    "failure_count": cb.failure_count
                }
                for name, cb in self.circuit_breakers.items()
            },
            "recent_errors": len([
                e for e in self.error_records
                if (datetime.now(timezone.utc) - e.timestamp).total_seconds() < 3600
            ])
        }

    def get_error_summary(self) -> Dict[str, Any]:
        """Get error summary for monitoring."""
        error_types = {}
        for error in self.error_records[-100:]:  # Last 100 errors
            error_types[error.error_type] = error_types.get(error.error_type, 0) + 1

        # Calculate average recovery time safely
        errors_with_recovery = [e for e in self.error_records if e.recovery_time is not None]
        avg_recovery_time = (
            sum(e.recovery_time for e in errors_with_recovery) / len(errors_with_recovery)
            if errors_with_recovery else 0.0
        )

        return {
            "total_errors": len(self.error_records),
            "error_types": error_types,
            "unresolved_errors": len([e for e in self.error_records if not e.resolved]),
            "average_recovery_time": avg_recovery_time
        }

# Global stability engine instance - background tasks will be started when app starts
class LazyStabilityEngine:
    def __init__(self):
        self._instance = None
    
    def __getattr__(self, name):
        if self._instance is None:
            self._instance = StabilityEngine()
        return getattr(self._instance, name)

    def start_background_tasks(self):
        if self._instance is None:
            self._instance = StabilityEngine()
        loop = asyncio.get_event_loop()
        if loop.is_running():
            if self._instance._health_task is None or self._instance._health_task.done():
                self._instance._health_task = asyncio.create_task(self._instance._health_monitor())
            if self._instance._cleanup_task is None or self._instance._cleanup_task.done():
                self._instance._cleanup_task = asyncio.create_task(self._instance._error_cleanup())

    async def stop_background_tasks(self) -> None:
        if self._instance is None:
            return
        for task in (self._instance._health_task, self._instance._cleanup_task):
            if task is not None and not task.done():
                task.cancel()
        for task in (self._instance._health_task, self._instance._cleanup_task):
            if task is not None:
                try:
                    await task
                except asyncio.CancelledError:
                    pass

stability_engine = LazyStabilityEngine()

__all__ = ['StabilityEngine', 'stability_engine']
