# backend/app/services/ai_router.py
"""
Central AI Provider Router
Handles routing requests to multiple AI providers with fallback support.
PRODUCTION READY: Circuit breaker, multi-layer fallback, intelligent provider selection
"""

import random
import logging
import time
import json
from typing import AsyncIterator, List, Optional, Dict, Any
from dataclasses import dataclass, field
from enum import Enum
import httpx
import bleach
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

logger = logging.getLogger(__name__)


class CircuitState(Enum):
    """Circuit breaker states."""
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing if recovered


@dataclass
class CircuitBreaker:
    """Circuit breaker for provider health tracking."""
    failure_count: int = 0
    success_count: int = 0
    last_failure_time: float = 0
    state: CircuitState = CircuitState.CLOSED
    failure_threshold: int = 5
    recovery_timeout: float = 30.0  # seconds
    half_open_max_calls: int = 3
    
    def record_success(self):
        """Record successful call."""
        self.success_count += 1
        if self.state == CircuitState.HALF_OPEN:
            if self.success_count >= self.half_open_max_calls:
                self.state = CircuitState.CLOSED
                self.failure_count = 0
                self.success_count = 0
                logger.info("Circuit breaker CLOSED (recovered)")
        elif self.state == CircuitState.CLOSED:
            # Reset failure count on success
            self.failure_count = max(0, self.failure_count - 1)
    
    def record_failure(self):
        """Record failed call."""
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.state == CircuitState.HALF_OPEN:
            self.state = CircuitState.OPEN
            logger.warning("Circuit breaker OPEN (failed in half-open)")
        elif self.state == CircuitState.CLOSED:
            if self.failure_count >= self.failure_threshold:
                self.state = CircuitState.OPEN
                logger.warning(f"Circuit breaker OPEN ({self.failure_count} failures)")
    
    def can_execute(self) -> bool:
        """Check if request can be executed."""
        if self.state == CircuitState.CLOSED:
            return True
        if self.state == CircuitState.OPEN:
            # Check if recovery timeout has passed
            if time.time() - self.last_failure_time > self.recovery_timeout:
                self.state = CircuitState.HALF_OPEN
                self.success_count = 0
                logger.info("Circuit breaker HALF_OPEN (testing recovery)")
                return True
            return False
        # HALF_OPEN - allow limited calls
        return self.success_count < self.half_open_max_calls


@dataclass
class ProviderStats:
    """Statistics for each provider."""
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    avg_response_time: float = 0.0
    last_error: str = ""
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
            self.circuit_breaker.state != CircuitState.OPEN and
            self.success_rate > 0.5
        )


class AIRouter:
    """
    Routes AI requests across multiple providers with fallback support.
    Accepts API keys and manages provider selection.
    """

    def __init__(
        self,
        groq_keys: Optional[List[str]] = None,
        openrouter_keys: Optional[List[str]] = None,
        together_keys: Optional[List[str]] = None,
        mistral_keys: Optional[List[str]] = None,
        cerebras_keys: Optional[List[str]] = None,
        siliconflow_keys: Optional[List[str]] = None,
        google_keys: Optional[List[str]] = None,
        alibaba_bailian_keys: Optional[List[str]] = None,
        deepseek_keys: Optional[List[str]] = None,
        xai_keys: Optional[List[str]] = None,
        anthropic_keys: Optional[List[str]] = None,
        cohere_keys: Optional[List[str]] = None,
        ai21_keys: Optional[List[str]] = None,
        novita_keys: Optional[List[str]] = None,
        sambanova_keys: Optional[List[str]] = None,
        hf_key: Optional[str] = None,
        openai_key: Optional[str] = None,
        http_client: httpx.AsyncClient | None = None,
    ):
        """
        Initialize AI Router with provider API keys.

        Args:
            groq_keys: List of Groq API keys
            openrouter_keys: List of OpenRouter API keys
            hf_key: HuggingFace API key
        """
        self.groq_keys = [k for k in (groq_keys or []) if k]
        self.openrouter_keys = [k for k in (openrouter_keys or []) if k]
        self.together_keys = [k for k in (together_keys or []) if k]
        self.mistral_keys = [k for k in (mistral_keys or []) if k]
        self.cerebras_keys = [k for k in (cerebras_keys or []) if k]
        self.siliconflow_keys = [k for k in (siliconflow_keys or []) if k]
        self.google_keys = [k for k in (google_keys or []) if k]
        self.alibaba_bailian_keys = [k for k in (alibaba_bailian_keys or []) if k]
        self.deepseek_keys = [k for k in (deepseek_keys or []) if k]
        self.xai_keys = [k for k in (xai_keys or []) if k]
        self.anthropic_keys = [k for k in (anthropic_keys or []) if k]
        self.cohere_keys = [k for k in (cohere_keys or []) if k]
        self.ai21_keys = [k for k in (ai21_keys or []) if k]
        self.novita_keys = [k for k in (novita_keys or []) if k]
        self.sambanova_keys = [k for k in (sambanova_keys or []) if k]
        self.hf_key = hf_key
        self.openai_key = openai_key

        # Initialize providers
        self.groq_provider = GroqProvider(http_client=http_client)
        self.openrouter_provider = OpenRouterProvider(http_client=http_client)
        self.hf_provider = HuggingFaceProvider(http_client=http_client)
        self.ollama_provider = OllamaProvider()
        self.google_provider = GoogleAIStudioProvider(http_client=http_client)

        # OpenAI-compatible providers
        self.openai_provider = OpenAICompatibleProvider(
            name="openai",
            base_url=settings.OPENAI_BASE_URL,
            http_client=http_client,
        )
        self.together_provider = OpenAICompatibleProvider(
            name="together",
            base_url=settings.TOGETHER_BASE_URL,
            http_client=http_client,
        )
        self.mistral_provider = OpenAICompatibleProvider(
            name="mistral",
            base_url=settings.MISTRAL_BASE_URL,
            http_client=http_client,
        )
        self.cerebras_provider = OpenAICompatibleProvider(
            name="cerebras",
            base_url=settings.CEREBRAS_BASE_URL,
            http_client=http_client,
        )
        self.siliconflow_provider = OpenAICompatibleProvider(
            name="siliconflow",
            base_url=settings.SILICONFLOW_BASE_URL,
            http_client=http_client,
        )
        self.alibaba_bailian_provider = OpenAICompatibleProvider(
            name="alibaba_bailian",
            base_url=settings.ALIBABA_BAILIAN_BASE_URL,
            http_client=http_client,
        )
        self.deepseek_provider = OpenAICompatibleProvider(
            name="deepseek",
            base_url=settings.DEEPSEEK_BASE_URL,
            http_client=http_client,
        )
        self.xai_provider = OpenAICompatibleProvider(
            name="xai",
            base_url=settings.XAI_BASE_URL,
            http_client=http_client,
        )
        self.anthropic_provider = AnthropicProvider(http_client=http_client)
        self.cohere_provider = OpenAICompatibleProvider(
            name="cohere",
            base_url=settings.COHERE_BASE_URL,
            http_client=http_client,
        )
        self.ai21_provider = OpenAICompatibleProvider(
            name="ai21",
            base_url=settings.AI21_BASE_URL,
            http_client=http_client,
        )
        self.novita_provider = OpenAICompatibleProvider(
            name="novita",
            base_url=settings.NOVITA_BASE_URL,
            http_client=http_client,
        )
        self.sambanova_provider = OpenAICompatibleProvider(
            name="sambanova",
            base_url=settings.SAMBANOVA_BASE_URL,
            http_client=http_client,
        )

        self.cloudflare_provider = None
        if settings.CLOUDFLARE_ACCOUNT_ID and settings.CLOUDFLARE_API_TOKEN:
            self.cloudflare_provider = CloudflareWorkersAIProvider(
                account_id=settings.CLOUDFLARE_ACCOUNT_ID,
                api_token=settings.CLOUDFLARE_API_TOKEN,
                http_client=http_client,
            )

        # Initialize provider statistics and circuit breakers
        self.provider_stats: Dict[str, ProviderStats] = {}
        self._init_provider_stats()
        
        logger.info(
            f"AIRouter initialized: "
            f"Groq keys={len(self.groq_keys)}, "
            f"OpenRouter keys={len(self.openrouter_keys)}, "
            f"Together keys={len(self.together_keys)}, "
            f"Mistral keys={len(self.mistral_keys)}, "
            f"Cerebras keys={len(self.cerebras_keys)}, "
            f"SiliconFlow keys={len(self.siliconflow_keys)}, "
            f"Google keys={len(self.google_keys)}, "
            f"Alibaba Bailian keys={len(self.alibaba_bailian_keys)}, "
            f"DeepSeek keys={len(self.deepseek_keys)}, "
            f"xAI keys={len(self.xai_keys)}, "
            f"Anthropic keys={len(self.anthropic_keys)}, "
            f"Cohere keys={len(self.cohere_keys)}, "
            f"AI21 keys={len(self.ai21_keys)}, "
            f"Novita keys={len(self.novita_keys)}, "
            f"SambaNova keys={len(self.sambanova_keys)}, "
            f"HF key={'yes' if self.hf_key else 'no'}, "
            f"OpenAI key={'yes' if self.openai_key else 'no'}, "
            f"Cloudflare={'configured' if self.cloudflare_provider else 'not configured'}, "
            f"Ollama={'configured' if settings.OLLAMA_URL else 'not configured'}"
        )
    
    def _init_provider_stats(self):
        """Initialize statistics tracking for all providers."""
        provider_names = [
            "groq", "openrouter", "together", "mistral", "cerebras", 
            "siliconflow", "openai", "google_ai_studio", "cloudflare",
            "alibaba_bailian", "deepseek", "xai", "anthropic", "cohere",
            "ai21", "novita", "sambanova", "huggingface", "local"
        ]
        for name in provider_names:
            self.provider_stats[name] = ProviderStats()
    
    def _get_provider_stats(self, provider_name: str) -> ProviderStats:
        """Get or create stats for a provider."""
        if provider_name not in self.provider_stats:
            self.provider_stats[provider_name] = ProviderStats()
        return self.provider_stats[provider_name]
    
    async def stream_with_fallback(
        self,
        prompt: str,
        model: str,
        preferred_provider: Optional[str] = None,
        messages: Optional[List[Dict[str, str]]] = None,
    ) -> AsyncIterator[str]:
        """
        Stream AI response with intelligent fallback chain.
        
        CRITICAL FEATURES:
        1. Circuit breaker prevents calling failing providers
        2. Automatic fallback to next available provider
        3. Tracks success/failure rates for smart routing
        4. Never throws unhandled exceptions - always returns content
        
        Args:
            prompt: User prompt
            model: Model tier (fast, balanced, smart) or specific model
            preferred_provider: Optional preferred provider
            
        Yields:
            Response chunks from first successful provider (RAW JSON strings from providers)
        """
        # Validate inputs
        if not prompt or not isinstance(prompt, str):
            logger.error("Invalid prompt")
            yield json.dumps({"error": "Invalid prompt", "type": "error"})
            return
        if not model:
            logger.error("Model not specified")
            yield json.dumps({"error": "Model not specified", "type": "error"})
            return
        
        # IMPORTANT: Resolve model alias to actual provider/model BEFORE building fallback chain
        # This prevents sending "smart", "fast", etc. as model names to APIs
        resolved_provider, resolved_model = await self._resolve_model_for_streaming(model, preferred_provider)
        
        if not resolved_model:
            logger.error(f"Could not resolve model: {model}")
            yield json.dumps({"error": f"Model '{model}' not found", "type": "error"})
            return
        
        logger.info(f"Resolved model '{model}' -> provider='{resolved_provider}', model='{resolved_model}'")
        
        # Build fallback chain based on RESOLVED provider
        fallback_chain = self._build_fallback_chain(resolved_model, resolved_provider)
        
        last_error = None
        tried_providers = []
        
        for provider in fallback_chain:
            tried_providers.append(provider)
            stats = self._get_provider_stats(provider)
            
            # Check circuit breaker
            if not stats.circuit_breaker.can_execute():
                logger.debug(f"Skipping {provider} - circuit breaker OPEN")
                continue
            
            # Check if provider has keys configured
            if not self._has_provider_keys(provider):
                logger.debug(f"Skipping {provider} - no keys configured")
                continue
            
            try:
                logger.info(f"Attempting provider: {provider} with model: {resolved_model}")
                start_time = time.time()
                
                # Stream from provider - pass the RESOLVED model name (NOT the alias)
                async for chunk in self._stream_from_provider(provider, prompt, resolved_model, messages):
                    # Sanitize output (SEC-005 mitigation) against XSS injections
                    allowed_tags = ['p', 'br', 'strong', 'em', 'code', 'pre', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'blockquote']
                    safe_chunk = bleach.clean(chunk, tags=allowed_tags, strip=True) if chunk else chunk
                    yield safe_chunk
                    stats.circuit_breaker.record_success()
                
                # Success!
                elapsed = time.time() - start_time
                stats.total_requests += 1
                stats.successful_requests += 1
                stats.avg_response_time = (
                    (stats.avg_response_time * (stats.successful_requests - 1) + elapsed) 
                    / stats.successful_requests
                )
                stats.last_success_time = time.time()
                
                logger.info(f"Provider {provider} succeeded in {elapsed:.2f}s")
                return
                
            except Exception as e:
                elapsed = time.time() - start_time
                stats.total_requests += 1
                stats.failed_requests += 1
                stats.last_error = str(e)
                stats.circuit_breaker.record_failure()
                last_error = e
                
                logger.warning(
                    f"Provider {provider} failed after {elapsed:.2f}s: {type(e).__name__}: {e}"
                )
                # Continue to next provider in fallback chain
                continue
        
        # All providers failed - return graceful fallback message
        logger.error(f"All providers failed. Tried: {tried_providers}. Last error: {last_error}")
        yield json.dumps({"content": "Service temporarily unavailable. Please try again in a moment.", "type": "fallback"})
    
    def _build_fallback_chain(self, model: str, preferred: Optional[str] = None) -> List[str]:
        """Build intelligent fallback chain based on model tier and provider health."""
        # Default fallback chains by model tier
        fast_chain = ["groq", "cerebras", "together", "siliconflow", "ollama", "openrouter"]
        balanced_chain = ["groq", "mistral", "together", "openrouter", "deepseek", "ollama"]
        smart_chain = ["anthropic", "openai", "google_ai_studio", "groq", "openrouter"]
        
        # Select base chain
        model_lower = model.lower()
        if "fast" in model_lower or "llama-3" in model_lower:
            base_chain = fast_chain
        elif "smart" in model_lower or "claude" in model_lower:
            base_chain = smart_chain
        else:
            base_chain = balanced_chain
        
        # Add all remaining providers as ultimate fallback
        all_providers = [
            "groq", "openrouter", "together", "mistral", "cerebras", 
            "siliconflow", "openai", "google_ai_studio", "cloudflare",
            "alibaba_bailian", "deepseek", "xai", "anthropic", "cohere",
            "ai21", "novita", "sambanova", "huggingface", "local"
        ]
        
        # Build final chain: preferred -> healthy providers -> all others
        final_chain = []
        
        # Add preferred provider first if specified
        if preferred and preferred in all_providers:
            final_chain.append(preferred)
        
        # Add healthy providers from base chain
        for provider in base_chain:
            if provider not in final_chain:
                stats = self._get_provider_stats(provider)
                if stats.is_healthy or stats.circuit_breaker.state == CircuitState.HALF_OPEN:
                    final_chain.append(provider)
        
        # Add remaining providers as last resort
        for provider in all_providers:
            if provider not in final_chain:
                final_chain.append(provider)
        
        return final_chain
    
    def _has_provider_keys(self, provider: str) -> bool:
        """Check if provider has API keys configured."""
        key_checks = {
            "groq": len(self.groq_keys) > 0,
            "openrouter": len(self.openrouter_keys) > 0,
            "together": len(self.together_keys) > 0,
            "mistral": len(self.mistral_keys) > 0,
            "cerebras": len(self.cerebras_keys) > 0,
            "siliconflow": len(self.siliconflow_keys) > 0,
            "openai": self.openai_key is not None,
            "google_ai_studio": len(self.google_keys) > 0,
            "cloudflare": self.cloudflare_provider is not None,
            "alibaba_bailian": len(self.alibaba_bailian_keys) > 0,
            "deepseek": len(self.deepseek_keys) > 0,
            "xai": len(self.xai_keys) > 0,
            "anthropic": len(self.anthropic_keys) > 0,
            "cohere": len(self.cohere_keys) > 0,
            "ai21": len(self.ai21_keys) > 0,
            "novita": len(self.novita_keys) > 0,
            "sambanova": len(self.sambanova_keys) > 0,
            "huggingface": self.hf_key is not None,
            "local": True,  # Ollama doesn't need keys
        }
        return key_checks.get(provider, False)
    
    async def _resolve_model_for_streaming(self, model: str, preferred_provider: Optional[str] = None) -> tuple[str, str]:
        """
        Resolve model alias (fast, balanced, smart) to actual provider and model name.
        
        This is CRITICAL to prevent sending model aliases like "smart" to provider APIs.
        Instead, we resolve them to actual model names like "mixtral-8x7b-32768".
        
        Args:
            model: Model alias or specific model name
            preferred_provider: Optional preferred provider
            
        Returns:
            Tuple of (provider_name, model_name)
        """
        try:
            from services.models import resolve_model
            provider, resolved_model = await resolve_model(model)
            return provider, resolved_model
        except Exception as e:
            logger.error(f"Failed to resolve model '{model}': {e}")
            # Fallback: if model looks like a specific model name, use it directly
            if "/" in model or "-" in model:
                # Likely a specific model name, use preferred provider or default
                return preferred_provider or "groq", model
            # Otherwise return None to trigger error
            return None, None
    
    
    async def _stream_from_provider(
        self,
        provider: str,
        prompt: str,
        model: str,
        messages: Optional[List[Dict[str, str]]] = None,
    ) -> AsyncIterator[str]:
        """Route to specific provider streaming method."""
        if provider == "groq":
            async for chunk in self._stream_groq(prompt, model, messages):
                yield chunk
        elif provider == "openrouter":
            async for chunk in self._stream_openrouter(prompt, model, messages):
                yield chunk
        elif provider == "together":
            async for chunk in self._stream_openai_compatible(self.together_provider, self.together_keys, prompt, model, messages):
                yield chunk
        elif provider == "mistral":
            async for chunk in self._stream_openai_compatible(self.mistral_provider, self.mistral_keys, prompt, model, messages):
                yield chunk
        elif provider == "cerebras":
            async for chunk in self._stream_openai_compatible(self.cerebras_provider, self.cerebras_keys, prompt, model, messages):
                yield chunk
        elif provider == "siliconflow":
            async for chunk in self._stream_openai_compatible(self.siliconflow_provider, self.siliconflow_keys, prompt, model, messages):
                yield chunk
        elif provider == "openai":
            async for chunk in self.openai_provider.stream(prompt=prompt, model=model, api_key=self.openai_key, messages=messages):
                yield chunk
        elif provider == "google_ai_studio":
            async for chunk in self._stream_google(prompt, model, messages):
                yield chunk
        elif provider == "cloudflare":
            async for chunk in self.cloudflare_provider.stream(prompt=prompt, model=model, api_key="", messages=messages):
                yield chunk
        elif provider == "alibaba_bailian":
            async for chunk in self._stream_openai_compatible(self.alibaba_bailian_provider, self.alibaba_bailian_keys, prompt, model, messages):
                yield chunk
        elif provider == "deepseek":
            async for chunk in self._stream_openai_compatible(self.deepseek_provider, self.deepseek_keys, prompt, model, messages):
                yield chunk
        elif provider == "xai":
            async for chunk in self._stream_openai_compatible(self.xai_provider, self.xai_keys, prompt, model, messages):
                yield chunk
        elif provider == "anthropic":
            async for chunk in self._stream_anthropic(prompt, model, messages):
                yield chunk
        elif provider == "cohere":
            async for chunk in self._stream_openai_compatible(self.cohere_provider, self.cohere_keys, prompt, model, messages):
                yield chunk
        elif provider == "ai21":
            async for chunk in self._stream_openai_compatible(self.ai21_provider, self.ai21_keys, prompt, model, messages):
                yield chunk
        elif provider == "novita":
            async for chunk in self._stream_openai_compatible(self.novita_provider, self.novita_keys, prompt, model, messages):
                yield chunk
        elif provider == "sambanova":
            async for chunk in self._stream_openai_compatible(self.sambanova_provider, self.sambanova_keys, prompt, model, messages):
                yield chunk
        elif provider == "huggingface":
            async for chunk in self._stream_huggingface(prompt, model, messages):
                yield chunk
        elif provider == "local":
            async for chunk in self._stream_ollama(prompt, model, messages):
                yield chunk
        else:
            raise ValueError(f"Unknown provider: {provider}")

    async def stream(
        self,
        prompt: str,
        model: str,
        provider: str,
        messages: Optional[List[Dict[str, str]]] = None,
    ) -> AsyncIterator[str]:
        """
        Stream AI response from specified provider with comprehensive error handling.

        Args:
            prompt: Current user prompt
            model: Model name
            provider: Provider name (groq, openrouter, huggingface, local, ...)
            messages: Optional conversation history [{"role": "user"|"assistant", "content": "..."}]

        Yields:
            Response chunks from AI provider
        """
        if not prompt or not isinstance(prompt, str):
            raise ValueError("Prompt must be a non-empty string")
        if not model:
            raise ValueError("Model name is required")

        try:
            if provider == "groq":
                if not self.groq_keys:
                    raise ValueError("No Groq API keys configured")
                async for chunk in self._stream_groq(prompt, model, messages):
                    yield chunk

            elif provider == "openrouter":
                if not self.openrouter_keys:
                    raise ValueError("No OpenRouter API keys configured")
                async for chunk in self._stream_openrouter(prompt, model, messages):
                    yield chunk

            elif provider == "together":
                if not self.together_keys:
                    raise ValueError("No Together API keys configured")
                async for chunk in self._stream_openai_compatible(self.together_provider, self.together_keys, prompt, model, messages):
                    yield chunk

            elif provider == "mistral":
                if not self.mistral_keys:
                    raise ValueError("No Mistral API keys configured")
                async for chunk in self._stream_openai_compatible(self.mistral_provider, self.mistral_keys, prompt, model, messages):
                    yield chunk

            elif provider == "cerebras":
                if not self.cerebras_keys:
                    raise ValueError("No Cerebras API keys configured")
                async for chunk in self._stream_openai_compatible(self.cerebras_provider, self.cerebras_keys, prompt, model, messages):
                    yield chunk

            elif provider == "siliconflow":
                if not self.siliconflow_keys:
                    raise ValueError("No SiliconFlow API keys configured")
                async for chunk in self._stream_openai_compatible(self.siliconflow_provider, self.siliconflow_keys, prompt, model, messages):
                    yield chunk

            elif provider == "openai":
                if not self.openai_key:
                    raise ValueError("No OpenAI API key configured")
                async for chunk in self.openai_provider.stream(prompt=prompt, model=model, api_key=self.openai_key, messages=messages):
                    yield chunk

            elif provider == "google_ai_studio":
                if not self.google_keys:
                    raise ValueError("No Google AI Studio API keys configured")
                async for chunk in self._stream_google(prompt, model, messages):
                    yield chunk

            elif provider == "cloudflare":
                if not self.cloudflare_provider:
                    raise ValueError("Cloudflare Workers AI not configured")
                async for chunk in self.cloudflare_provider.stream(prompt=prompt, model=model, api_key="", messages=messages):
                    yield chunk

            elif provider == "alibaba_bailian":
                if not self.alibaba_bailian_keys:
                    raise ValueError("No Alibaba Bailian API keys configured")
                async for chunk in self._stream_openai_compatible(
                    self.alibaba_bailian_provider, self.alibaba_bailian_keys, prompt, model, messages
                ):
                    yield chunk

            elif provider == "deepseek":
                if not self.deepseek_keys:
                    raise ValueError("No DeepSeek API keys configured")
                async for chunk in self._stream_openai_compatible(
                    self.deepseek_provider, self.deepseek_keys, prompt, model, messages
                ):
                    yield chunk

            elif provider == "xai":
                if not self.xai_keys:
                    raise ValueError("No xAI API keys configured")
                async for chunk in self._stream_openai_compatible(
                    self.xai_provider, self.xai_keys, prompt, model, messages
                ):
                    yield chunk

            elif provider == "anthropic":
                if not self.anthropic_keys:
                    raise ValueError("No Anthropic API keys configured")
                async for chunk in self._stream_anthropic(prompt, model, messages):
                    yield chunk

            elif provider == "cohere":
                if not self.cohere_keys:
                    raise ValueError("No Cohere API keys configured")
                async for chunk in self._stream_openai_compatible(
                    self.cohere_provider, self.cohere_keys, prompt, model, messages
                ):
                    yield chunk

            elif provider == "ai21":
                if not self.ai21_keys:
                    raise ValueError("No AI21 API keys configured")
                async for chunk in self._stream_openai_compatible(
                    self.ai21_provider, self.ai21_keys, prompt, model, messages
                ):
                    yield chunk

            elif provider == "novita":
                if not self.novita_keys:
                    raise ValueError("No Novita AI API keys configured")
                async for chunk in self._stream_openai_compatible(
                    self.novita_provider, self.novita_keys, prompt, model, messages
                ):
                    yield chunk

            elif provider == "sambanova":
                if not self.sambanova_keys:
                    raise ValueError("No SambaNova API keys configured")
                async for chunk in self._stream_openai_compatible(
                    self.sambanova_provider, self.sambanova_keys, prompt, model, messages
                ):
                    yield chunk

            elif provider == "huggingface":
                if not self.hf_key:
                    raise ValueError("No HuggingFace API key configured")
                async for chunk in self._stream_huggingface(prompt, model, messages):
                    yield chunk

            elif provider == "local":
                async for chunk in self._stream_ollama(prompt, model, messages):
                    yield chunk

            else:
                raise ValueError(
                    f"Unknown provider: {provider}. "
                    f"Available: groq, openrouter, together, mistral, cerebras, siliconflow, "
                    f"google_ai_studio, cloudflare, alibaba_bailian, deepseek, xai, anthropic, "
                    f"cohere, ai21, novita, sambanova, openai, huggingface, local"
                )
        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Error streaming from {provider}: {e}", exc_info=e)
            raise RuntimeError(f"Failed to stream from {provider}: {str(e)}")

    async def _stream_groq(self, prompt: str, model: str, messages: Optional[List[Dict[str, str]]] = None) -> AsyncIterator[str]:
        """Stream response from Groq with key rotation and error handling."""
        if not self.groq_keys:
            raise RuntimeError("No Groq keys available")

        last_error = None
        for idx, key in enumerate(self.groq_keys):
            try:
                logger.debug(f"Attempting Groq with key index {idx}/{len(self.groq_keys)}")
                async for chunk in self.groq_provider.stream(
                    prompt=prompt, model=model, api_key=key, messages=messages,
                ):
                    yield chunk
                return
            except Exception as e:
                last_error = e
                logger.warning(f"Groq key {idx} failed: {type(e).__name__}: {str(e)}")
                if idx < len(self.groq_keys) - 1:
                    continue
                break

        raise RuntimeError(f"All Groq keys exhausted. Last error: {last_error}")

    async def _stream_openrouter(self, prompt: str, model: str, messages: Optional[List[Dict[str, str]]] = None) -> AsyncIterator[str]:
        """Stream response from OpenRouter with key rotation and error handling."""
        if not self.openrouter_keys:
            raise RuntimeError("No OpenRouter keys available")

        last_error = None
        for idx, key in enumerate(self.openrouter_keys):
            try:
                logger.debug(f"Attempting OpenRouter with key index {idx}/{len(self.openrouter_keys)}")
                async for chunk in self.openrouter_provider.stream(
                    prompt=prompt, model=model, api_key=key, messages=messages,
                ):
                    yield chunk
                return
            except Exception as e:
                last_error = e
                logger.warning(f"OpenRouter key {idx} failed: {type(e).__name__}: {str(e)}")
                if idx < len(self.openrouter_keys) - 1:
                    continue
                break

        raise RuntimeError(f"All OpenRouter keys exhausted. Last error: {last_error}")

    async def _stream_huggingface(self, prompt: str, model: str) -> AsyncIterator[str]:
        """Stream response from HuggingFace with proper error handling."""
        if not self.hf_key:
            raise RuntimeError("HuggingFace key not configured")

        try:
            logger.debug("Attempting HuggingFace...")
            async for chunk in self.hf_provider.stream(
                prompt=prompt,
                model=model,
                api_key=self.hf_key,
            ):
                yield chunk
        except Exception as e:
            logger.error(f"HuggingFace failed: {type(e).__name__}: {str(e)}", exc_info=e)
            raise RuntimeError(f"HuggingFace unavailable: {str(e)}")

    async def _stream_ollama(self, prompt: str, model: str) -> AsyncIterator[str]:
        """Stream response from local Ollama with proper error handling."""
        try:
            logger.debug(f"Attempting Ollama with model: {model}")
            async for chunk in self.ollama_provider.stream(
                prompt=prompt,
                model=model,
            ):
                yield chunk
        except Exception as e:
            logger.error(f"Ollama failed: {type(e).__name__}: {str(e)}", exc_info=e)
            raise RuntimeError(f"Ollama unavailable: {str(e)}")

    async def _stream_openai_compatible(
        self,
        provider: OpenAICompatibleProvider,
        keys: list[str],
        prompt: str,
        model: str,
        messages: Optional[List[Dict[str, str]]] = None,
    ) -> AsyncIterator[str]:
        last_error = None
        for idx, key in enumerate(keys):
            try:
                async for chunk in provider.stream(prompt=prompt, model=model, api_key=key, messages=messages):
                    yield chunk
                return
            except Exception as e:
                last_error = e
                logger.warning(f"{provider.name} key {idx} failed: {type(e).__name__}: {str(e)}")
                if idx < len(keys) - 1:
                    continue
                break
        raise RuntimeError(f"All {provider.name} keys exhausted. Last error: {last_error}")

    async def _stream_google(self, prompt: str, model: str, messages: Optional[List[Dict[str, str]]] = None) -> AsyncIterator[str]:
        last_error = None
        for idx, key in enumerate(self.google_keys):
            try:
                async for chunk in self.google_provider.stream(prompt=prompt, model=model, api_key=key, messages=messages):
                    yield chunk
                return
            except Exception as e:
                last_error = e
                logger.warning(f"google_ai_studio key {idx} failed: {type(e).__name__}: {str(e)}")
                if idx < len(self.google_keys) - 1:
                    continue
                break
        raise RuntimeError(f"All Google AI Studio keys exhausted. Last error: {last_error}")

    async def _stream_anthropic(self, prompt: str, model: str) -> AsyncIterator[str]:
        """Stream response from Anthropic (Claude) with key rotation and error handling."""
        if not self.anthropic_keys:
            raise RuntimeError("No Anthropic keys available")

        last_error = None
        for idx, key in enumerate(self.anthropic_keys):
            try:
                logger.debug(f"Attempting Anthropic with key index {idx}/{len(self.anthropic_keys)}")
                async for chunk in self.anthropic_provider.stream(
                    prompt=prompt,
                    model=model,
                    api_key=key,
                ):
                    yield chunk
                return
            except Exception as e:
                last_error = e
                logger.warning(f"Anthropic key {idx} failed: {type(e).__name__}: {str(e)}")
                if idx < len(self.anthropic_keys) - 1:
                    continue
                break

        raise RuntimeError(f"All Anthropic keys exhausted. Last error: {last_error}")
