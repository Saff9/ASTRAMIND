# backend/app/providers/openrouter.py

import httpx
from typing import AsyncIterator

from app.providers.base import AIProvider
from core.errors import AppError
from core.system_prompt import get_system_prompt


class OpenRouterProvider(AIProvider):
    name = "openrouter"

    def __init__(self, http_client: httpx.AsyncClient | None = None):
        # Optional shared client for connection pooling (recommended in production).
        self._client = http_client

    async def stream(
        self,
        prompt: str,
        model: str,
        api_key: str,
    ) -> AsyncIterator[str]:

        # Get system prompt for AI identity
        system_prompt = get_system_prompt()

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "stream": True,
        }

        timeout = httpx.Timeout(30.0, connect=5.0)
        url = "https://openrouter.ai/api/v1/chat/completions"

        try:
            if self._client is None:
                async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
                    async with client.stream(
                        "POST",
                        url,
                        headers=headers,
                        json=payload,
                    ) as response:
                        if response.status_code == 401:
                            raise AppError(401, "Invalid OpenRouter API key")
                        elif response.status_code == 429:
                            raise AppError(429, "OpenRouter rate limit exceeded")
                        elif response.status_code == 503:
                            raise AppError(503, "OpenRouter service temporarily unavailable")
                        elif response.status_code != 200:
                            error_text = await response.aread()
                            raise AppError(502, f"OpenRouter provider error: {response.status_code}: {error_text!r}")

                        async for line in response.aiter_lines():
                            if line.startswith("data: "):
                                chunk = line.removeprefix("data: ").strip()
                                if chunk and chunk != "[DONE]":
                                    yield chunk
            else:
                async with self._client.stream(
                    "POST",
                    url,
                    headers=headers,
                    json=payload,
                    timeout=timeout,
                ) as response:
                    if response.status_code == 401:
                        raise AppError(401, "Invalid OpenRouter API key")
                    elif response.status_code == 429:
                        raise AppError(429, "OpenRouter rate limit exceeded")
                    elif response.status_code == 503:
                        raise AppError(503, "OpenRouter service temporarily unavailable")
                    elif response.status_code != 200:
                        error_text = await response.aread()
                        raise AppError(502, f"OpenRouter provider error: {response.status_code}: {error_text!r}")

                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            chunk = line.removeprefix("data: ").strip()
                            if chunk and chunk != "[DONE]":
                                yield chunk
        except httpx.TimeoutException:
            raise AppError(504, "OpenRouter request timeout - please try again")
        except httpx.NetworkError:
            raise AppError(503, "Network error communicating with OpenRouter")
