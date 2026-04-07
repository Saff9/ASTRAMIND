# backend/app/providers/ollama.py
"""
Ollama Local AI Provider
Handles local model inference via Ollama API.
"""

import aiohttp
import json
import logging
from typing import AsyncIterator, Dict, Any, Optional
from core.config import settings

logger = logging.getLogger(__name__)


class OllamaProvider:
    """
    Provider for local Ollama models.
    """

    def __init__(self, base_url: Optional[str] = None):
        self.base_url = base_url or settings.OLLAMA_URL or "http://localhost:11434"
        self.timeout = aiohttp.ClientTimeout(total=300)  # 5 minutes for local inference

    async def stream(
        self,
        prompt: str,
        model: str,
        api_key: Optional[str] = None,  # Not used for local Ollama
        messages: Optional[list] = None,
    ) -> AsyncIterator[str]:
        """
        Stream response from local Ollama model.

        Args:
            prompt: User prompt (may be overridden by messages)
            model: Ollama model name
            api_key: Not used for local models
            messages: Full conversation messages (preferred)

        Yields:
            Response chunks
        """
        # Prepare request payload
        if messages:
            # Use full conversation context
            payload = {
                "model": model,
                "messages": messages,
                "stream": True,
            }
        else:
            # Simple prompt mode (legacy)
            payload = {
                "model": model,
                "prompt": prompt,
                "stream": True,
            }

        url = f"{self.base_url.rstrip('/')}/api/chat" if messages else f"{self.base_url.rstrip('/')}/api/generate"

        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                async with session.post(url, json=payload) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        raise RuntimeError(f"Ollama API error {response.status}: {error_text}")

                    # Stream the response
                    async for line in response.content:
                        line = line.decode('utf-8').strip()
                        if not line:
                            continue

                        try:
                            data = json.loads(line)

                            if messages:
                                # Chat API format
                                if data.get("done", False):
                                    break

                                if "message" in data and "content" in data["message"]:
                                    content = data["message"]["content"]
                                    if content:
                                        yield content
                            else:
                                # Generate API format
                                if data.get("done", False):
                                    break

                                if "response" in data:
                                    yield data["response"]

                        except json.JSONDecodeError:
                            continue

        except aiohttp.ClientError as e:
            logger.error(f"Ollama connection error: {e}")
            raise RuntimeError(f"Failed to connect to Ollama: {e}")
        except Exception as e:
            logger.error(f"Ollama streaming error: {e}")
            raise RuntimeError(f"Ollama error: {e}")

    async def list_models(self) -> list:
        """
        List available Ollama models.

        Returns:
            List of model names
        """
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as session:
                url = f"{self.base_url.rstrip('/')}/api/tags"
                async with session.get(url) as response:
                    if response.status == 200:
                        data = await response.json()
                        models = data.get("models", [])
                        return [model.get("name", "") for model in models if model.get("name")]
                    else:
                        logger.warning(f"Failed to list Ollama models: {response.status}")
                        return []
        except Exception as e:
            logger.warning(f"Error listing Ollama models: {e}")
            return []

    async def check_health(self) -> bool:
        """
        Check if Ollama service is healthy.

        Returns:
            True if healthy, False otherwise
        """
        try:
            models = await self.list_models()
            return len(models) > 0
        except Exception:
            return False
