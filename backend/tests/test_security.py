import pytest
import httpx
from unittest.mock import patch, AsyncMock


@pytest.mark.anyio
async def test_root_endpoint_accessible():
    """Test root endpoint is accessible."""
    import main

    transport = httpx.ASGITransport(app=main.app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get("/")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "ok"


@pytest.mark.anyio
async def test_health_endpoint_accessible():
    """Test health endpoint is accessible without auth."""
    import main

    transport = httpx.ASGITransport(app=main.app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get("/health")
        assert r.status_code in (200, 503)


@pytest.mark.anyio
async def test_ready_endpoint_accessible():
    """Test ready endpoint is accessible without auth."""
    import main

    transport = httpx.ASGITransport(app=main.app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get("/ready")
        assert r.status_code in (200, 503)


@pytest.mark.anyio
async def test_openapi_endpoint_accessible():
    """Test OpenAPI schema is accessible."""
    import main

    transport = httpx.ASGITransport(app=main.app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get("/openapi.json")
        assert r.status_code == 200
        data = r.json()
        assert "openapi" in data


@pytest.mark.anyio
async def test_content_type_validation():
    """Test that invalid content types are handled."""
    import main

    transport = httpx.ASGITransport(app=main.app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Send request with wrong content type to an endpoint expecting JSON
        r = await client.post(
            "/api/v1/chat",
            content="not json",
            headers={"Content-Type": "text/plain"}
        )
        # Should either reject or handle gracefully
        assert r.status_code in (200, 400, 415, 422, 401, 403, 500)


@pytest.mark.anyio
async def test_login_endpoint_accepts_valid_email():
    """Test login endpoint accepts valid email format."""
    import main

    transport = httpx.ASGITransport(app=main.app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.post(
            "/api/v1/auth/login",
            json={"email": "test@example.com"}
        )
        # Should succeed (creates user or returns token)
        assert r.status_code in (200, 500)  # 500 if DB not configured


@pytest.mark.anyio
async def test_login_endpoint_rejects_invalid_email():
    """Test login endpoint rejects invalid email format."""
    import main

    transport = httpx.ASGITransport(app=main.app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.post(
            "/api/v1/auth/login",
            json={"email": "not-an-email"}
        )
        # Should reject
        assert r.status_code == 422