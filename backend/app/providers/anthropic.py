import json
from typing import AsyncIterator

import httpx

from app.providers.base import AIProvider
from core.errors import AppError
from core.system_prompt import get_system_prompt


class AnthropicProvider(AIProvider):
    """
    Anthropic (Claude) provider using the Messages API.
    Supports streaming with Server-Sent Events.
    """

    name = "anthropic"

    def __init__(self, http_client: httpx.AsyncClient | None = None):
        self._client = http_client

    async def stream(self, prompt: str, model: str, api_key: str) -> AsyncIterator[str]:
        if not api_key or not api_key.strip():
            raise AppError(400, "Anthropic API key is required")
        if not prompt or not isinstance(prompt, str):
            raise AppError(400, "Prompt must be a non-empty string")
        if not model:
            model = "claude-3-5-sonnet-20241022"

        # Get system prompt for AI identity
        system_prompt = get_system_prompt()

        url = "https://api.anthropic.com/v1/messages"

        headers = {
            "x-api-key": api_key.strip(),
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        }

        payload = {
            "model": model,
            "system": system_prompt,
            "messages": [{"role": "user", "content": prompt}],
            "stream": True,
            "max_tokens": 4096,
        }

        timeout = httpx.Timeout(30.0, connect=5.0)

        try:
            if self._client is None:
                async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
                    async with client.stream(
                        "POST", url, headers=headers, json=payload
                    ) as response:
                        await _raise_for_status(response)
                        async for chunk in _iterate_anthropic_sse(response):
                            yield chunk
            else:
                async with self._client.stream(
                    "POST", url, headers=headers, json=payload, timeout=timeout
                ) as response:
                    await _raise_for_status(response)
                    async for chunk in _iterate_anthropic_sse(response):
                        yield chunk
        except httpx.TimeoutException:
            raise AppError(504, "Anthropic request timeout - please try again")
        except httpx.NetworkError:
            raise AppError(503, "Network error communicating with Anthropic")


async def _raise_for_status(response: httpx.Response) -> None:
    if response.status_code in (401, 403):
        raise AppError(401, "Invalid Anthropic API key")
    if response.status_code == 429:
        raise AppError(429, "Anthropic rate limit exceeded")
    if response.status_code >= 500:
        raise AppError(503, "Anthropic service temporarily unavailable")
    if response.status_code != 200:
        body = (await response.aread())[:2000]
        raise AppError(502, f"Anthropic provider error: {response.status_code}: {body!r}")


async def _iterate_anthropic_sse(response: httpx.Response) -> AsyncIterator[str]:
    """
    Iterate over Anthropic SSE events with robust error handling.
    Handles malformed JSON, incomplete chunks, and network issues gracefully.
    """
    async for line in response.aiter_lines():
        if not line:
            continue
        if not line.startswith("data:"):
            continue
        data = line.removeprefix("data:").strip()
        if not data or data == "[DONE]":
            continue

        try:
            obj = json.loads(data)
            delta = obj.get("delta", {})
            text = delta.get("text", "")
            if text:
                yield json.dumps(
                    {
                        "choices": [
                            {
                                "delta": {"content": text},
                                "index": 0,
                                "finish_reason": None,
                            }
                        ]
                    },
                    ensure_ascii=False,
                )
        except json.JSONDecodeError as e:
            # Log and skip malformed JSON
            logger = logging.getLogger(__name__)
            logger.debug(f"Skipping malformed JSON from Anthropic: {data[:100]}... Error: {e}")
            continue
        except Exception as e:
            # Catch any other errors and continue streaming
            logging.getLogger(__name__).debug(f"Error processing Anthropic SSE event: {e}")
            continue
