import httpx
import pytest


@pytest.mark.anyio
async def test_root_ok():
    import main  # noqa: F401

    transport = httpx.ASGITransport(app=main.app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get("/")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "ok"
        assert data["service"] == "ASTRAMIND Backend"


@pytest.mark.anyio
async def test_health_returns_json_and_status():
    import main

    transport = httpx.ASGITransport(app=main.app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get("/health")
        # Should never return a tuple body/status; always JSON.
        assert r.headers.get("content-type", "").startswith("application/json")
        assert r.status_code in (200, 503)
        data = r.json()
        assert "status" in data
        assert "timestamp" in data


@pytest.mark.anyio
async def test_ready_returns_json_and_status():
    import main

    transport = httpx.ASGITransport(app=main.app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get("/ready")
        assert r.headers.get("content-type", "").startswith("application/json")
        assert r.status_code in (200, 503)
        data = r.json()
        assert "ready" in data
