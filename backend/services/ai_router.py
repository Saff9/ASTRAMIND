# backend/services/ai_router.py
"""
AstraMind Central AI Provider Router
Multi-provider streaming with circuit breakers, key rotation, and intelligent fallback.
FIXED: bleach.clean removed from JSON stream path (was corrupting all responses).
OPTIMIZED: Consolidated stream() method, no duplicated provider switch logic.
"""

import random
import logging
import time
import json
from typing import AsyncIterator, List, Optional, Dict, Any
from dataclasses import dataclass, field
from enum import Enum
import httpx

from core.system_prompt import get_system_prompt
from core.config import settings
from app.providers.groq import GroqProvider
from app.providers.openrouter import OpenRouterProvider
from app.providers.huggingface import HuggingFaceProvider
from app.providers.ollama import OllamaProvider
from app.providers.openai_compatible import OpenAICompatibleProvider
from app.providers.google_ai_studio import GoogleAIStudioProvider
from app.providers.cloudflare_workers_ai import CloudflareWorkersAIProvider
from app.providers.anthropic import AnthropicProvider
from services.key_pool import KeyPool

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────────────────────
# CIRCUIT BREAKER
# ──────────────────────────────────────────────────────────────────────────────

class CircuitState(Enum):
    CLOSED    = "closed"     # Normal
    OPEN      = "open"       # Failing — reject
    HALF_OPEN = "half_open"  # Testing recovery


@dataclass
class CircuitBreaker:
    failure_count: int        = 0
    success_count: int        = 0
    last_failure_time: float  = 0
    state: CircuitState       = CircuitState.CLOSED
    failure_threshold: int    = 5
    recovery_timeout: float   = 30.0
    half_open_max_calls: int  = 3

    def record_success(self):
        self.success_count += 1
        if self.state == CircuitState.HALF_OPEN:
            if self.success_count >= self.half_open_max_calls:
                self.state = CircuitState.CLOSED
                self.failure_count = 0
                self.success_count = 0
                logger.info("Circuit breaker CLOSED (recovered)")
        elif self.state == CircuitState.CLOSED:
            self.failure_count = max(0, self.failure_count - 1)

    def record_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.state == CircuitState.HALF_OPEN:
            self.state = CircuitState.OPEN
        elif self.state == CircuitState.CLOSED:
            if self.failure_count >= self.failure_threshold:
                self.state = CircuitState.OPEN
                logger.warning(f"Circuit OPEN ({self.failure_count} failures)")

    def can_execute(self) -> bool:
        if self.state == CircuitState.CLOSED:
            return True
        if self.state == CircuitState.OPEN:
            if time.time() - self.last_failure_time > self.recovery_timeout:
                self.state = CircuitState.HALF_OPEN
                self.success_count = 0
                logger.info("Circuit HALF_OPEN (testing recovery)")
                return True
            return False
        return self.success_count < self.half_open_max_calls


@dataclass
class ProviderStats:
    total_requests: int      = 0
    successful_requests: int = 0
    failed_requests: int     = 0
    avg_response_time: float = 0.0
    last_error: str          = ""
    last_success_time: float = 0
    circuit_breaker: CircuitBreaker = field(default_factory=CircuitBreaker)

    @property
    def success_rate(self) -> float:
        if self.total_requests == 0:
            return 1.0
        return self.successful_requests / self.total_requests

    @property
    def is_healthy(self) -> bool:
        return (
            self.circuit_breaker.state != CircuitState.OPEN
            and self.success_rate > 0.5
        )


# ──────────────────────────────────────────────────────────────────────────────
# AI ROUTER
# ──────────────────────────────────────────────────────────────────────────────

class AIRouter:
    """
    Routes AI requests across multiple providers with automatic fallback.
    Providers are initialized once (expensive) and reused per process.
    """

    def __init__(
        self,
        groq_keys:          Optional[List[str]] = None,
        openrouter_keys:    Optional[List[str]] = None,
        together_keys:      Optional[List[str]] = None,
        mistral_keys:       Optional[List[str]] = None,
        cerebras_keys:      Optional[List[str]] = None,
        siliconflow_keys:   Optional[List[str]] = None,
        google_keys:        Optional[List[str]] = None,
        alibaba_bailian_keys: Optional[List[str]] = None,
        deepseek_keys:      Optional[List[str]] = None,
        xai_keys:           Optional[List[str]] = None,
        anthropic_keys:     Optional[List[str]] = None,
        cohere_keys:        Optional[List[str]] = None,
        ai21_keys:          Optional[List[str]] = None,
        novita_keys:        Optional[List[str]] = None,
        sambanova_keys:     Optional[List[str]] = None,
        hf_key:             Optional[str] = None,
        openai_key:         Optional[str] = None,
        http_client:        httpx.AsyncClient | None = None,
    ):
        def _clean(keys: Optional[List[str]]) -> List[str]:
            return [k for k in (keys or []) if k]

        self.groq_keys           = _clean(groq_keys)
        self.openrouter_keys     = _clean(openrouter_keys)
        self.together_keys       = _clean(together_keys)
        self.mistral_keys        = _clean(mistral_keys)
        self.cerebras_keys       = _clean(cerebras_keys)
        self.siliconflow_keys    = _clean(siliconflow_keys)
        self.google_keys         = _clean(google_keys)
        self.alibaba_bailian_keys = _clean(alibaba_bailian_keys)
        self.deepseek_keys       = _clean(deepseek_keys)
        self.xai_keys            = _clean(xai_keys)
        self.anthropic_keys      = _clean(anthropic_keys)
        self.cohere_keys         = _clean(cohere_keys)
        self.ai21_keys           = _clean(ai21_keys)
        self.novita_keys         = _clean(novita_keys)
        self.sambanova_keys      = _clean(sambanova_keys)
        self.hf_key              = hf_key
        self.openai_key          = openai_key

        # Populate KeyPool
        self.key_pool = KeyPool()
        self.key_pool.add_keys("groq", self.groq_keys)
        self.key_pool.add_keys("openrouter", self.openrouter_keys)
        self.key_pool.add_keys("together", self.together_keys)
        self.key_pool.add_keys("mistral", self.mistral_keys)
        self.key_pool.add_keys("cerebras", self.cerebras_keys)
        self.key_pool.add_keys("siliconflow", self.siliconflow_keys)
        self.key_pool.add_keys("google_ai_studio", self.google_keys)
        self.key_pool.add_keys("alibaba_bailian", self.alibaba_bailian_keys)
        self.key_pool.add_keys("deepseek", self.deepseek_keys)
        self.key_pool.add_keys("xai", self.xai_keys)
        self.key_pool.add_keys("anthropic", self.anthropic_keys)
        self.key_pool.add_keys("cohere", self.cohere_keys)
        self.key_pool.add_keys("ai21", self.ai21_keys)
        self.key_pool.add_keys("novita", self.novita_keys)
        self.key_pool.add_keys("sambanova", self.sambanova_keys)

        # Provider instances (one per process)
        self.groq_provider       = GroqProvider(http_client=http_client)
        self.openrouter_provider = OpenRouterProvider(http_client=http_client)
        self.hf_provider         = HuggingFaceProvider(http_client=http_client)
        self.ollama_provider     = OllamaProvider()
        self.google_provider     = GoogleAIStudioProvider(http_client=http_client)
        self.anthropic_provider  = AnthropicProvider(http_client=http_client)

        # OpenAI-compatible providers
        def _compat(name: str, base_url: str) -> OpenAICompatibleProvider:
            return OpenAICompatibleProvider(name=name, base_url=base_url, http_client=http_client)

        self.openai_provider         = _compat("openai",         settings.OPENAI_BASE_URL)
        self.together_provider       = _compat("together",       settings.TOGETHER_BASE_URL)
        self.mistral_provider        = _compat("mistral",        settings.MISTRAL_BASE_URL)
        self.cerebras_provider       = _compat("cerebras",       settings.CEREBRAS_BASE_URL)
        self.siliconflow_provider    = _compat("siliconflow",    settings.SILICONFLOW_BASE_URL)
        self.alibaba_bailian_provider = _compat("alibaba_bailian", settings.ALIBABA_BAILIAN_BASE_URL)
        self.deepseek_provider       = _compat("deepseek",       settings.DEEPSEEK_BASE_URL)
        self.xai_provider            = _compat("xai",            settings.XAI_BASE_URL)
        self.cohere_provider         = _compat("cohere",         settings.COHERE_BASE_URL)
        self.ai21_provider           = _compat("ai21",           settings.AI21_BASE_URL)
        self.novita_provider         = _compat("novita",         settings.NOVITA_BASE_URL)
        self.sambanova_provider      = _compat("sambanova",      settings.SAMBANOVA_BASE_URL)

        self.cloudflare_provider = None
        if settings.CLOUDFLARE_ACCOUNT_ID and settings.CLOUDFLARE_API_TOKEN:
            self.cloudflare_provider = CloudflareWorkersAIProvider(
                account_id=settings.CLOUDFLARE_ACCOUNT_ID,
                api_token=settings.CLOUDFLARE_API_TOKEN,
                http_client=http_client,
            )

        # Stats & circuit breakers
        self.provider_stats: Dict[str, ProviderStats] = {}
        for name in [
            "groq", "openrouter", "together", "mistral", "cerebras",
            "siliconflow", "openai", "google_ai_studio", "cloudflare",
            "alibaba_bailian", "deepseek", "xai", "anthropic", "cohere",
            "ai21", "novita", "sambanova", "huggingface", "local",
        ]:
            self.provider_stats[name] = ProviderStats()

        configured = sum([
            len(self.groq_keys), len(self.openrouter_keys), len(self.together_keys),
            len(self.mistral_keys), len(self.cerebras_keys), len(self.siliconflow_keys),
            len(self.google_keys), len(self.alibaba_bailian_keys), len(self.deepseek_keys),
            len(self.xai_keys), len(self.anthropic_keys), len(self.cohere_keys),
            len(self.ai21_keys), len(self.novita_keys), len(self.sambanova_keys),
            (1 if self.hf_key else 0), (1 if self.openai_key else 0),
            (1 if self.cloudflare_provider else 0),
        ])
        logger.info(f"AIRouter initialized — {configured} API key(s) across providers")

    # ──────────────────────────────────────────────────────────────────────────
    # INTERNAL HELPERS
    # ──────────────────────────────────────────────────────────────────────────

    def _stats(self, name: str) -> ProviderStats:
        if name not in self.provider_stats:
            self.provider_stats[name] = ProviderStats()
        return self.provider_stats[name]

    def _has_keys(self, provider: str) -> bool:
        return {
            "groq":             len(self.groq_keys) > 0,
            "openrouter":       len(self.openrouter_keys) > 0,
            "together":         len(self.together_keys) > 0,
            "mistral":          len(self.mistral_keys) > 0,
            "cerebras":         len(self.cerebras_keys) > 0,
            "siliconflow":      len(self.siliconflow_keys) > 0,
            "openai":           self.openai_key is not None,
            "google_ai_studio": len(self.google_keys) > 0,
            "cloudflare":       self.cloudflare_provider is not None,
            "alibaba_bailian":  len(self.alibaba_bailian_keys) > 0,
            "deepseek":         len(self.deepseek_keys) > 0,
            "xai":              len(self.xai_keys) > 0,
            "anthropic":        len(self.anthropic_keys) > 0,
            "cohere":           len(self.cohere_keys) > 0,
            "ai21":             len(self.ai21_keys) > 0,
            "novita":           len(self.novita_keys) > 0,
            "sambanova":        len(self.sambanova_keys) > 0,
            "huggingface":      self.hf_key is not None,
            "local":            True,  # Ollama needs no key
        }.get(provider, False)

    def _build_fallback_chain(self, resolved_provider: Optional[str]) -> List[str]:
        """Build ordered fallback chain: preferred → healthy → everything else."""
        ALL_PROVIDERS = [
            "groq", "openrouter", "cerebras", "together", "mistral", "siliconflow",
            "deepseek", "sambanova", "novita", "openai", "google_ai_studio", "cloudflare",
            "alibaba_bailian", "xai", "anthropic", "cohere", "ai21", "huggingface", "local",
        ]
        chain: List[str] = []

        # Preferred first (if explicitly given)
        if resolved_provider and resolved_provider in ALL_PROVIDERS:
            chain.append(resolved_provider)

        # Healthy providers next
        for p in ALL_PROVIDERS:
            if p not in chain:
                s = self._stats(p)
                if s.is_healthy or s.circuit_breaker.state == CircuitState.HALF_OPEN:
                    chain.append(p)

        # Everything else as last resort
        for p in ALL_PROVIDERS:
            if p not in chain:
                chain.append(p)

        return chain

    async def _resolve_model(
        self, model: str, preferred_provider: Optional[str]
    ) -> tuple[str, str]:
        """Resolve model alias → (provider, model_name)."""
        try:
            from services.models import resolve_model
            return await resolve_model(model)
        except Exception as e:
            logger.error(f"Model resolve failed for '{model}': {e}")
            # If model looks like a real model name, use it directly
            if "/" in model or "-" in model:
                return preferred_provider or "groq", model
            return None, None  # type: ignore

    # ──────────────────────────────────────────────────────────────────────────
    # PROVIDER STREAMING — single implementation used by both public methods
    # ──────────────────────────────────────────────────────────────────────────

    async def _stream_from_provider(
        self,
        provider: str,
        prompt: str,
        model: str,
        messages: Optional[List[Dict[str, str]]] = None,
    ) -> AsyncIterator[str]:
        """
        Route to correct provider and yield raw SSE/JSON chunks.
        NOTE: chunks are raw provider output — do NOT bleach/sanitize here,
        as they are JSON objects, not HTML.
        """
        if provider == "groq":
            async for chunk in self._rotate_keys(
                self.groq_provider, self.groq_keys, prompt, model, messages
            ):
                yield chunk

        elif provider == "openrouter":
            async for chunk in self._rotate_keys(
                self.openrouter_provider, self.openrouter_keys, prompt, model, messages
            ):
                yield chunk

        elif provider == "anthropic":
            async for chunk in self._rotate_keys(
                self.anthropic_provider, self.anthropic_keys, prompt, model, messages
            ):
                yield chunk

        elif provider == "google_ai_studio":
            async for chunk in self._rotate_keys(
                self.google_provider, self.google_keys, prompt, model, messages
            ):
                yield chunk

        elif provider == "openai":
            if not self.openai_key:
                raise RuntimeError("No OpenAI API key configured")
            async for chunk in self.openai_provider.stream(
                prompt=prompt, model=model, api_key=self.openai_key, messages=messages
            ):
                yield chunk

        elif provider == "cloudflare":
            if not self.cloudflare_provider:
                raise RuntimeError("Cloudflare Workers AI not configured")
            async for chunk in self.cloudflare_provider.stream(
                prompt=prompt, model=model, api_key="", messages=messages
            ):
                yield chunk

        elif provider == "huggingface":
            if not self.hf_key:
                raise RuntimeError("No HuggingFace API key configured")
            async for chunk in self.hf_provider.stream(
                prompt=prompt, model=model, api_key=self.hf_key
            ):
                yield chunk

        elif provider == "local":
            async for chunk in self._stream_ollama(prompt, model, messages):
                yield chunk

        elif provider == "together":
            async for chunk in self._rotate_keys(
                self.together_provider, self.together_keys, prompt, model, messages
            ):
                yield chunk

        elif provider == "mistral":
            async for chunk in self._rotate_keys(
                self.mistral_provider, self.mistral_keys, prompt, model, messages
            ):
                yield chunk

        elif provider == "cerebras":
            async for chunk in self._rotate_keys(
                self.cerebras_provider, self.cerebras_keys, prompt, model, messages
            ):
                yield chunk

        elif provider == "siliconflow":
            async for chunk in self._rotate_keys(
                self.siliconflow_provider, self.siliconflow_keys, prompt, model, messages
            ):
                yield chunk

        elif provider == "alibaba_bailian":
            async for chunk in self._rotate_keys(
                self.alibaba_bailian_provider, self.alibaba_bailian_keys, prompt, model, messages
            ):
                yield chunk

        elif provider == "deepseek":
            async for chunk in self._rotate_keys(
                self.deepseek_provider, self.deepseek_keys, prompt, model, messages
            ):
                yield chunk

        elif provider == "xai":
            async for chunk in self._rotate_keys(
                self.xai_provider, self.xai_keys, prompt, model, messages
            ):
                yield chunk

        elif provider == "cohere":
            async for chunk in self._rotate_keys(
                self.cohere_provider, self.cohere_keys, prompt, model, messages
            ):
                yield chunk

        elif provider == "ai21":
            async for chunk in self._rotate_keys(
                self.ai21_provider, self.ai21_keys, prompt, model, messages
            ):
                yield chunk

        elif provider == "novita":
            async for chunk in self._rotate_keys(
                self.novita_provider, self.novita_keys, prompt, model, messages
            ):
                yield chunk

        elif provider == "sambanova":
            async for chunk in self._rotate_keys(
                self.sambanova_provider, self.sambanova_keys, prompt, model, messages
            ):
                yield chunk

        else:
            raise ValueError(f"Unknown provider: '{provider}'")

    async def _rotate_keys(
        self,
        provider_obj: Any,
        keys: List[str],
        prompt: str,
        model: str,
        messages: Optional[List[Dict[str, str]]] = None,
    ) -> AsyncIterator[str]:
        """Try each key in rotation until one succeeds using KeyPool."""
        if not keys:
            raise RuntimeError(f"No API keys for {getattr(provider_obj, 'name', str(provider_obj))}")

        # Map keys list to provider name
        provider_name = "unknown"
        if keys is self.groq_keys: provider_name = "groq"
        elif keys is self.openrouter_keys: provider_name = "openrouter"
        elif keys is self.together_keys: provider_name = "together"
        elif keys is self.mistral_keys: provider_name = "mistral"
        elif keys is self.cerebras_keys: provider_name = "cerebras"
        elif keys is self.siliconflow_keys: provider_name = "siliconflow"
        elif keys is self.google_keys: provider_name = "google_ai_studio"
        elif keys is self.alibaba_bailian_keys: provider_name = "alibaba_bailian"
        elif keys is self.deepseek_keys: provider_name = "deepseek"
        elif keys is self.xai_keys: provider_name = "xai"
        elif keys is self.anthropic_keys: provider_name = "anthropic"
        elif keys is self.cohere_keys: provider_name = "cohere"
        elif keys is self.ai21_keys: provider_name = "ai21"
        elif keys is self.novita_keys: provider_name = "novita"
        elif keys is self.sambanova_keys: provider_name = "sambanova"

        if provider_name == "unknown":
            last_error = None
            for idx, key in enumerate(keys):
                try:
                    async for chunk in provider_obj.stream(
                        prompt=prompt, model=model, api_key=key, messages=messages
                    ):
                        yield chunk
                    return
                except Exception as e:
                    last_error = e
                    if idx < len(keys) - 1:
                        continue
            raise RuntimeError(f"All keys exhausted. Last: {last_error}")

        last_error = None
        num_keys = len(keys)
        for idx in range(num_keys):
            key_state = self.key_pool.acquire(provider_name)
            if not key_state:
                break
            try:
                async for chunk in provider_obj.stream(
                    prompt=prompt, model=model, api_key=key_state.key, messages=messages
                ):
                    yield chunk
                self.key_pool.mark_success(provider_name, key_state)
                return
            except Exception as e:
                last_error = e
                err_str = str(e).lower()
                if "429" in err_str or "rate_limit" in err_str or "too many requests" in err_str:
                    logger.warning(f"Rate limit 429 on {provider_name} key. Cooling down.")
                    self.key_pool.cooldown_429(provider_name, key_state)
                else:
                    logger.warning(f"Error on {provider_name} key: {e}. Cooling down.")
                    self.key_pool.cooldown(provider_name, key_state, seconds=60)
                if idx < num_keys - 1:
                    continue

        raise RuntimeError(f"All keys for {provider_name} exhausted or rate limited. Last: {last_error}")

    async def _stream_ollama(
        self, prompt: str, model: str,
        messages: Optional[List[Dict[str, str]]] = None
    ) -> AsyncIterator[str]:
        """Stream from local Ollama with system prompt injection."""
        system_prompt = get_system_prompt()
        msg_list = [{"role": "system", "content": system_prompt}]
        if messages:
            for m in messages[-50:]:
                role = m.get("role", "user")
                content = m.get("content", "")
                if role in ("user", "assistant") and content:
                    msg_list.append({"role": role, "content": content})
        msg_list.append({"role": "user", "content": prompt})
        async for chunk in self.ollama_provider.stream(
            prompt=prompt, model=model, messages=msg_list
        ):
            yield chunk

    # ──────────────────────────────────────────────────────────────────────────
    # PUBLIC API
    # ──────────────────────────────────────────────────────────────────────────

    async def stream_with_fallback(
        self,
        prompt: str,
        model: str,
        preferred_provider: Optional[str] = None,
        messages: Optional[List[Dict[str, str]]] = None,
    ) -> AsyncIterator[str]:
        """
        Stream with automatic fallback chain.
        Tries providers in priority order until one succeeds.
        Yields raw provider chunks (JSON SSE format).
        """
        if not prompt or not isinstance(prompt, str):
            yield json.dumps({"error": "Invalid prompt", "type": "error"})
            return
        if not model:
            yield json.dumps({"error": "Model not specified", "type": "error"})
            return

        # Resolve model alias → (provider, real_model)
        resolved_provider, resolved_model = await self._resolve_model(model, preferred_provider)
        if not resolved_model:
            yield json.dumps({"error": f"Could not resolve model: {model}", "type": "error"})
            return

        logger.info(f"Model '{model}' → provider='{resolved_provider}', model='{resolved_model}'")

        fallback_chain = self._build_fallback_chain(resolved_provider)
        last_error = None
        tried: List[str] = []
        accumulated_text = ""

        from services.models import get_model_for_provider

        for provider in fallback_chain:
            tried.append(provider)
            stats = self._stats(provider)

            if not stats.circuit_breaker.can_execute():
                logger.debug(f"Skipping {provider} — circuit OPEN")
                continue
            if not self._has_keys(provider):
                logger.debug(f"Skipping {provider} — no keys")
                continue

            try:
                start = time.time()
                provider_model = get_model_for_provider(model, provider) or resolved_model
                
                # Request continuation if previous provider failed mid-stream
                current_prompt = prompt
                if accumulated_text:
                    current_prompt = (
                        f"{prompt}\n\n[System Alert: The previous model stream failed mid-response. "
                        f"Please continue completing the answer exactly from where it left off. Do not repeat the initial part. "
                        f"Here is the generated partial response so far:\n{accumulated_text}\n"
                        f"Please continue/complete it below:]"
                    )

                logger.info(f"Attempting: {provider} / {provider_model} (has_accumulated={bool(accumulated_text)})")

                async for chunk in self._stream_from_provider(
                    provider, current_prompt, provider_model, messages
                ):
                    try:
                        parsed = json.loads(chunk)
                        if isinstance(parsed, dict):
                            content = None
                            if "choices" in parsed and parsed["choices"]:
                                delta = parsed["choices"][0].get("delta", {})
                                content = delta.get("content")
                            elif "content" in parsed:
                                content = parsed["content"]
                            if content:
                                accumulated_text += content
                    except Exception:
                        if chunk.strip() and not chunk.startswith("{"):
                            accumulated_text += chunk
                    
                    yield chunk

                elapsed = time.time() - start
                stats.total_requests += 1
                stats.successful_requests += 1
                stats.avg_response_time = (
                    (stats.avg_response_time * (stats.successful_requests - 1) + elapsed)
                    / stats.successful_requests
                )
                stats.last_success_time = time.time()
                stats.circuit_breaker.record_success()
                logger.info(f"Provider {provider} succeeded in {elapsed:.2f}s")
                return

            except Exception as e:
                elapsed = time.time() - start
                stats.total_requests += 1
                stats.failed_requests += 1
                stats.last_error = str(e)
                stats.circuit_breaker.record_failure()
                last_error = e
                logger.warning(f"Provider {provider} failed ({elapsed:.2f}s): {type(e).__name__}: {e}")
                # Log that we will attempt fallback continuation if we had content
                if accumulated_text:
                    logger.info(f"Retrying with next provider after generating {len(accumulated_text)} characters.")
                continue

        # All providers failed
        logger.error(f"All providers failed. Tried: {tried}. Last: {last_error}")
        yield json.dumps({
            "content": (
                "I'm having trouble connecting to my AI providers right now. "
                "Trying to reconnect... Please wait a moment. 🔄"
            ),
            "type": "fallback",
        })

    async def stream(
        self,
        prompt: str,
        model: str,
        provider: str,
        messages: Optional[List[Dict[str, str]]] = None,
    ) -> AsyncIterator[str]:
        """
        Stream from a specific named provider (no fallback).
        Raises ValueError/RuntimeError on failure.
        """
        if not prompt or not isinstance(prompt, str):
            raise ValueError("Prompt must be a non-empty string")
        if not model:
            raise ValueError("Model name is required")
        if not self._has_keys(provider):
            raise ValueError(f"No API keys configured for provider: {provider}")

        try:
            async for chunk in self._stream_from_provider(provider, prompt, model, messages):
                yield chunk
        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Error streaming from {provider}: {e}", exc_info=True)
            raise RuntimeError(f"Failed to stream from {provider}: {e}")

    def get_provider_stats(self) -> Dict[str, Any]:
        """Return current health stats for all providers."""
        result = {}
        for name, stats in self.provider_stats.items():
            result[name] = {
                "total": stats.total_requests,
                "success": stats.successful_requests,
                "failed": stats.failed_requests,
                "success_rate": round(stats.success_rate * 100, 1),
                "avg_ms": round(stats.avg_response_time * 1000, 1),
                "circuit": stats.circuit_breaker.state.value,
                "healthy": stats.is_healthy,
                "has_keys": self._has_keys(name),
            }
        return result
