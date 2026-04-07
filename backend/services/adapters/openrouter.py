#backend/app/services/adapters/openrouter.py

import httpx
from services.providers.base import BaseProvider


class OpenRouterProvider(BaseProvider):
    name = "openrouter"

    async def health_check(self) -> None:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get("https://openrouter.ai")
            if r.status_code >= 400:
                raise RuntimeError("OpenRouter unavailable")


async def generate(prompt: str, api_key: str):
    headers = {
        "Authorization": f"Bearer {api_key}",
        "HTTP-Referer": "https://ASTRAMIND.ai",
        "X-Title": "ASTRAMIND",
    }

    data = {
        "model": "openai/gpt-4o-mini",
        "messages": [{"role": "user", "content": prompt}],
    }

    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=data,
        )
        return r.json()["choices"][0]["message"]["content"]
