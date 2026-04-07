import json
from typing import AsyncIterator, Optional

import httpx

from app.providers.base import AIProvider
from core.errors import AppError


class CloudflareWorkersAIProvider(AIProvider):
    """
    Cloudflare Workers AI provider.

    Cloudflare's Workers AI API is not OpenAI Chat Completions-compatible.
    For compatibility with the rest of this backend, we return a single
    OpenAI-style delta chunk (no true token streaming).
    """

    name = "cloudflare"

    def __init__(self, account_id: str, api_token: str, http_client: httpx.AsyncClient | None = None):
        self.account_id = account_id
        self.api_token = api_token
        self._client = http_client

    async def stream(self, prompt: str, model: str, api_key: str = "") -> AsyncIterator[str]:
        # api_key parameter is unused; Cloudflare uses api_token configured in settings.
        if not self.account_id or not self.api_token:
            raise AppError(400, "Cloudflare Workers AI not configured (account id / api token missing)")
        if not prompt or not isinstance(prompt, str):
            raise AppError(400, "Prompt must be a non-empty string")
        if not model:
            model = "@cf/meta/llama-3.1-8b-instruct"

        url = f"https://api.cloudflare.com/client/v4/accounts/{self.account_id}/ai/run/{model}"
        headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json",
        }
        payload = {"messages": [{"role": "user", "content": prompt}]}

        timeout = httpx.Timeout(30.0, connect=5.0)

        try:
            if self._client is None:
                async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
                    r = await client.post(url, headers=headers, json=payload)
            else:
                r = await self._client.post(url, headers=headers, json=payload, timeout=timeout)

            if r.status_code in (401, 403):
                raise AppError(401, "Invalid Cloudflare API token")
            if r.status_code == 429:
                raise AppError(429, "Cloudflare Workers AI rate limit exceeded")
            if r.status_code >= 500:
                raise AppError(503, "Cloudflare Workers AI temporarily unavailable")
            if r.status_code != 200:
                raise AppError(502, f"Cloudflare Workers AI error: {r.status_code}: {r.text[:2000]!r}")

            data = r.json()
            result = data.get("result") or {}
            text = (
                result.get("response")
                or result.get("output_text")
                or result.get("text")
                or ""
            )
            if not text:
                text = json.dumps(result, ensure_ascii=False)

            yield json.dumps(
                {"choices": [{"delta": {"content": text}, "index": 0, "finish_reason": "stop"}]},
                ensure_ascii=False,
            )
        except httpx.TimeoutException:
            raise AppError(504, "Cloudflare Workers AI request timeout - please try again")
        except httpx.NetworkError:
            raise AppError(503, "Network error communicating with Cloudflare Workers AI")

