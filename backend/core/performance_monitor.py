# backend/core/performance_monitor.py
"""
PERFORMANCE MONITOR v1.1.2 - Advanced performance tracking and optimization
Ensures ASTRAMIND delivers lightning-fast responses with intelligent caching.
"""

import time
import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone, timedelta
from dataclasses import dataclass, field
from collections import defaultdict, deque
import logging

logger = logging.getLogger(__name__)

@dataclass
class PerformanceMetrics:
    """Performance metrics for operations."""
    operation_name: str
    start_time: float
    end_time: Optional[float] = None
    duration: Optional[float] = None
    success: bool = True
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class CacheEntry:
    """Cache entry with TTL and metadata."""
    key: str
    value: Any
    created_at: float
    ttl: float
    access_count: int = 0
    last_accessed: float = field(default_factory=time.time)

class SmartCache:
    """
    Intelligent cache with TTL, LRU eviction, and performance tracking.
    """

    def __init__(self, max_size: int = 1000, default_ttl: float = 300):
        self.cache: Dict[str, CacheEntry] = {}
        self.max_size = max_size
        self.default_ttl = default_ttl
        self.access_order: deque = deque()
        self.hit_count = 0
        self.miss_count = 0

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache if not expired."""
        if key in self.cache:
            entry = self.cache[key]

            # Check TTL
            if time.time() - entry.created_at > entry.ttl:
                del self.cache[key]
                self._remove_from_access_order(key)
                self.miss_count += 1
                return None

            # Update access tracking
            entry.access_count += 1
            entry.last_accessed = time.time()
            self._move_to_front(key)
            self.hit_count += 1

            return entry.value

        self.miss_count += 1
        return None

    def set(self, key: str, value: Any, ttl: Optional[float] = None) -> None:
        """Set value in cache with TTL."""
        if ttl is None:
            ttl = self.default_ttl

        # Remove existing entry if present
        if key in self.cache:
            self._remove_from_access_order(key)

        # Evict if at capacity
        if len(self.cache) >= self.max_size:
            self._evict_lru()

        # Add new entry
        entry = CacheEntry(key, value, time.time(), ttl)
        self.cache[key] = entry
        self.access_order.appendleft(key)

    def delete(self, key: str) -> bool:
        """Delete entry from cache."""
        if key in self.cache:
            del self.cache[key]
            self._remove_from_access_order(key)
            return True
        return False

    def clear(self) -> None:
        """Clear all cache entries."""
        self.cache.clear()
        self.access_order.clear()
        self.hit_count = 0
        self.miss_count = 0

    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        total_requests = self.hit_count + self.miss_count
        hit_rate = self.hit_count / total_requests if total_requests > 0 else 0

        return {
            "size": len(self.cache),
            "max_size": self.max_size,
            "hit_count": self.hit_count,
            "miss_count": self.miss_count,
            "hit_rate": hit_rate,
            "total_requests": total_requests
        }

    def _move_to_front(self, key: str) -> None:
        """Move key to front of access order."""
        try:
            self.access_order.remove(key)
        except ValueError:
            pass
        self.access_order.appendleft(key)

    def _remove_from_access_order(self, key: str) -> None:
        """Remove key from access order."""
        try:
            self.access_order.remove(key)
        except ValueError:
            pass

    def _evict_lru(self) -> None:
        """Evict least recently used entry."""
        while self.access_order:
            lru_key = self.access_order.pop()
            if lru_key in self.cache:
                del self.cache[lru_key]
                break

class PerformanceMonitor:
    """
    Advanced performance monitoring with intelligent caching and metrics.
    """

    def __init__(self):
        self.active_operations: Dict[str, PerformanceMetrics] = {}
        self.completed_operations: deque = deque(maxlen=10000)
        self.cache = SmartCache(max_size=2000, default_ttl=600)  # 10 minute default TTL

        # Performance thresholds
        self.slow_operation_threshold = 2.0  # seconds
        self.very_slow_operation_threshold = 10.0  # seconds

        # Cleanup task will be started when needed
        self._cleanup_task: Optional[asyncio.Task] = None

    async def measure_operation(
        self,
        operation_name: str,
        operation_func: callable,
        *args,
        metadata: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> Any:
        """
        Measure performance of an operation with automatic caching.
        """

        # Create cache key for deterministic operations
        cache_key = self._generate_cache_key(operation_name, args, kwargs) if self._is_cacheable(operation_name) else None

        # Check cache first
        if cache_key:
            cached_result = self.cache.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache hit for {operation_name}")
                return cached_result

        # Start performance measurement
        operation_id = f"{operation_name}_{int(time.time() * 1000000)}"
        metrics = PerformanceMetrics(
            operation_name=operation_name,
            start_time=time.time(),
            metadata=metadata or {}
        )

        self.active_operations[operation_id] = metrics

        try:
            # Execute operation
            result = await operation_func(*args, **kwargs)

            # Mark as successful
            metrics.end_time = time.time()
            metrics.duration = metrics.end_time - metrics.start_time
            metrics.success = True

            # Cache result if cacheable
            if cache_key and self._is_cacheable(operation_name):
                self.cache.set(cache_key, result)

            # Log performance warnings
            await self._log_performance_warnings(metrics)

            return result

        except Exception as e:
            # Mark as failed
            metrics.end_time = time.time()
            metrics.duration = metrics.end_time - metrics.start_time
            metrics.success = False
            metrics.metadata["error"] = str(e)

            raise e

        finally:
            # Move to completed operations
            if operation_id in self.active_operations:
                self.completed_operations.append(self.active_operations.pop(operation_id))

    def get_performance_stats(self) -> Dict[str, Any]:
        """Get comprehensive performance statistics."""
        now = datetime.now(timezone.utc)
        last_hour = now - timedelta(hours=1)

        # Analyze recent operations
        recent_ops = [
            op for op in self.completed_operations
            if op.end_time and datetime.fromtimestamp(op.end_time) > last_hour
        ]

        # Calculate metrics
        total_ops = len(recent_ops)
        successful_ops = len([op for op in recent_ops if op.success])
        failed_ops = total_ops - successful_ops

        if recent_ops:
            avg_duration = sum(op.duration for op in recent_ops if op.duration) / len(recent_ops)
            p95_duration = self._calculate_percentile([op.duration for op in recent_ops if op.duration], 95)
            p99_duration = self._calculate_percentile([op.duration for op in recent_ops if op.duration], 99)
        else:
            avg_duration = p95_duration = p99_duration = 0

        # Count slow operations
        slow_ops = len([op for op in recent_ops if op.duration and op.duration > self.slow_operation_threshold])
        very_slow_ops = len([op for op in recent_ops if op.duration and op.duration > self.very_slow_operation_threshold])

        # Group by operation type
        operation_stats = defaultdict(lambda: {"count": 0, "total_duration": 0, "errors": 0})
        for op in recent_ops:
            op_stat = operation_stats[op.operation_name]
            op_stat["count"] += 1
            if op.duration:
                op_stat["total_duration"] += op.duration
            if not op.success:
                op_stat["errors"] += 1

        return {
            "summary": {
                "total_operations": total_ops,
                "successful_operations": successful_ops,
                "failed_operations": failed_ops,
                "success_rate": successful_ops / total_ops if total_ops > 0 else 0,
                "avg_duration": avg_duration,
                "p95_duration": p95_duration,
                "p99_duration": p99_duration,
                "slow_operations": slow_ops,
                "very_slow_operations": very_slow_ops
            },
            "cache_stats": self.cache.get_stats(),
            "operation_breakdown": dict(operation_stats),
            "active_operations": len(self.active_operations)
        }

    def _generate_cache_key(self, operation_name: str, args: tuple, kwargs: dict) -> str:
        """Generate a cache key from operation parameters."""
        # Create a deterministic string representation
        args_str = "_".join(str(arg) for arg in args if isinstance(arg, (str, int, float, bool)))
        kwargs_str = "_".join(f"{k}:{v}" for k, v in sorted(kwargs.items()) if isinstance(v, (str, int, float, bool)))

        return f"{operation_name}_{args_str}_{kwargs_str}"

    def _is_cacheable(self, operation_name: str) -> bool:
        """Determine if an operation is cacheable."""
        # Cache results for these operation types
        cacheable_operations = [
            "model_info",
            "provider_status",
            "user_preferences",
            "conversation_titles"
        ]

        return any(op in operation_name for op in cacheable_operations)

    def _calculate_percentile(self, values: List[float], percentile: float) -> float:
        """Calculate percentile from a list of values."""
        if not values:
            return 0.0

        values.sort()
        index = int((percentile / 100) * len(values))
        return values[min(index, len(values) - 1)]

    async def _log_performance_warnings(self, metrics: PerformanceMetrics) -> None:
        """Log performance warnings for slow operations."""
        if metrics.duration and metrics.duration > self.very_slow_operation_threshold:
            logger.warning(f"VERY SLOW OPERATION: {metrics.operation_name} took {metrics.duration:.2f}s")
        elif metrics.duration and metrics.duration > self.slow_operation_threshold:
            logger.info(f"SLOW OPERATION: {metrics.operation_name} took {metrics.duration:.2f}s")

    async def _cleanup_expired_operations(self) -> None:
        """Clean up expired operations from active operations."""
        while True:
            try:
                # Remove operations that have been active for more than 5 minutes
                cutoff_time = time.time() - 300
                expired_ops = [
                    op_id for op_id, metrics in self.active_operations.items()
                    if metrics.start_time < cutoff_time
                ]

                for op_id in expired_ops:
                    metrics = self.active_operations.pop(op_id)
                    metrics.success = False
                    metrics.metadata["error"] = "Operation timeout"
                    self.completed_operations.append(metrics)

                await asyncio.sleep(60)  # Check every minute

            except Exception as e:
                logger.error(f"Error in cleanup task: {e}")
                await asyncio.sleep(5)

# Global performance monitor instance
performance_monitor = PerformanceMonitor()

# Start cleanup task when event loop is available
async def start_performance_monitor():
    if performance_monitor._cleanup_task is None:
        performance_monitor._cleanup_task = asyncio.create_task(
            performance_monitor._cleanup_expired_operations()
        )

__all__ = ['PerformanceMonitor', 'SmartCache', 'performance_monitor']
