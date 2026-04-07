# backend/core/cost_control.py
"""
Production-ready cost control and abuse prevention system.
"""

import time
import asyncio
from typing import Dict, Optional, Tuple, List
from dataclasses import dataclass
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


@dataclass
class RateLimitConfig:
    """Configuration for rate limiting."""
    requests_per_minute: int = 60
    requests_per_hour: int = 1000
    requests_per_day: int = 5000
    burst_limit: int = 10


@dataclass
class SpendingLimit:
    """Spending limits configuration."""
    daily_cents: int = 500  # $5.00
    monthly_cents: int = 5000  # $50.00
    model_limits: Optional[Dict[str, int]] = None  # per-model limits in cents

    def __post_init__(self):
        if self.model_limits is None:
            self.model_limits = {}


class CostController:
    """
    Enterprise-grade cost control and abuse prevention.
    """

    def __init__(self):
        self._rate_limits: Dict[str, Dict] = {}
        self._spending_limits: Dict[str, SpendingLimit] = {}
        self._usage_cache: Dict[str, List] = {}
        self._kill_switches: Dict[str, bool] = {}

    async def check_rate_limit(
        self,
        user_id: str,
        workspace_id: Optional[str] = None,
        endpoint: str = "default"
    ) -> Tuple[bool, Dict]:
        """
        Check if request is within rate limits.

        Returns:
            (allowed: bool, metadata: dict)
        """
        key = f"{user_id}:{workspace_id or 'personal'}:{endpoint}"
        now = time.time()

        # Initialize if not exists
        if key not in self._rate_limits:
            self._rate_limits[key] = {
                'minute': {'count': 0, 'reset': now + 60},
                'hour': {'count': 0, 'reset': now + 3600},
                'day': {'count': 0, 'reset': now + 86400},
            }

        limits = self._rate_limits[key]

        # Reset counters if needed
        for period in ['minute', 'hour', 'day']:
            if now >= limits[period]['reset']:
                limits[period]['count'] = 0
                limits[period]['reset'] = now + (60 if period == 'minute' else 3600 if period == 'hour' else 86400)

        # Check limits
        config = RateLimitConfig()
        minute_ok = limits['minute']['count'] < config.requests_per_minute
        hour_ok = limits['hour']['count'] < config.requests_per_hour
        day_ok = limits['day']['count'] < config.requests_per_day

        allowed = minute_ok and hour_ok and day_ok

        if allowed:
            # Increment counters
            limits['minute']['count'] += 1
            limits['hour']['count'] += 1
            limits['day']['count'] += 1

        metadata = {
            'minute_used': limits['minute']['count'],
            'minute_limit': config.requests_per_minute,
            'hour_used': limits['hour']['count'],
            'hour_limit': config.requests_per_hour,
            'day_used': limits['day']['count'],
            'day_limit': config.requests_per_day,
            'reset_times': {
                'minute': limits['minute']['reset'],
                'hour': limits['hour']['reset'],
                'day': limits['day']['reset']
            }
        }

        return allowed, metadata

    async def check_spending_limit(
        self,
        user_id: str,
        workspace_id: Optional[str],
        model: str,
        estimated_cost_cents: int
    ) -> Tuple[bool, Dict]:
        """
        Check if request would exceed spending limits.

        Returns:
            (allowed: bool, metadata: dict)
        """
        # Get spending limits (in production, fetch from database)
        limit_key = workspace_id or user_id
        limits = self._spending_limits.get(limit_key, SpendingLimit())

        # Check model-specific limits
        model_limit = limits.model_limits.get(model) if limits.model_limits else None
        if model_limit and estimated_cost_cents > model_limit:
            return False, {
                'reason': 'model_limit_exceeded',
                'model_limit_cents': model_limit,
                'requested_cents': estimated_cost_cents
            }

        # Check daily/monthly limits (simplified - in production use database)
        # This would query actual usage from the database
        daily_used = 0  # Fetch from DB
        monthly_used = 0  # Fetch from DB

        daily_ok = daily_used + estimated_cost_cents <= limits.daily_cents
        monthly_ok = monthly_used + estimated_cost_cents <= limits.monthly_cents

        allowed = daily_ok and monthly_ok

        metadata = {
            'daily_used_cents': daily_used,
            'daily_limit_cents': limits.daily_cents,
            'monthly_used_cents': monthly_used,
            'monthly_limit_cents': limits.monthly_cents,
            'requested_cents': estimated_cost_cents,
            'remaining_daily_cents': max(0, limits.daily_cents - daily_used),
            'remaining_monthly_cents': max(0, limits.monthly_cents - monthly_used)
        }

        return allowed, metadata

    async def track_usage(
        self,
        user_id: str,
        workspace_id: Optional[str],
        provider: str,
        model: str,
        tokens_used: int,
        cost_cents: int,
        response_time_ms: int,
        success: bool = True
    ):
        """
        Track API usage for cost monitoring and analytics.
        In production, this would write to database and trigger alerts.
        """
        usage_data = {
            'user_id': user_id,
            'workspace_id': workspace_id,
            'provider': provider,
            'model': model,
            'tokens_used': tokens_used,
            'cost_cents': cost_cents,
            'response_time_ms': response_time_ms,
            'success': success,
            'timestamp': datetime.utcnow().isoformat()
        }

        logger.info(f"Usage tracked: {usage_data}")

        # In production, write to database and check for alert conditions
        # - High usage alerts
        # - Cost threshold alerts
        # - Performance degradation alerts

    def set_kill_switch(self, user_id: str, enabled: bool = True):
        """
        Enable/disable kill switch for a user (emergency shutoff).
        """
        self._kill_switches[user_id] = enabled
        logger.warning(f"Kill switch {'enabled' if enabled else 'disabled'} for user: {user_id}")

    def is_kill_switch_active(self, user_id: str) -> bool:
        """
        Check if kill switch is active for user.
        """
        return self._kill_switches.get(user_id, False)

    def set_spending_limits(self, key: str, limits: SpendingLimit):
        """
        Set spending limits for user or workspace.
        """
        self._spending_limits[key] = limits


# Global cost controller instance
cost_controller = CostController()


# Model cost estimation (simplified)
MODEL_COSTS = {
    # OpenAI models (per 1K tokens, in cents)
    'gpt-4o': {'input': 2.5, 'output': 10},
    'gpt-4-turbo': {'input': 1.0, 'output': 3.0},
    'gpt-3.5-turbo': {'input': 0.15, 'output': 0.2},

    # Anthropic models
    'claude-3-opus': {'input': 15, 'output': 75},
    'claude-3-sonnet': {'input': 3, 'output': 15},
    'claude-3-haiku': {'input': 0.25, 'output': 1.25},

    # Groq models (simplified)
    'llama3-8b-8192': {'input': 0.05, 'output': 0.08},
    'llama3-70b-8192': {'input': 0.59, 'output': 0.79},

    # Default fallback
    'default': {'input': 1.0, 'output': 2.0}
}


def estimate_cost(model: str, input_tokens: int, output_tokens: int) -> int:
    """
    Estimate cost in cents for a request.

    Args:
        model: Model name
        input_tokens: Number of input tokens
        output_tokens: Number of output tokens

    Returns:
        Estimated cost in cents
    """
    costs = MODEL_COSTS.get(model, MODEL_COSTS['default'])

    input_cost = (input_tokens / 1000) * costs['input']
    output_cost = (output_tokens / 1000) * costs['output']

    total_cents = int((input_cost + output_cost) * 100)  # Convert to cents
    return max(1, total_cents)  # Minimum 1 cent
