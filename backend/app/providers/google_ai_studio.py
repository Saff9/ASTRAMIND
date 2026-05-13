import json
import logging
from typing import AsyncIterator, Dict, List, Optional

import httpx

from app.providers.base import AIProvider
from core.errors import AppError
from core.system_prompt import get_system_prompt

logger = logging.getLogger(__name__)


class GoogleAIStudioProvider(AIProvider):
    """
    Google AI Studio (Gemini) provider using the Generative Language API.

    Yields OpenAI-style delta chunks encoded as JSON strings to keep the
    downstream streaming format consistent with existing providers.
    """

    name = "google_ai_studio"

    def __init__(self, http_client: httpx.AsyncClient | None = None):
        self._client = http_client

    async def stream(
        self,
        prompt: str,
        model: str,
        api_key: str,
        messages: Optional[List[Dict[str, str]]] = None,
    ) -> AsyncIterator[str]:
        if not api_key or not api_key.strip():
            raise AppError(400, "Google AI Studio API key is required")
        if not prompt or not isinstance(prompt, str):
            raise AppError(400, "Prompt must be a non-empty string")
        if not model:
            model = "gemini-1.5-flash"

        url = (
            "https://generativelanguage.googleapis.com/v1beta/"
            f"models/{model}:streamGenerateContent"
        )

        contents: List[Dict] = []
        if messages:
            for m in messages[-50:]:
                role = m.get("role", "user")
                text = (m.get("content") or "").strip()
                if not text:
                    continue
                gem_role = "user" if role == "user" else "model"
                contents.append({"role": gem_role, "parts": [{"text": text}]})
        contents.append({"role": "user", "parts": [{"text": prompt}]})

        payload: Dict = {
            "systemInstruction": {"parts": [{"text": get_system_prompt()}]},
            "contents": contents,
            "generationConfig": {"temperature": 0.7},
        }

        headers = {"Content-Type": "application/json"}
        timeout = httpx.Timeout(120.0, connect=10.0)

        try:
            if self._client is None:
                async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
                    async with client.stream(
                        "POST",
                        url,
                        params={"key": api_key.strip()},
                        headers=headers,
                        json=payload,
                    ) as response:
                        await _raise_for_status(response)
                        async for text in _iterate_google_stream_text(response):
                            yield _as_openai_delta(text)
            else:
                async with self._client.stream(
                    "POST",
                    url,
                    params={"key": api_key.strip()},
                    headers=headers,
                    json=payload,
                    timeout=timeout,
                ) as response:
                    await _raise_for_status(response)
                    async for text in _iterate_google_stream_text(response):
                        yield _as_openai_delta(text)
        except httpx.TimeoutException:
            raise AppError(504, "Google AI Studio request timeout - please try again")
        except httpx.NetworkError:
            raise AppError(503, "Network error communicating with Google AI Studio")


def _as_openai_delta(text: str) -> str:
    return json.dumps(
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


async def _raise_for_status(response: httpx.Response) -> None:
    if response.status_code in (401, 403):
        raise AppError(401, "Invalid Google AI Studio API key")
    if response.status_code == 429:
        raise AppError(429, "Google AI Studio rate limit exceeded")
    if response.status_code >= 500:
        raise AppError(503, "Google AI Studio service temporarily unavailable")
    if response.status_code != 200:
        body = (await response.aread())[:2000]
        raise AppError(502, f"Google AI Studio provider error: {response.status_code}: {body!r}")


async def _iterate_google_stream_text(response: httpx.Response) -> AsyncIterator[str]:
    async for line in response.aiter_lines():
        if not line:
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError as e:
            logger.debug("Skipping malformed JSON from Google AI: %s... Error: %s", line[:100], e)
            continue
        except Exception as e:
            logger.debug("Error parsing Google AI response line: %s", e)
            continue

        candidates = obj.get("candidates") or []
        for cand in candidates:
            content = cand.get("content") or {}
            parts = content.get("parts") or []
            for part in parts:
                text = part.get("text")
                if text:
                    yield text
