"""
Production-Grade Monitoring & Observability System
Comprehensive metrics collection, logging, and alerting for 100k+ concurrent users.
"""

import time
import json
import logging
import asyncio
from typing import Dict, List, Any, Optional, Callable
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass, asdict
from collections import defaultdict, deque
from enum import Enum
import psutil
import socket
import threading
from contextlib import contextmanager
import traceback

from core.config import settings

logger = logging.getLogger(__name__)


class MetricType(Enum):
    """Types of metrics to collect."""
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    TIMER = "timer"


@dataclass
class Metric:
    """Metric data structure."""
    name: str
    value: float
    type: MetricType
    labels: Dict[str, str]
    timestamp: datetime
    description: str = ""


@dataclass
class Alert:
    """Alert data structure."""
    id: str
    severity: str  # critical, warning, info
    message: str
    metric_name: str
    threshold: float
    current_value: float
    timestamp: datetime
    resolved: bool = False


class MetricsCollector:
    """Collects and stores application metrics."""
    
    def __init__(self):
        self.metrics: Dict[str, List[Metric]] = defaultdict(list)
        self.alerts: Dict[str, Alert] = {}
        self.alert_rules: List[Dict] = []
        self._lock = threading.Lock()
        self._cleanup_interval = 3600  # 1 hour
        self._max_metrics_per_name = 10000
        
        # System metrics
        self.system_metrics = {
            "cpu_usage": deque(maxlen=100),
            "memory_usage": deque(maxlen=100),
            "disk_usage": deque(maxlen=100),
            "network_io": deque(maxlen=100),
        }
        
        # Application metrics
        self.app_metrics = {
            "request_count": 0,
            "error_count": 0,
            "total_response_time": 0.0,
            "active_connections": 0,
            "database_connections": 0,
            "cache_hits": 0,
            "cache_misses": 0,
        }
        
        # Start background collection
        self._running = True
        self._collection_thread = threading.Thread(target=self._collect_system_metrics, daemon=True)
        self._collection_thread.start()
        
        # Start alert evaluation
        self._alert_thread = threading.Thread(target=self._evaluate_alerts, daemon=True)
        self._alert_thread.start()
    
    def add_metric(self, name: str, value: float, metric_type: MetricType, 
                   labels: Optional[Dict[str, str]] = None, description: str = ""):
        """Add a new metric."""
        with self._lock:
            metric = Metric(
                name=name,
                value=value,
                type=metric_type,
                labels=labels or {},
                timestamp=datetime.now(timezone.utc),
                description=description
            )
            
            self.metrics[name].append(metric)
            
            # Keep only recent metrics
            if len(self.metrics[name]) > self._max_metrics_per_name:
                self.metrics[name] = self.metrics[name][-self._max_metrics_per_name:]
            
            # Update application metrics
            if name in self.app_metrics:
                if metric_type == MetricType.COUNTER:
                    self.app_metrics[name] += value
                elif metric_type == MetricType.GAUGE:
                    self.app_metrics[name] = value
    
    def get_metric_history(self, name: str, hours: int = 1) -> List[Metric]:
        """Get metric history for the last N hours."""
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        with self._lock:
            return [m for m in self.metrics.get(name, []) if m.timestamp >= cutoff]
    
    def get_current_value(self, name: str) -> Optional[float]:
        """Get current value of a metric."""
        with self._lock:
            history = self.metrics.get(name, [])
            if history:
                return history[-1].value
            return None
    
    def add_alert_rule(self, rule: Dict[str, Any]):
        """Add an alert rule."""
        self.alert_rules.append(rule)
    
    def _collect_system_metrics(self):
        """Background thread to collect system metrics."""
        while self._running:
            try:
                # CPU usage
                cpu_percent = psutil.cpu_percent(interval=1)
                self.system_metrics["cpu_usage"].append(cpu_percent)
                
                # Memory usage
                memory = psutil.virtual_memory()
                self.system_metrics["memory_usage"].append(memory.percent)
                
                # Disk usage
                disk = psutil.disk_usage('/')
                disk_percent = (disk.used / disk.total) * 100
                self.system_metrics["disk_usage"].append(disk_percent)
                
                # Network I/O
                net_io = psutil.net_io_counters()
                self.system_metrics["network_io"].append({
                    'bytes_sent': net_io.bytes_sent,
                    'bytes_recv': net_io.bytes_recv,
                    'packets_sent': net_io.packets_sent,
                    'packets_recv': net_io.packets_recv,
                })
                
                # Add to metrics
                self.add_metric("system.cpu.usage", cpu_percent, MetricType.GAUGE, 
                               {"host": socket.gethostname()})
                self.add_metric("system.memory.usage", memory.percent, MetricType.GAUGE,
                               {"host": socket.gethostname()})
                self.add_metric("system.disk.usage", disk_percent, MetricType.GAUGE,
                               {"host": socket.gethostname()})
                
                for _ in range(10):
                    if not self._running:
                        break
                    time.sleep(1)
                
            except Exception as e:
                logger.error(f"Error collecting system metrics: {e}")
                for _ in range(5):
                    if not self._running:
                        break
                    time.sleep(1)
    
    def _evaluate_alerts(self):
        """Background thread to evaluate alert rules."""
        while self._running:
            try:
                current_time = datetime.now(timezone.utc)
                
                for rule in self.alert_rules:
                    metric_name = rule["metric"]
                    threshold = rule["threshold"]
                    condition = rule["condition"]  # gt, lt, eq
                    severity = rule.get("severity", "warning")
                    
                    current_value = self.get_current_value(metric_name)
                    
                    if current_value is not None:
                        alert_id = f"{metric_name}_{condition}_{threshold}"
                        
                        should_alert = False
                        if condition == "gt" and current_value > threshold:
                            should_alert = True
                        elif condition == "lt" and current_value < threshold:
                            should_alert = True
                        elif condition == "eq" and current_value == threshold:
                            should_alert = True
                        
                        if should_alert:
                            if alert_id not in self.alerts:
                                alert = Alert(
                                    id=alert_id,
                                    severity=severity,
                                    message=f"{metric_name} is {current_value} (threshold: {threshold})",
                                    metric_name=metric_name,
                                    threshold=threshold,
                                    current_value=current_value,
                                    timestamp=current_time
                                )
                                self.alerts[alert_id] = alert
                                if settings.ENABLE_ALERT_LOGS and not settings.is_development():
                                    logger.warning(f"ALERT: {alert.message}")
                        else:
                            if alert_id in self.alerts:
                                self.alerts[alert_id].resolved = True
                                logger.info(f"ALERT RESOLVED: {metric_name} is back to normal")
                
                for _ in range(30):
                    if not self._running:
                        break
                    time.sleep(1)
                
            except Exception as e:
                logger.error(f"Error evaluating alerts: {e}")
                for _ in range(10):
                    if not self._running:
                        break
                    time.sleep(1)
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get overall health status."""
        cpu_avg = sum(self.system_metrics["cpu_usage"]) / len(self.system_metrics["cpu_usage"]) if self.system_metrics["cpu_usage"] else 0
        memory_avg = sum(self.system_metrics["memory_usage"]) / len(self.system_metrics["memory_usage"]) if self.system_metrics["memory_usage"] else 0
        disk_avg = sum(self.system_metrics["disk_usage"]) / len(self.system_metrics["disk_usage"]) if self.system_metrics["disk_usage"] else 0
        
        # Determine health status
        status = "healthy"
        if cpu_avg > 80 or memory_avg > 85 or disk_avg > 90:
            status = "critical"
        elif cpu_avg > 60 or memory_avg > 70 or disk_avg > 80:
            status = "warning"
        
        return {
            "status": status,
            "cpu_usage": round(cpu_avg, 2),
            "memory_usage": round(memory_avg, 2),
            "disk_usage": round(disk_avg, 2),
            "active_alerts": len([a for a in self.alerts.values() if not a.resolved]),
            "total_alerts": len(self.alerts),
            "app_metrics": self.app_metrics.copy(),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    def cleanup(self):
        """Clean up old metrics."""
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
        
        with self._lock:
            for metric_name in list(self.metrics.keys()):
                self.metrics[metric_name] = [
                    m for m in self.metrics[metric_name] 
                    if m.timestamp >= cutoff
                ]
                
                if not self.metrics[metric_name]:
                    del self.metrics[metric_name]


class RequestTracker:
    """Tracks individual requests for detailed monitoring."""
    
    def __init__(self):
        self.active_requests: Dict[str, Dict] = {}
        self.request_history: deque = deque(maxlen=10000)
        self._lock = threading.Lock()
    
    def start_request(self, request_id: str, method: str, path: str, user_id: Optional[str] = None):
        """Start tracking a request."""
        with self._lock:
            self.active_requests[request_id] = {
                "request_id": request_id,
                "method": method,
                "path": path,
                "user_id": user_id,
                "start_time": time.time(),
                "status": "active",
                "error": None
            }
    
    def end_request(self, request_id: str, status_code: int, error: Optional[str] = None):
        """End tracking a request."""
        with self._lock:
            if request_id in self.active_requests:
                request = self.active_requests[request_id]
                duration = time.time() - request["start_time"]
                
                request.update({
                    "end_time": time.time(),
                    "duration": duration,
                    "status_code": status_code,
                    "error": error,
                    "status": "completed"
                })
                
                # Move to history
                self.request_history.append(request.copy())
                del self.active_requests[request_id]
                
                return duration
            return 0
    
    def get_active_requests(self) -> List[Dict]:
        """Get currently active requests."""
        with self._lock:
            return list(self.active_requests.values())
    
    def get_slow_requests(self, threshold: float = 1.0) -> List[Dict]:
        """Get requests that took longer than threshold."""
        with self._lock:
            return [
                r for r in self.request_history 
                if r.get("duration", 0) > threshold
            ]
    
    def get_error_rate(self, minutes: int = 60) -> float:
        """Get error rate for the last N minutes."""
        cutoff = time.time() - (minutes * 60)
        
        with self._lock:
            recent_requests = [
                r for r in self.request_history 
                if r.get("end_time", 0) >= cutoff
            ]
            
            if not recent_requests:
                return 0.0
            
            errors = [r for r in recent_requests if r.get("status_code", 0) >= 400 or r.get("error")]
            return (len(errors) / len(recent_requests)) * 100


class DistributedTracer:
    """Distributed tracing for microservices architecture."""
    
    def __init__(self):
        self.spans: Dict[str, Dict] = {}
        self._lock = threading.Lock()
    
    def start_span(self, span_id: str, operation_name: str, parent_span_id: Optional[str] = None):
        """Start a new span."""
        with self._lock:
            self.spans[span_id] = {
                "span_id": span_id,
                "operation_name": operation_name,
                "parent_span_id": parent_span_id,
                "start_time": time.time(),
                "end_time": None,
                "duration": None,
                "tags": {},
                "logs": [],
                "error": None
            }
    
    def end_span(self, span_id: str, error: Optional[str] = None):
        """End a span."""
        with self._lock:
            if span_id in self.spans:
                span = self.spans[span_id]
                span["end_time"] = time.time()
                span["duration"] = span["end_time"] - span["start_time"]
                span["error"] = error
    
    def add_tag(self, span_id: str, key: str, value: Any):
        """Add a tag to a span."""
        with self._lock:
            if span_id in self.spans:
                self.spans[span_id]["tags"][key] = value
    
    def add_log(self, span_id: str, message: str, level: str = "info"):
        """Add a log to a span."""
        with self._lock:
            if span_id in self.spans:
                self.spans[span_id]["logs"].append({
                    "timestamp": time.time(),
                    "level": level,
                    "message": message
                })
    
    def get_trace(self, root_span_id: str) -> List[Dict]:
        """Get a complete trace starting from root span."""
        trace = []
        
        def collect_spans(span_id: str):
            if span_id in self.spans:
                trace.append(self.spans[span_id])
                # Find child spans
                for span in self.spans.values():
                    if span["parent_span_id"] == span_id:
                        collect_spans(span["span_id"])
        
        collect_spans(root_span_id)
        return trace


class PerformanceProfiler:
    """Performance profiling for bottleneck identification."""
    
    def __init__(self):
        self.profiles: Dict[str, Dict] = {}
        self._lock = threading.Lock()
    
    @contextmanager
    def profile(self, name: str):
        """Profile a block of code."""
        start_time = time.time()
        start_memory = psutil.Process().memory_info().rss / 1024 / 1024  # MB
        
        try:
            yield
        finally:
            end_time = time.time()
            end_memory = psutil.Process().memory_info().rss / 1024 / 1024  # MB
            
            duration = end_time - start_time
            memory_delta = end_memory - start_memory
            
            with self._lock:
                if name not in self.profiles:
                    self.profiles[name] = {
                        "total_calls": 0,
                        "total_time": 0.0,
                        "total_memory": 0.0,
                        "min_time": float('inf'),
                        "max_time": 0.0,
                        "min_memory": float('inf'),
                        "max_memory": 0.0
                    }
                
                profile = self.profiles[name]
                profile["total_calls"] += 1
                profile["total_time"] += duration
                profile["total_memory"] += memory_delta
                profile["min_time"] = min(profile["min_time"], duration)
                profile["max_time"] = max(profile["max_time"], duration)
                profile["min_memory"] = min(profile["min_memory"], memory_delta)
                profile["max_memory"] = max(profile["max_memory"], memory_delta)
    
    def get_profile_report(self) -> Dict[str, Dict]:
        """Get profiling report."""
        with self._lock:
            report = {}
            for name, profile in self.profiles.items():
                avg_time = profile["total_time"] / profile["total_calls"]
                avg_memory = profile["total_memory"] / profile["total_calls"]
                
                report[name] = {
                    "total_calls": profile["total_calls"],
                    "total_time": round(profile["total_time"], 4),
                    "avg_time": round(avg_time, 4),
                    "min_time": round(profile["min_time"], 4),
                    "max_time": round(profile["max_time"], 4),
                    "total_memory_mb": round(profile["total_memory"], 2),
                    "avg_memory_mb": round(avg_memory, 2),
                    "min_memory_mb": round(profile["min_memory"], 2),
                    "max_memory_mb": round(profile["max_memory"], 2)
                }
            return report


# Global instances
metrics_collector = MetricsCollector()
request_tracker = RequestTracker()
tracer = DistributedTracer()
profiler = PerformanceProfiler()


# Alert rules for production monitoring
def setup_alert_rules():
    """Setup production alert rules."""
    # CPU usage alert
    metrics_collector.add_alert_rule({
        "metric": "system.cpu.usage",
        "condition": "gt",
        "threshold": 80.0,
        "severity": "critical",
        "description": "High CPU usage"
    })
    
    # Memory usage alert
    metrics_collector.add_alert_rule({
        "metric": "system.memory.usage",
        "condition": "gt",
        "threshold": 85.0,
        "severity": "critical",
        "description": "High memory usage"
    })
    
    # Disk usage alert
    metrics_collector.add_alert_rule({
        "metric": "system.disk.usage",
        "condition": "gt",
        "threshold": 90.0,
        "severity": "critical",
        "description": "High disk usage"
    })
    
    # Error rate alert
    metrics_collector.add_alert_rule({
        "metric": "app.error_rate",
        "condition": "gt",
        "threshold": 5.0,
        "severity": "warning",
        "description": "High error rate"
    })
    
    # Response time alert
    metrics_collector.add_alert_rule({
        "metric": "app.avg_response_time",
        "condition": "gt",
        "threshold": 2.0,
        "severity": "warning",
        "description": "High response time"
    })


# Request monitoring middleware
class MonitoringMiddleware:
    """FastAPI middleware for request monitoring."""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        # Generate request ID
        request_id = f"req_{int(time.time() * 1000000)}"
        
        # Start tracking
        request_tracker.start_request(
            request_id=request_id,
            method=scope.get("method", "UNKNOWN"),
            path=scope.get("path", "/"),
            user_id=scope.get("user_id")
        )
        
        # Start span
        span_id = f"span_{request_id}"
        tracer.start_span(span_id, "http_request")
        tracer.add_tag(span_id, "http.method", scope.get("method", "UNKNOWN"))
        tracer.add_tag(span_id, "http.path", scope.get("path", "/"))
        
        start_time = time.time()
        
        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                status_code = message["status"]
                duration = time.time() - start_time
                
                # End tracking
                request_tracker.end_request(request_id, status_code)
                
                # End span
                tracer.end_span(span_id)
                tracer.add_tag(span_id, "http.status_code", status_code)
                tracer.add_tag(span_id, "duration", duration)
                
                # Update metrics
                metrics_collector.add_metric("app.request_count", 1, MetricType.COUNTER)
                metrics_collector.add_metric("app.response_time", duration, MetricType.HISTOGRAM)
                
                if status_code >= 400:
                    metrics_collector.add_metric("app.error_count", 1, MetricType.COUNTER)
                
                # Calculate error rate
                error_rate = request_tracker.get_error_rate(5)  # Last 5 minutes
                metrics_collector.add_metric("app.error_rate", error_rate, MetricType.GAUGE)
                
                # Calculate average response time
                avg_response_time = self._calculate_avg_response_time()
                metrics_collector.add_metric("app.avg_response_time", avg_response_time, MetricType.GAUGE)
            
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        except Exception:
            # Ensure tracking is ended even if the handler raises before response.start
            duration = time.time() - start_time
            request_tracker.end_request(request_id, 500)
            metrics_collector.add_metric("app.request_count", 1, MetricType.COUNTER)
            metrics_collector.add_metric("app.error_count", 1, MetricType.COUNTER)
            metrics_collector.add_metric("app.response_time", duration, MetricType.HISTOGRAM)
            tracer.end_span(span_id)
            raise
    
    def _calculate_avg_response_time(self) -> float:
        """Calculate average response time from recent requests."""
        recent_requests = [
            r for r in request_tracker.request_history 
            if time.time() - r.get("end_time", 0) < 300  # Last 5 minutes
        ]
        
        if not recent_requests:
            return 0.0
        
        total_time = sum(r.get("duration", 0) for r in recent_requests)
        return total_time / len(recent_requests)


# Health check endpoint data
def get_detailed_health_status() -> Dict[str, Any]:
    """Get detailed health status for monitoring."""
    health = metrics_collector.get_health_status()
    
    # Add request tracking info
    health["active_requests"] = len(request_tracker.get_active_requests())
    health["slow_requests"] = len(request_tracker.get_slow_requests(1.0))
    health["error_rate_5min"] = request_tracker.get_error_rate(5)
    health["error_rate_15min"] = request_tracker.get_error_rate(15)
    
    # Add profiling info
    health["performance_profiles"] = profiler.get_profile_report()
    
    # Add recent alerts
    health["recent_alerts"] = [
        {
            "id": alert.id,
            "severity": alert.severity,
            "message": alert.message,
            "timestamp": alert.timestamp.isoformat(),
            "resolved": alert.resolved
        }
        for alert in list(metrics_collector.alerts.values())[-10:]
    ]
    
    return health


# Cleanup function
def stop_monitoring():
    """Stop background monitoring threads and cleanup metrics."""
    try:
        metrics_collector._running = False
        # Allow threads to break from sleep loops
        time.sleep(0.1)
    except Exception as e:
        logger.error(f"Error stopping monitoring: {e}")
    metrics_collector.cleanup()
    logger.info("Monitoring cleanup completed")


# Initialize alert rules
setup_alert_rules()
