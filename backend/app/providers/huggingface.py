# backend/app/providers/huggingface.py

import httpx
from typing import AsyncIterator, Dict, List, Optional

from app.providers.base import AIProvider
from core.errors import AppError


def _hf_inputs(prompt: str, messages: Optional[List[Dict[str, str]]]) -> str:
    if not messages:
        return prompt
    parts: List[str] = []
    for m in messages[-20:]:
        role = m.get("role", "user")
        content = (m.get("content") or "").strip()
        if not content:
            continue
        parts.append(f"{role.upper()}: {content}")
    parts.append(f"USER: {prompt}")
    return "\n\n".join(parts)


class HuggingFaceProvider(AIProvider):
    name = "huggingface"

    def __init__(self, http_client: httpx.AsyncClient | None = None):
        self._client = http_client

    async def stream(
        self,
        prompt: str,
        model: str,
        api_key: str,
        messages: Optional[List[Dict[str, str]]] = None,
    ) -> AsyncIterator[str]:

        headers = {"Authorization": f"Bearer {api_key}"}
        payload = {"inputs": _hf_inputs(prompt, messages)}

        timeout = httpx.Timeout(30.0, connect=5.0)
        url = f"https://api-inference.huggingface.co/models/{model}"
        try:
            if self._client is None:
                async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
                    response = await client.post(
                        url,
                        headers=headers,
                        json=payload,
                    )
            else:
                response = await self._client.post(
                    url,
                    headers=headers,
                    json=payload,
                    timeout=timeout,
                )
        except httpx.TimeoutException:
            raise AppError(504, "HuggingFace request timeout - please try again")
        except httpx.NetworkError:
            raise AppError(503, "Network error communicating with HuggingFace")

        if response.status_code != 200:
            raise AppError(502, "HuggingFace provider error")

        yield response.json()[0]["generated_text"]
