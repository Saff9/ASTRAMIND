# backend/core/model_provider.py
"""
Intelligent model provider selection with local model auto-detection.
Provides secure, resilient model routing with automatic fallback.
"""

import asyncio
import aiohttp
import time
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from enum import Enum

from core.config import settings
import logging

logger = logging.getLogger(__name__)


class ModelProvider(Enum):
    """Supported model providers with priority order."""
    LOCAL = "local"      # Ollama, local servers
    GROQ = "groq"        # Fast remote inference
    OPENROUTER = "openrouter"  # Broad model selection
    TOGETHER = "together"
    MISTRAL = "mistral"
    CEREBRAS = "cerebras"
    SILICONFLOW = "siliconflow"
    ALIBABA_BAILIAN = "alibaba_bailian"
    DEEPSEEK = "deepseek"
    XAI = "xai"
    GOOGLE_AI_STUDIO = "google_ai_studio"
    ANTHROPIC = "anthropic"
    COHERE = "cohere"
    AI21 = "ai21"
    NOVITA = "novita"
    SAMBANOVA = "sambanova"
    OPENAI = "openai"    # Fallback premium models


@dataclass
class ModelHealth:
    """Health status of a model provider."""
    provider: ModelProvider
    healthy: bool
    latency_ms: Optional[float] = None
    last_checked: float = 0
    error_count: int = 0


class ModelRouter:
    """
    Intelligent model routing with local detection and fallback.
    Security-first design with timeouts and circuit breaking.
    """

    def __init__(self):
        self.health_cache: Dict[ModelProvider, ModelHealth] = {}
        self.cache_timeout = 300  # 5 minutes
        self.max_errors = 3  # Circuit breaker threshold
        self.request_timeout = 10  # seconds

    async def get_best_provider(self, model_id: str) -> ModelProvider:
        """
        Get the best available provider for a model tier.
        Prioritizes local models, then tier-specific preferred providers.
        """
        # Always check local first if available
        if await self._check_local_availability():
            return ModelProvider.LOCAL

        # Get preferred providers for this tier from MODEL_CONFIGS
        try:
            from services.models import MODEL_CONFIGS
            config = MODEL_CONFIGS.get(model_id.lower().strip())
            if config and "preferred_providers" in config:
                priority = config["preferred_providers"]
            else:
                priority = [
                    ModelProvider.GROQ,
                    ModelProvider.OPENROUTER,
                    ModelProvider.CEREBRAS,
                    ModelProvider.TOGETHER,
                    ModelProvider.DEEPSEEK,
                    ModelProvider.ANTHROPIC,
                    ModelProvider.OPENAI,
                ]
        except Exception:
            priority = [
                ModelProvider.GROQ,
                ModelProvider.OPENROUTER,
                ModelProvider.CEREBRAS,
                ModelProvider.TOGETHER,
            ]

        for provider in priority:
            if await self._check_provider_health(provider):
                return provider

        # Ultimate fallback - use first available healthy provider
        healthy_providers = await self._get_healthy_providers()
        if healthy_providers:
            return healthy_providers[0]

        # Emergency fallback to Groq (most reliable)
        logger.warning("All providers unhealthy, using Groq as emergency fallback")
        return ModelProvider.GROQ

    async def _check_local_availability(self) -> bool:
        """Check if local Ollama server is available."""
        if not settings.OLLAMA_URL:
            return False

        # Check cache first
        now = time.time()
        if ModelProvider.LOCAL in self.health_cache:
            cached = self.health_cache[ModelProvider.LOCAL]
            if (now - cached.last_checked) < self.cache_timeout:
                return cached.healthy

        try:
            # Quick health check to Ollama
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=3)) as session:
                url = f"{settings.OLLAMA_URL.rstrip('/')}/api/tags"
                start_time = time.time()

                async with session.get(url) as response:
                    latency = (time.time() - start_time) * 1000

                    if response.status == 200:
                        # Verify we can actually get models
                        data = await response.json()
                        if isinstance(data, dict) and 'models' in data:
                            self._update_health(ModelProvider.LOCAL, True, latency)
                            logger.info(f"Local Ollama detected: {len(data.get('models', []))} models available")
                            return True

        except Exception as e:
            logger.debug(f"Local Ollama check failed: {e}")

        self._update_health(ModelProvider.LOCAL, False)
        return False

    async def _get_healthy_providers(self) -> List[ModelProvider]:
        """Get list of healthy remote providers."""
        providers = [
            ModelProvider.GROQ,
            ModelProvider.OPENROUTER,
            ModelProvider.TOGETHER,
            ModelProvider.MISTRAL,
            ModelProvider.CEREBRAS,
            ModelProvider.SILICONFLOW,
            ModelProvider.ALIBABA_BAILIAN,
            ModelProvider.DEEPSEEK,
            ModelProvider.XAI,
            ModelProvider.GOOGLE_AI_STUDIO,
            ModelProvider.ANTHROPIC,
            ModelProvider.COHERE,
            ModelProvider.AI21,
            ModelProvider.NOVITA,
            ModelProvider.SAMBANOVA,
            ModelProvider.OPENAI,
        ]
        healthy = []

        for provider in providers:
            if await self._check_provider_health(provider):
                healthy.append(provider)

        return healthy

    async def _check_provider_health(self, provider: ModelProvider) -> bool:
        """Instant O(1) health check based on API key availability."""
        now = time.time()
        if provider in self.health_cache:
            cached = self.health_cache[provider]
            if (now - cached.last_checked) < self.cache_timeout:
                return cached.healthy and cached.error_count < self.max_errors

        # Check key availability
        has_key = False
        if provider == ModelProvider.LOCAL:
            has_key = True
        elif provider == ModelProvider.GROQ:
            has_key = bool(settings.groq_api_keys)
        elif provider == ModelProvider.OPENROUTER:
            has_key = bool(settings.openrouter_api_keys)
        elif provider == ModelProvider.TOGETHER:
            has_key = bool(settings.together_api_keys)
        elif provider == ModelProvider.MISTRAL:
            has_key = bool(settings.mistral_api_keys)
        elif provider == ModelProvider.CEREBRAS:
            has_key = bool(settings.cerebras_api_keys)
        elif provider == ModelProvider.SILICONFLOW:
            has_key = bool(settings.siliconflow_api_keys)
        elif provider == ModelProvider.ALIBABA_BAILIAN:
            has_key = bool(settings.alibaba_bailian_api_keys)
        elif provider == ModelProvider.DEEPSEEK:
            has_key = bool(settings.deepseek_api_keys)
        elif provider == ModelProvider.XAI:
            has_key = bool(settings.xai_api_keys)
        elif provider == ModelProvider.GOOGLE_AI_STUDIO:
            has_key = bool(settings.google_ai_studio_api_keys)
        elif provider == ModelProvider.ANTHROPIC:
            has_key = bool(settings.anthropic_api_keys)
        elif provider == ModelProvider.COHERE:
            has_key = bool(settings.cohere_api_keys)
        elif provider == ModelProvider.AI21:
            has_key = bool(settings.ai21_api_keys)
        elif provider == ModelProvider.NOVITA:
            has_key = bool(settings.novita_api_keys)
        elif provider == ModelProvider.SAMBANOVA:
            has_key = bool(settings.sambanova_api_keys)
        elif provider == ModelProvider.OPENAI:
            has_key = bool(settings.OPENAI_API_KEY)

        self._update_health(provider, has_key, 50.0 if has_key else None)
        return has_key

    async def _test_groq_health(self, session: aiohttp.ClientSession) -> None:
        """Test Groq API health."""
        if not settings.groq_api_keys:
            raise ValueError("No Groq API keys")

        # Simple models list request
        headers = {"Authorization": f"Bearer {settings.groq_api_keys[0]}"}
        async with session.get(f"{settings.GROQ_BASE_URL.rstrip('/')}/models", headers=headers) as response:
            response.raise_for_status()

    async def _test_openrouter_health(self, session: aiohttp.ClientSession) -> None:
        """Test OpenRouter API health."""
        if not settings.openrouter_api_keys:
            raise ValueError("No OpenRouter API keys")

        # Simple models list request
        headers = {"Authorization": f"Bearer {settings.openrouter_api_keys[0]}"}
        async with session.get(f"{settings.OPENROUTER_BASE_URL.rstrip('/')}/models", headers=headers) as response:
            response.raise_for_status()

    async def _test_openai_health(self, session: aiohttp.ClientSession) -> None:
        """Test OpenAI API health."""
        if not settings.OPENAI_API_KEY:
            raise ValueError("No OpenAI API key")

        # Simple models list request
        headers = {"Authorization": f"Bearer {settings.OPENAI_API_KEY}"}
        async with session.get(f"{settings.OPENAI_BASE_URL.rstrip('/')}/models", headers=headers) as response:
            response.raise_for_status()

    async def _test_openai_compatible_health(
        self,
        session: aiohttp.ClientSession,
        base_url: str,
        keys: list[str],
    ) -> None:
        """Test OpenAI-compatible provider health by listing models."""
        if not keys:
            raise ValueError("No API keys")
        headers = {"Authorization": f"Bearer {keys[0]}"}
        url = f"{base_url.rstrip('/')}/models"
        async with session.get(url, headers=headers) as response:
            response.raise_for_status()

    async def _test_anthropic_health(self, session: aiohttp.ClientSession) -> None:
        """Test Anthropic API health."""
        if not settings.anthropic_api_keys:
            raise ValueError("No Anthropic API keys")

        headers = {
            "x-api-key": settings.anthropic_api_keys[0],
            "anthropic-version": "2023-06-01",
        }
        url = "https://api.anthropic.com/v1/messages"
        async with session.post(url, headers=headers, json={"model": "claude-3-5-sonnet-20241022", "max_tokens": 1, "messages": [{"role": "user", "content": "hi"}]}) as response:
            response.raise_for_status()

    def _update_health(self, provider: ModelProvider, healthy: bool, latency: Optional[float] = None) -> None:
        """Update health status for a provider."""
        if provider not in self.health_cache:
            self.health_cache[provider] = ModelHealth(provider=provider, healthy=healthy)

        health = self.health_cache[provider]
        health.healthy = healthy
        health.last_checked = time.time()

        if healthy:
            health.latency_ms = latency
            health.error_count = 0
        else:
            health.error_count += 1

    def get_provider_config(self, provider: ModelProvider) -> Dict[str, Any]:
        """Get configuration for a specific provider."""
        configs = {
            ModelProvider.LOCAL: {
                "base_url": settings.OLLAMA_URL,
                "type": "ollama"
            },
            ModelProvider.GROQ: {
                "api_key": settings.groq_api_keys[0] if settings.groq_api_keys else None,
                "base_url": settings.GROQ_BASE_URL,
                "type": "openai-compatible"
            },
            ModelProvider.OPENROUTER: {
                "api_key": settings.openrouter_api_keys[0] if settings.openrouter_api_keys else None,
                "base_url": settings.OPENROUTER_BASE_URL,
                "type": "openai-compatible"
            },
            ModelProvider.TOGETHER: {
                "api_key": settings.together_api_keys[0] if settings.together_api_keys else None,
                "base_url": settings.TOGETHER_BASE_URL,
                "type": "openai-compatible",
            },
            ModelProvider.MISTRAL: {
                "api_key": settings.mistral_api_keys[0] if settings.mistral_api_keys else None,
                "base_url": settings.MISTRAL_BASE_URL,
                "type": "openai-compatible",
            },
            ModelProvider.CEREBRAS: {
                "api_key": settings.cerebras_api_keys[0] if settings.cerebras_api_keys else None,
                "base_url": settings.CEREBRAS_BASE_URL,
                "type": "openai-compatible",
            },
            ModelProvider.SILICONFLOW: {
                "api_key": settings.siliconflow_api_keys[0] if settings.siliconflow_api_keys else None,
                "base_url": settings.SILICONFLOW_BASE_URL,
                "type": "openai-compatible",
            },
            ModelProvider.ALIBABA_BAILIAN: {
                "api_key": settings.alibaba_bailian_api_keys[0] if settings.alibaba_bailian_api_keys else None,
                "base_url": settings.ALIBABA_BAILIAN_BASE_URL,
                "type": "openai-compatible",
            },
            ModelProvider.DEEPSEEK: {
                "api_key": settings.deepseek_api_keys[0] if settings.deepseek_api_keys else None,
                "base_url": settings.DEEPSEEK_BASE_URL,
                "type": "openai-compatible",
            },
            ModelProvider.XAI: {
                "api_key": settings.xai_api_keys[0] if settings.xai_api_keys else None,
                "base_url": settings.XAI_BASE_URL,
                "type": "openai-compatible",
            },
            ModelProvider.ANTHROPIC: {
                "api_key": settings.anthropic_api_keys[0] if settings.anthropic_api_keys else None,
                "base_url": settings.ANTHROPIC_BASE_URL,
                "type": "anthropic",
            },
            ModelProvider.COHERE: {
                "api_key": settings.cohere_api_keys[0] if settings.cohere_api_keys else None,
                "base_url": settings.COHERE_BASE_URL,
                "type": "openai-compatible",
            },
            ModelProvider.AI21: {
                "api_key": settings.ai21_api_keys[0] if settings.ai21_api_keys else None,
                "base_url": settings.AI21_BASE_URL,
                "type": "openai-compatible",
            },
            ModelProvider.NOVITA: {
                "api_key": settings.novita_api_keys[0] if settings.novita_api_keys else None,
                "base_url": settings.NOVITA_BASE_URL,
                "type": "openai-compatible",
            },
            ModelProvider.SAMBANOVA: {
                "api_key": settings.sambanova_api_keys[0] if settings.sambanova_api_keys else None,
                "base_url": settings.SAMBANOVA_BASE_URL,
                "type": "openai-compatible",
            },
            ModelProvider.OPENAI: {
                "api_key": settings.OPENAI_API_KEY,
                "base_url": settings.OPENAI_BASE_URL,
                "type": "openai"
            },
            ModelProvider.GOOGLE_AI_STUDIO: {
                "api_key": settings.google_ai_studio_api_keys[0] if settings.google_ai_studio_api_keys else None,
                "base_url": "https://generativelanguage.googleapis.com",
                "type": "google-ai-studio"
            }
        }

        return configs.get(provider, {})


# Global instance
model_router = ModelRouter()
