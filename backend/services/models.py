# backend/services/models.py

"""
Intelligent model resolution with auto-detection and fallback.
Users get optimal provider selection without seeing complexity.
"""

import asyncio
from typing import Dict, Any, Tuple
from core.model_provider import model_router, ModelProvider
import logging

logger = logging.getLogger(__name__)

# Base model configurations (fallback when auto-detection fails)
MODEL_CONFIGS = {
    "fast": {
        "preferred_providers": [
            ModelProvider.GROQ,
            ModelProvider.OPENROUTER,
            ModelProvider.TOGETHER,
            ModelProvider.MISTRAL,
            ModelProvider.CEREBRAS,
            ModelProvider.SILICONFLOW,
            ModelProvider.ALIBABA_BAILIAN,
            ModelProvider.DEEPSEEK,
            ModelProvider.XAI,
            ModelProvider.COHERE,
            ModelProvider.AI21,
            ModelProvider.NOVITA,
            ModelProvider.SAMBANOVA,
        ],
        "models": {
            ModelProvider.GROQ: "llama-3.1-8b-instant",
            ModelProvider.OPENROUTER: "meta-llama/llama-3.1-8b-instruct",
            ModelProvider.TOGETHER: "meta-llama/Llama-3.1-8B-Instruct-Turbo",
            ModelProvider.MISTRAL: "mistral-small-latest",
            ModelProvider.CEREBRAS: "llama3.1-8b",
            ModelProvider.SILICONFLOW: "Qwen/Qwen2.5-7B-Instruct",
            ModelProvider.ALIBABA_BAILIAN: "qwen-plus",
            ModelProvider.DEEPSEEK: "deepseek-chat",
            ModelProvider.XAI: "grok-beta",
            ModelProvider.COHERE: "command-r7b-12-2024",
            ModelProvider.AI21: "j2-light",
            ModelProvider.NOVITA: "Qwen/Qwen2.5-7B-Instruct",
            ModelProvider.SAMBANOVA: "Meta-Llama-3.1-8B-Instruct",
            ModelProvider.LOCAL: "llama3.1:8b",  # Ollama format
        }
    },
    "balanced": {
        "preferred_providers": [
            ModelProvider.GROQ,
            ModelProvider.OPENROUTER,
            ModelProvider.TOGETHER,
            ModelProvider.MISTRAL,
            ModelProvider.CEREBRAS,
            ModelProvider.SILICONFLOW,
            ModelProvider.ALIBABA_BAILIAN,
            ModelProvider.DEEPSEEK,
            ModelProvider.XAI,
            ModelProvider.COHERE,
            ModelProvider.AI21,
            ModelProvider.NOVITA,
            ModelProvider.SAMBANOVA,
        ],
        "models": {
            ModelProvider.GROQ: "llama-3.1-70b-versatile",
            ModelProvider.OPENROUTER: "anthropic/claude-3-haiku",
            ModelProvider.TOGETHER: "meta-llama/Llama-3.1-70B-Instruct-Turbo",
            ModelProvider.MISTRAL: "mistral-medium-latest",
            ModelProvider.CEREBRAS: "llama3.1-70b",
            ModelProvider.SILICONFLOW: "Qwen/Qwen2.5-72B-Instruct",
            ModelProvider.ALIBABA_BAILIAN: "qwen-max",
            ModelProvider.DEEPSEEK: "deepseek-chat",
            ModelProvider.XAI: "grok-beta",
            ModelProvider.COHERE: "command-r7b-12-2024",
            ModelProvider.AI21: "j2-mid",
            ModelProvider.NOVITA: "Qwen/Qwen2.5-72B-Instruct",
            ModelProvider.SAMBANOVA: "Meta-Llama-3.1-70B-Instruct",
            ModelProvider.LOCAL: "llama3.1:70b",  # Ollama format
        }
    },
    "smart": {
        "preferred_providers": [
            ModelProvider.OPENROUTER,
            ModelProvider.OPENAI,
            ModelProvider.MISTRAL,
            ModelProvider.TOGETHER,
            ModelProvider.GROQ,
            ModelProvider.CEREBRAS,
            ModelProvider.SILICONFLOW,
            ModelProvider.ALIBABA_BAILIAN,
            ModelProvider.DEEPSEEK,
            ModelProvider.XAI,
            ModelProvider.ANTHROPIC,
            ModelProvider.COHERE,
            ModelProvider.AI21,
            ModelProvider.NOVITA,
            ModelProvider.SAMBANOVA,
        ],
        "models": {
            ModelProvider.OPENROUTER: "openai/gpt-4o-mini",
            ModelProvider.GROQ: "mixtral-8x7b-32768",
            ModelProvider.OPENAI: "gpt-4o-mini",
            ModelProvider.TOGETHER: "Qwen/Qwen2.5-72B-Instruct-Turbo",
            ModelProvider.MISTRAL: "mistral-large-latest",
            ModelProvider.CEREBRAS: "llama3.1-70b",
            ModelProvider.SILICONFLOW: "deepseek-ai/DeepSeek-R1",
            ModelProvider.ALIBABA_BAILIAN: "qwen-max",
            ModelProvider.DEEPSEEK: "deepseek-chat",
            ModelProvider.XAI: "grok-2-1212",
            ModelProvider.ANTHROPIC: "claude-3-5-sonnet-20241022",
            ModelProvider.COHERE: "command-r7b-12-2024",
            ModelProvider.AI21: "j2-ultra",
            ModelProvider.NOVITA: "deepseek-ai/DeepSeek-R1",
            ModelProvider.SAMBANOVA: "Meta-Llama-3.1-405B-Instruct",
            ModelProvider.LOCAL: "mistral",  # Ollama format
        }
    },
}


async def resolve_model(alias: str) -> Tuple[str, str]:

    """
    Intelligently resolves model alias to best available provider and model.
    Uses auto-detection for local models, falls back to healthy remote providers.

    Args:
        alias: Model alias (fast, balanced, smart)

    Returns:
        Tuple of (provider_name, model_name)

    Raises:
        KeyError: If alias is invalid
    """
    config = MODEL_CONFIGS.get(alias)
    if not config:
        raise KeyError(f"Invalid model selection: {alias}. Available: fast, balanced, smart")

    # Get the best available provider for this model class
    best_provider = await model_router.get_best_provider(alias)

    # Get the model name for this provider
    model_name = config["models"].get(best_provider)

    if not model_name:
        # Fallback to first available model if preferred provider doesn't have this model
        for provider, model in config["models"].items():
            if provider != best_provider:  # Skip the already tried provider
                # Check if this provider is healthy
                is_healthy = await model_router._check_provider_health(provider)
                if is_healthy:
                    best_provider = provider
                    model_name = model
                    logger.warning(
                        f"Falling back to {best_provider.value} for {alias} "
                        f"(model not available on primary provider)"
                    )
                    break

    if not model_name:
        # Ultimate fallback - use any available model
        for provider, model in config["models"].items():
            if model:
                best_provider = provider
                model_name = model
                logger.warning(f"Emergency fallback to {best_provider.value} for {alias}")
                break

    if not model_name:
        # All fallbacks exhausted
        raise RuntimeError(
            f"No available model provider for alias: {alias}. "
            f"Please configure at least one AI provider."
        )

    provider_name = best_provider.value
    logger.info(f"Resolved {alias} -> {provider_name}/{model_name}")

    return provider_name, model_name


def get_model_config(alias: str) -> Dict[str, Any]:
    """
    Get full configuration for a model alias.
    Used by frontend to show available models.
    """
    config = MODEL_CONFIGS.get(alias)
    if not config:
        raise KeyError(f"Invalid model selection: {alias}")

    return {
        "id": alias,
        "available_providers": [p.value for p in config["preferred_providers"]],
        "models": {p.value: m for p, m in config["models"].items()},
    }
