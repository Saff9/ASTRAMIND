import json
from typing import AsyncIterator, Optional

import httpx

from app.providers.base import AIProvider
from core.errors import AppError


class OpenAICompatibleProvider(AIProvider):
    """
    Generic OpenAI-compatible Chat Completions streaming provider.

    Expects SSE lines in the form:
      data: {...json...}
      data: [DONE]

    This implementation yields the raw JSON chunk string (to keep backwards
    compatibility with the existing frontend stream parser).
    """

    def __init__(
        self,
        *,
        name: str,
        base_url: str,
        http_client: httpx.AsyncClient | None = None,
        default_headers: Optional[dict[str, str]] = None,
        chat_completions_path: str = "/chat/completions",
    ):
        self.name = name
        self.base_url = base_url.rstrip("/")
        self._client = http_client
        self._default_headers = default_headers or {}
        self._path = chat_completions_path

    async def stream(
        self,
        prompt: str,
        model: str,
        api_key: str,
    ) -> AsyncIterator[str]:
        if not api_key or not api_key.strip():
            raise AppError(400, f"{self.name} API key is required")
        if not prompt or not isinstance(prompt, str):
            raise AppError(400, "Prompt must be a non-empty string")
        if not model:
            raise AppError(400, "Model name is required")

        url = f"{self.base_url}{self._path}"
        headers = {
            "Authorization": f"Bearer {api_key.strip()}",
            "Content-Type": "application/json",
            **self._default_headers,
        }

        # Get system prompt for AI identity
        system_prompt = get_system_prompt()

        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "stream": True,
        }

        timeout = httpx.Timeout(30.0, connect=5.0)

        try:
            if self._client is None:
                async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
                    async with client.stream("POST", url, headers=headers, json=payload) as response:
                        await _raise_for_status(self.name, response)
                        async for chunk in _iterate_sse_data(response):
                            yield chunk
            else:
                async with self._client.stream("POST", url, headers=headers, json=payload, timeout=timeout) as response:
                    await _raise_for_status(self.name, response)
                    async for chunk in _iterate_sse_data(response):
                        yield chunk
        except httpx.TimeoutException:
            raise AppError(504, f"{self.name} request timeout - please try again")
        except httpx.NetworkError:
            raise AppError(503, f"Network error communicating with {self.name}")


async def _raise_for_status(provider_name: str, response: httpx.Response) -> None:
    if response.status_code == 401:
        raise AppError(401, f"Invalid {provider_name} API key")
    if response.status_code == 429:
        raise AppError(429, f"{provider_name} rate limit exceeded")
    if response.status_code in (502, 503, 504):
        raise AppError(503, f"{provider_name} service temporarily unavailable")
    if response.status_code != 200:
        # Read a small amount for diagnostics without buffering huge bodies.
        body = (await response.aread())[:2000]
        raise AppError(502, f"{provider_name} provider error: {response.status_code}: {body!r}")


async def _iterate_sse_data(response: httpx.Response) -> AsyncIterator[str]:
    async for line in response.aiter_lines():
        if not line:
            continue
        if not line.startswith("data:"):
            continue
        data = line.removeprefix("data:").strip()
        if not data or data == "[DONE]":
            continue
        # Validate it's JSON-ish but still return raw string (back-compat).
        try:
            json.loads(data)
        except Exception:
            pass
        yield data

