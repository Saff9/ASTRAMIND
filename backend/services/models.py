# backend/services/models.py
"""
Intelligent model resolution — optimized for FREE API keys.
Providers: Groq (primary), Cerebras (fast), OpenRouter (smart/fallback).
Strategy: Best free models routed to best free endpoints.
Competitive with Claude/ChatGPT/Perplexity on zero budget.
"""

import asyncio
from typing import Dict, Any, Tuple, Optional
from core.model_provider import model_router, ModelProvider
import logging

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────────────
# MODEL CONFIGS
# Priority: free and fast first, premium fallback
# ──────────────────────────────────────────────────────────────────────────────
MODEL_CONFIGS: Dict[str, Dict] = {
    # FAST tier — sub-100ms responses, great for simple Q&A
    "fast": {
        "preferred_providers": [
            ModelProvider.GROQ,       # llama-3.1-8b-instant — 300 tok/s FREE
            ModelProvider.GOOGLE_AI_STUDIO, # gemini-2.0-flash — extremely fast and high quality FREE
            ModelProvider.CEREBRAS,   # llama3.1-8b — ultra-fast FREE
            ModelProvider.OPENROUTER, # free llama 8b
            ModelProvider.TOGETHER,
            ModelProvider.SILICONFLOW,
            ModelProvider.NOVITA,
            ModelProvider.SAMBANOVA,
            ModelProvider.DEEPSEEK,
            ModelProvider.LOCAL,
        ],
        "models": {
            ModelProvider.GROQ:       "llama-3.1-8b-instant",
            ModelProvider.GOOGLE_AI_STUDIO: "gemini-2.0-flash",
            ModelProvider.CEREBRAS:   "llama3.1-8b",
            ModelProvider.OPENROUTER: "meta-llama/llama-3.1-8b-instruct:free",
            ModelProvider.TOGETHER:   "meta-llama/Llama-3.1-8B-Instruct-Turbo",
            ModelProvider.MISTRAL:    "mistral-small-latest",
            ModelProvider.SILICONFLOW:"Qwen/Qwen2.5-7B-Instruct",
            ModelProvider.DEEPSEEK:   "deepseek-chat",
            ModelProvider.NOVITA:     "meta-llama/llama-3.1-8b-instruct",
            ModelProvider.SAMBANOVA:  "Meta-Llama-3.1-8B-Instruct",
            ModelProvider.XAI:        "grok-beta",
            ModelProvider.COHERE:     "command-r7b-12-2024",
            ModelProvider.LOCAL:      "llama3.1:8b",
        },
    },

    # BALANCED tier — 70B models, great quality, still fast
    "balanced": {
        "preferred_providers": [
            ModelProvider.GROQ,       # llama-3.3-70b — best free 70B
            ModelProvider.GOOGLE_AI_STUDIO, # gemini-1.5-flash
            ModelProvider.CEREBRAS,   # llama3.1-70b — very fast 70B
            ModelProvider.OPENROUTER, # free 70B options
            ModelProvider.TOGETHER,
            ModelProvider.SILICONFLOW,
            ModelProvider.SAMBANOVA,
            ModelProvider.DEEPSEEK,
            ModelProvider.LOCAL,
        ],
        "models": {
            ModelProvider.GROQ:        "llama-3.3-70b-versatile",
            ModelProvider.GOOGLE_AI_STUDIO: "gemini-1.5-flash",
            ModelProvider.CEREBRAS:    "llama-3.3-70b",
            ModelProvider.OPENROUTER:  "meta-llama/llama-3.3-70b-instruct:free",
            ModelProvider.TOGETHER:    "meta-llama/Llama-3.3-70B-Instruct-Turbo",
            ModelProvider.MISTRAL:     "mistral-medium-latest",
            ModelProvider.SILICONFLOW: "Qwen/Qwen2.5-72B-Instruct",
            ModelProvider.DEEPSEEK:    "deepseek-chat",
            ModelProvider.SAMBANOVA:   "Meta-Llama-3.3-70B-Instruct",
            ModelProvider.ALIBABA_BAILIAN: "qwen-max",
            ModelProvider.XAI:         "grok-beta",
            ModelProvider.COHERE:      "command-r-plus-08-2024",
            ModelProvider.LOCAL:       "llama3.1:70b",
        },
    },

    # SMART tier — best reasoning models available
    # Primary: DeepSeek R1 (free, reasoning model = closest to o1/Claude)
    # Fallback: Groq 70B (free), OpenRouter QwQ-32B (free reasoning)
    "smart": {
        "preferred_providers": [
            ModelProvider.GROQ,        # llama-3.3-70b — best free quality
            ModelProvider.OPENROUTER,  # deepseek/r1:free — reasoning model FREE
            ModelProvider.GOOGLE_AI_STUDIO, # gemini-1.5-pro — Google reasoning-level model
            ModelProvider.CEREBRAS,    # fast 70B
            ModelProvider.DEEPSEEK,    # deepseek-reasoner (R1)
            ModelProvider.TOGETHER,
            ModelProvider.SILICONFLOW, # DeepSeek R1 free
            ModelProvider.ANTHROPIC,   # claude if key available
            ModelProvider.OPENAI,      # gpt-4o if key available
            ModelProvider.SAMBANOVA,
            ModelProvider.LOCAL,
        ],
        "models": {
            ModelProvider.GROQ:        "llama-3.3-70b-versatile",
            ModelProvider.OPENROUTER:  "deepseek/deepseek-r1:free",    # FREE reasoning model!
            ModelProvider.GOOGLE_AI_STUDIO: "gemini-1.5-pro",
            ModelProvider.CEREBRAS:    "llama-3.3-70b",
            ModelProvider.DEEPSEEK:    "deepseek-reasoner",             # DeepSeek R1 (o1-level)
            ModelProvider.TOGETHER:    "Qwen/Qwen2.5-72B-Instruct-Turbo",
            ModelProvider.SILICONFLOW: "deepseek-ai/DeepSeek-R1",      # R1 via SiliconFlow
            ModelProvider.ANTHROPIC:   "claude-3-5-sonnet-20241022",    # Best if key available
            ModelProvider.OPENAI:      "gpt-4o",
            ModelProvider.MISTRAL:     "mistral-large-latest",
            ModelProvider.SAMBANOVA:   "Meta-Llama-3.1-405B-Instruct",
            ModelProvider.XAI:         "grok-2-1212",
            ModelProvider.NOVITA:      "deepseek-ai/DeepSeek-R1",
            ModelProvider.LOCAL:       "mistral",
        },
    },
}


# Mapping for specific model names → tier
MODEL_MAPPING: Dict[str, str] = {
    # Custom frontend model placeholders
    "claude 4.8":              "smart",
    "claude-4.8":              "smart",
    "kimi":                    "smart",
    "meta":                    "balanced",
    "grok coder":              "smart",
    "grok-coder":              "smart",
    "qwen":                    "balanced",
    "deepseek nlu":            "balanced",
    "deepseek-nlu":            "balanced",
    "qgpt":                    "smart",

    # Smart / Reasoning tier
    "gpt-4.5":                 "smart",
    "claude-3-7-sonnet":       "smart",
    "gpt-4o":                  "smart",
    "gpt-4":                   "smart",
    "gpt-4-turbo":             "smart",
    "o1":                      "smart",
    "o1-mini":                 "smart",
    "o3-mini":                 "smart",
    "claude-3-5-sonnet":       "smart",
    "claude-3-opus":           "smart",
    "claude-sonnet":           "smart",
    "claude-opus":             "smart",
    "deepseek-r1":             "smart",
    "deepseek-reasoner":       "smart",
    "deepseek/deepseek-r1":    "smart",
    "qwq-32b":                 "smart",
    "mistral-large":           "smart",
    "gemini-1.5-pro":          "smart",
    "gemini-pro":              "smart",
    "qwen-max":                "smart",
    "grok-2":                  "smart",

    # Balanced tier
    "llama-3.3-70b":           "balanced",
    "llama-3.1-70b":           "balanced",
    "llama-3-70b":             "balanced",
    "mistral-medium":          "balanced",
    "command-r-plus":          "balanced",
    "gemini-1.5-flash":        "balanced",
    "qwen-2.5-72b":            "balanced",

    # Fast tier
    "gpt-4o-mini":             "fast",
    "claude-3-5-haiku":        "fast",
    "claude-haiku":            "fast",
    "llama-3.1-8b":            "fast",
    "llama-3.1-8b-instant":    "fast",
    "llama-3-8b":              "fast",
    "mistral-small":           "fast",
    "gemini-2.0-flash":        "fast",
    "gemini-flash":            "fast",
    "deepseek-chat":           "fast",
    "phi-3-mini":              "fast",
    "qwen-2.5-7b":             "fast",
}


async def resolve_model(alias: str) -> Tuple[str, str]:
    """
    Resolve model alias or specific model name to best available provider + model.

    Priority:
    1. If alias is a tier (fast/balanced/smart) → use that tier config
    2. If alias is a known model name → map to tier → use tier config
    3. Unknown → default to 'balanced' (safe fallback)

    Returns:
        Tuple of (provider_name: str, model_name: str)
    """
    tier = alias.lower().strip()

    # Map specific model names to tiers
    if tier not in MODEL_CONFIGS:
        mapped = MODEL_MAPPING.get(tier)
        if mapped:
            logger.debug(f"Model '{alias}' → tier '{mapped}'")
            tier = mapped
        else:
            logger.warning(f"Unknown model '{alias}', defaulting to 'balanced'")
            tier = "balanced"

    config = MODEL_CONFIGS[tier]

    # Get best available provider
    best_provider = await model_router.get_best_provider(tier)
    model_name = config["models"].get(best_provider)

    if not model_name:
        # Try other healthy providers
        for provider in config["preferred_providers"]:
            if provider == best_provider:
                continue
            is_healthy = await model_router._check_provider_health(provider)
            if is_healthy:
                candidate = config["models"].get(provider)
                if candidate:
                    best_provider = provider
                    model_name = candidate
                    logger.info(f"Fallback: {provider.value} for {alias}")
                    break

    if not model_name:
        # Emergency fallback — use first model in config
        for provider, model in config["models"].items():
            if model:
                best_provider = provider
                model_name = model
                logger.warning(f"Emergency fallback: {provider.value}/{model} for {alias}")
                break

    if not model_name:
        raise RuntimeError(
            f"No available model for '{alias}'. Configure at least one AI provider API key."
        )

    provider_name = best_provider.value
    logger.info(f"Resolved '{alias}' → {provider_name}/{model_name}")
    return provider_name, model_name


def get_model_config(alias: str) -> Dict[str, Any]:
    """Get full model config for a tier. Used by status/discover endpoints."""
    config = MODEL_CONFIGS.get(alias)
    if not config:
        raise KeyError(f"Invalid model tier: {alias}. Valid: fast, balanced, smart")
    return {
        "id": alias,
        "available_providers": [p.value for p in config["preferred_providers"]],
        "models": {p.value: m for p, m in config["models"].items()},
    }


def get_model_for_provider(alias: str, provider_name: str) -> Optional[str]:
    """Get the specific model string for a given provider within a tier."""
    tier = alias.lower().strip()
    if tier not in MODEL_CONFIGS:
        tier = MODEL_MAPPING.get(tier, "balanced")
    
    config = MODEL_CONFIGS.get(tier)
    if not config:
        return None
        
    for p_enum, m_str in config["models"].items():
        if p_enum.value == provider_name:
            return m_str
            
    return None
