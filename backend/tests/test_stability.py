import pytest
import httpx
import asyncio
from unittest.mock import patch, AsyncMock, MagicMock


@pytest.mark.anyio
async def test_circuit_breaker_closed_state():
    """Test circuit breaker starts in closed state."""
    from core.stability_engine import StabilityEngine
    
    engine = StabilityEngine()
    cb = engine.circuit_breakers.get("ai_router")
    assert cb is not None
    assert cb.state == "closed"


@pytest.mark.anyio
async def test_circuit_breaker_opens_after_failures():
    """Test circuit breaker opens after threshold failures."""
    from core.stability_engine import StabilityEngine
    
    engine = StabilityEngine()
    cb = engine.circuit_breakers["ai_router"]
    cb.failure_threshold = 3
    
    # Record failures
    for _ in range(3):
        engine._record_circuit_failure("ai_router")
    
    assert cb.state == "open"


@pytest.mark.anyio
async def test_circuit_breaker_half_open_after_timeout():
    """Test circuit breaker moves to half-open after timeout."""
    import time
    from core.stability_engine import StabilityEngine
    
    engine = StabilityEngine()
    cb = engine.circuit_breakers["ai_router"]
    cb.failure_threshold = 1
    cb.recovery_timeout = 0.1  # 100ms
    
    # Trigger failure and open circuit
    engine._record_circuit_failure("ai_router")
    assert cb.state == "open"
    
    # Wait for recovery timeout
    await asyncio.sleep(0.2)
    
    # Check should move to half-open
    result = engine._check_circuit_breaker("ai_router")
    assert cb.state == "half-open"
    assert result is True


@pytest.mark.anyio
async def test_stability_execute_success():
    """Test stability engine returns result on success."""
    from core.stability_engine import StabilityEngine
    
    engine = StabilityEngine()
    
    async def successful_operation():
        return "success"
    
    result = await engine.execute_with_stability(
        operation=successful_operation,
        service_name="ai_router",
        operation_name="test"
    )
    
    assert result == "success"


@pytest.mark.anyio
async def test_stability_execute_fallback_on_failure():
    """Test stability engine uses fallback on failure."""
    from core.stability_engine import StabilityEngine
    
    engine = StabilityEngine()
    
    async def failing_operation():
        raise Exception("Test error")
    
    async def fallback():
        return "fallback_response"
    
    result = await engine.execute_with_stability(
        operation=failing_operation,
        service_name="ai_router",
        operation_name="test",
        fallback=fallback
    )
    
    assert result == "fallback_response"


@pytest.mark.anyio
async def test_error_record_creation():
    """Test error recording functionality."""
    from core.stability_engine import StabilityEngine
    
    engine = StabilityEngine()
    
    await engine._record_error(
        error_type="TestError",
        error_message="Test message",
        context={"test": "context"}
    )
    
    assert len(engine.error_records) == 1
    assert engine.error_records[0].error_type == "TestError"


@pytest.mark.anyio
async def test_health_status_returns_valid_data():
    """Test health status returns valid data."""
    from core.stability_engine import StabilityEngine
    
    engine = StabilityEngine()
    status = engine.get_health_status()
    
    assert "uptime" in status
    assert "error_rate" in status
    assert "recovery_success_rate" in status
    assert "circuit_breakers" in status
    assert "recent_errors" in status


@pytest.mark.anyio
async def test_error_summary():
    """Test error summary functionality."""
    from core.stability_engine import StabilityEngine
    
    engine = StabilityEngine()
    
    # Add some test errors
    await engine._record_error("Error1", "msg1", {})
    await engine._record_error("Error2", "msg2", {})
    await engine._record_error("Error1", "msg3", {})
    
    summary = engine.get_error_summary()
    
    assert summary["total_errors"] == 3
    assert "Error1" in summary["error_types"]
    assert summary["error_types"]["Error1"] == 2


@pytest.mark.anyio
async def test_quota_config_values():
    """Test quota configuration is properly set."""
    from core.config import settings
    
    # Verify new quota settings exist and have correct defaults
    assert hasattr(settings, 'USER_DAILY_QUOTA')
    assert hasattr(settings, 'ADMIN_DAILY_QUOTA')
    assert hasattr(settings, 'PREMIUM_DAILY_QUOTA')
    assert hasattr(settings, 'ENABLE_QUOTA_TIERS')
    
    # Check default values
    assert settings.USER_DAILY_QUOTA == 50
    assert settings.ADMIN_DAILY_QUOTA == 500
    assert settings.PREMIUM_DAILY_QUOTA == 200
    assert settings.ENABLE_QUOTA_TIERS is True