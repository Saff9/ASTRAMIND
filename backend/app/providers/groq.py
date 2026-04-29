# backend/app/providers/groq.py

import httpx
import logging
from typing import AsyncIterator, List, Dict, Optional

from app.providers.base import AIProvider
from core.errors import AppError
from core.system_prompt import get_system_prompt

logger = logging.getLogger(__name__)


class GroqProvider(AIProvider):
    """Groq API provider with streaming support and error handling."""
    
    name = "groq"
    api_url = "https://api.groq.com/openai/v1/chat/completions"

    def __init__(self, http_client: httpx.AsyncClient | None = None):
        # Optional shared client for connection pooling (recommended in production).
        self._client = http_client

    async def stream(
        self,
        prompt: str,
        model: str,
        api_key: str,
        messages: Optional[List[Dict[str, str]]] = None,
    ) -> AsyncIterator[str]:
        """
        Stream response from Groq API.

        Args:
            prompt: Current user message
            model: Model name (e.g., llama-3.1-8b-instant)
            api_key: Groq API key
            messages: Optional conversation history [{"role": "user"|"assistant", "content": "..."}]

        Yields:
            Response chunks
        """

        if not api_key or not api_key.strip():
            raise AppError(400, "Groq API key is required")
        if not prompt or not isinstance(prompt, str):
            raise AppError(400, "Prompt must be a non-empty string")
        if not model:
            raise AppError(400, "Model name is required")

        system_prompt = get_system_prompt()

        # Build messages array — system prompt + history + current message
        msg_list = [{"role": "system", "content": system_prompt}]
        if messages:
            for m in messages[-50:]:  # cap at last 20 turns to save tokens
                role = m.get("role", "user")
                content = m.get("content", "")
                if role in ("user", "assistant") and content:
                    msg_list.append({"role": role, "content": content})
        msg_list.append({"role": "user", "content": prompt})

        headers = {
            "Authorization": f"Bearer {api_key.strip()}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": model,
            "messages": msg_list,
            "stream": True,
            "temperature": 0.7,
        }

        timeout = httpx.Timeout(30.0, connect=5.0)

        try:
            if self._client is None:
                async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
                    async with client.stream(
                        "POST",
                        self.api_url,
                        headers=headers,
                        json=payload,
                    ) as response:

                        if response.status_code == 401:
                            raise AppError(401, "Invalid Groq API key")
                        elif response.status_code == 429:
                            raise AppError(429, "Groq rate limit exceeded")
                        elif response.status_code == 503:
                            raise AppError(503, "Groq service temporarily unavailable")
                        elif response.status_code != 200:
                            error_text = await response.aread()
                            logger.error(f"Groq API error {response.status_code}: {error_text}")
                            raise AppError(502, f"Groq provider error: {response.status_code}")

                        async for line in response.aiter_lines():
                            if line.startswith("data: "):
                                chunk = line.removeprefix("data: ").strip()
                                if chunk and chunk != "[DONE]":
                                    yield chunk
            else:
                async with self._client.stream(
                    "POST",
                    self.api_url,
                    headers=headers,
                    json=payload,
                    timeout=timeout,
                ) as response:

                    if response.status_code == 401:
                        raise AppError(401, "Invalid Groq API key")
                    elif response.status_code == 429:
                        raise AppError(429, "Groq rate limit exceeded")
                    elif response.status_code == 503:
                        raise AppError(503, "Groq service temporarily unavailable")
                    elif response.status_code != 200:
                        error_text = await response.aread()
                        logger.error(f"Groq API error {response.status_code}: {error_text}")
                        raise AppError(502, f"Groq provider error: {response.status_code}")

                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            chunk = line.removeprefix("data: ").strip()
                            if chunk and chunk != "[DONE]":
                                yield chunk
        except httpx.TimeoutException:
            logger.error("Groq request timeout")
            raise AppError(504, "Groq request timeout - please try again")
        except httpx.NetworkError as e:
            logger.error(f"Groq network error: {e}")
            raise AppError(503, "Network error communicating with Groq")
        except AppError:
            raise  # Re-raise application errors
        except Exception as e:
            logger.error(f"Unexpected error in Groq provider: {e}", exc_info=e)
            raise AppError(500, f"Unexpected error: {str(e)}")
