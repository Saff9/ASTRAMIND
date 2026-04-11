# backend/app/services/ai_router.py
"""
Central AI Provider Router
Handles routing requests to multiple AI providers with fallback support.
"""

import random
import logging
from typing import AsyncIterator, List, Optional
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

logger = logging.getLogger(__name__)


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

    async def stream(
        self,
        prompt: str,
        model: str,
        provider: str,
    ) -> AsyncIterator[str]:
        """
        Stream AI response from specified provider with comprehensive error handling.

        Args:
            prompt: User prompt
            model: Model name
            provider: Provider name (groq, openrouter, huggingface, local)

        Yields:
            Response chunks from AI provider

        Raises:
            ValueError: If provider not found or no keys available
            RuntimeError: If all providers fail
        """
        # Validate inputs
        if not prompt or not isinstance(prompt, str):
            raise ValueError("Prompt must be a non-empty string")
        if not model:
            raise ValueError("Model name is required")

        try:
            if provider == "groq":
                if not self.groq_keys:
                    raise ValueError("No Groq API keys configured")
                async for chunk in self._stream_groq(prompt, model):
                    yield chunk

            elif provider == "openrouter":
                if not self.openrouter_keys:
                    raise ValueError("No OpenRouter API keys configured")
                async for chunk in self._stream_openrouter(prompt, model):
                    yield chunk

            elif provider == "together":
                if not self.together_keys:
                    raise ValueError("No Together API keys configured")
                async for chunk in self._stream_openai_compatible(self.together_provider, self.together_keys, prompt, model):
                    yield chunk

            elif provider == "mistral":
                if not self.mistral_keys:
                    raise ValueError("No Mistral API keys configured")
                async for chunk in self._stream_openai_compatible(self.mistral_provider, self.mistral_keys, prompt, model):
                    yield chunk

            elif provider == "cerebras":
                if not self.cerebras_keys:
                    raise ValueError("No Cerebras API keys configured")
                async for chunk in self._stream_openai_compatible(self.cerebras_provider, self.cerebras_keys, prompt, model):
                    yield chunk

            elif provider == "siliconflow":
                if not self.siliconflow_keys:
                    raise ValueError("No SiliconFlow API keys configured")
                async for chunk in self._stream_openai_compatible(self.siliconflow_provider, self.siliconflow_keys, prompt, model):
                    yield chunk

            elif provider == "openai":
                if not self.openai_key:
                    raise ValueError("No OpenAI API key configured")
                async for chunk in self.openai_provider.stream(prompt=prompt, model=model, api_key=self.openai_key):
                    yield chunk

            elif provider == "google_ai_studio":
                if not self.google_keys:
                    raise ValueError("No Google AI Studio API keys configured")
                async for chunk in self._stream_google(prompt, model):
                    yield chunk

            elif provider == "cloudflare":
                if not self.cloudflare_provider:
                    raise ValueError("Cloudflare Workers AI not configured")
                async for chunk in self.cloudflare_provider.stream(prompt=prompt, model=model, api_key=""):
                    yield chunk

            elif provider == "alibaba_bailian":
                if not self.alibaba_bailian_keys:
                    raise ValueError("No Alibaba Bailian API keys configured")
                async for chunk in self._stream_openai_compatible(
                    self.alibaba_bailian_provider, self.alibaba_bailian_keys, prompt, model
                ):
                    yield chunk

            elif provider == "deepseek":
                if not self.deepseek_keys:
                    raise ValueError("No DeepSeek API keys configured")
                async for chunk in self._stream_openai_compatible(
                    self.deepseek_provider, self.deepseek_keys, prompt, model
                ):
                    yield chunk

            elif provider == "xai":
                if not self.xai_keys:
                    raise ValueError("No xAI API keys configured")
                async for chunk in self._stream_openai_compatible(
                    self.xai_provider, self.xai_keys, prompt, model
                ):
                    yield chunk

            elif provider == "anthropic":
                if not self.anthropic_keys:
                    raise ValueError("No Anthropic API keys configured")
                async for chunk in self._stream_anthropic(prompt, model):
                    yield chunk

            elif provider == "cohere":
                if not self.cohere_keys:
                    raise ValueError("No Cohere API keys configured")
                async for chunk in self._stream_openai_compatible(
                    self.cohere_provider, self.cohere_keys, prompt, model
                ):
                    yield chunk

            elif provider == "ai21":
                if not self.ai21_keys:
                    raise ValueError("No AI21 API keys configured")
                async for chunk in self._stream_openai_compatible(
                    self.ai21_provider, self.ai21_keys, prompt, model
                ):
                    yield chunk

            elif provider == "novita":
                if not self.novita_keys:
                    raise ValueError("No Novita AI API keys configured")
                async for chunk in self._stream_openai_compatible(
                    self.novita_provider, self.novita_keys, prompt, model
                ):
                    yield chunk

            elif provider == "sambanova":
                if not self.sambanova_keys:
                    raise ValueError("No SambaNova API keys configured")
                async for chunk in self._stream_openai_compatible(
                    self.sambanova_provider, self.sambanova_keys, prompt, model
                ):
                    yield chunk

            elif provider == "huggingface":
                if not self.hf_key:
                    raise ValueError("No HuggingFace API key configured")
                async for chunk in self._stream_huggingface(prompt, model):
                    yield chunk

            elif provider == "local":
                # Local Ollama provider - no API key needed
                async for chunk in self._stream_ollama(prompt, model):
                    yield chunk

            else:
                raise ValueError(
                    f"Unknown provider: {provider}. "
                    f"Available providers: groq, openrouter, together, mistral, cerebras, siliconflow, "
                    f"google_ai_studio, cloudflare, alibaba_bailian, deepseek, xai, anthropic, cohere, ai21, "
                    f"novita, sambanova, openai, huggingface, local"
                )
        except ValueError:
            # Re-raise validation errors
            raise
        except Exception as e:
            logger.error(f"Error streaming from {provider}: {e}", exc_info=e)
            raise RuntimeError(f"Failed to stream from {provider}: {str(e)}")

    async def _stream_groq(self, prompt: str, model: str) -> AsyncIterator[str]:
        """Stream response from Groq with key rotation and error handling."""
        if not self.groq_keys:
            raise RuntimeError("No Groq keys available")

        last_error = None
        # Try each key
        for idx, key in enumerate(self.groq_keys):
            try:
                logger.debug(f"Attempting Groq with key index {idx}/{len(self.groq_keys)}")
                async for chunk in self.groq_provider.stream(
                    prompt=prompt,
                    model=model,
                    api_key=key,
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

    async def _stream_openrouter(self, prompt: str, model: str) -> AsyncIterator[str]:
        """Stream response from OpenRouter with key rotation and error handling."""
        if not self.openrouter_keys:
            raise RuntimeError("No OpenRouter keys available")

        last_error = None
        # Try each key
        for idx, key in enumerate(self.openrouter_keys):
            try:
                logger.debug(f"Attempting OpenRouter with key index {idx}/{len(self.openrouter_keys)}")
                async for chunk in self.openrouter_provider.stream(
                    prompt=prompt,
                    model=model,
                    api_key=key,
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
    ) -> AsyncIterator[str]:
        last_error = None
        for idx, key in enumerate(keys):
            try:
                async for chunk in provider.stream(prompt=prompt, model=model, api_key=key):
                    yield chunk
                return
            except Exception as e:
                last_error = e
                logger.warning(f"{provider.name} key {idx} failed: {type(e).__name__}: {str(e)}")
                if idx < len(keys) - 1:
                    continue
                break
        raise RuntimeError(f"All {provider.name} keys exhausted. Last error: {last_error}")

    async def _stream_google(self, prompt: str, model: str) -> AsyncIterator[str]:
        last_error = None
        for idx, key in enumerate(self.google_keys):
            try:
                async for chunk in self.google_provider.stream(prompt=prompt, model=model, api_key=key):
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
