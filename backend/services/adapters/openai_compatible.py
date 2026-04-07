import httpx

from services.providers.base import BaseProvider


class OpenAICompatibleHealthProvider(BaseProvider):
    """
    Lightweight health checker for OpenAI-compatible APIs.
    """

    def __init__(self, *, name: str, base_url: str, api_key: str | None):
        self.name = name
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key

    async def health_check(self) -> None:
        if not self.api_key:
            raise RuntimeError(f"{self.name} not configured")
        headers = {"Authorization": f"Bearer {self.api_key}"}
        url = f"{self.base_url}/models"
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            r = await client.get(url, headers=headers)
            if r.status_code >= 400:
                raise RuntimeError(f"{self.name} unavailable ({r.status_code})")

