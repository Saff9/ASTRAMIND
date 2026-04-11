import pytest
import httpx


@pytest.mark.anyio
async def test_ai_router_initialization():
    """Test AI Router initializes with correct providers."""
    from services.ai_router import AIRouter
    from core.config import settings
    
    router = AIRouter()
    
    # Verify all provider keys are initialized as lists
    assert isinstance(router.groq_keys, list)
    assert isinstance(router.openrouter_keys, list)
    assert isinstance(router.deepseek_keys, list)
    assert isinstance(router.xai_keys, list)
    assert isinstance(router.anthropic_keys, list)


@pytest.mark.anyio
async def test_ai_router_with_keys():
    """Test AI Router accepts API keys."""
    from services.ai_router import AIRouter
    
    router = AIRouter(
        groq_keys=["test_key_1", "test_key_2"],
        deepseek_keys=["deepseek_key"],
    )
    
    assert len(router.groq_keys) == 2
    assert len(router.deepseek_keys) == 1


@pytest.mark.anyio
async def test_stream_without_provider_raises():
    """Test streaming without valid provider raises ValueError."""
    from services.ai_router import AIRouter
    
    router = AIRouter()
    
    # The stream method returns an async generator, so we need to consume it
    # or check the validation differently - the ValueError happens during iteration
    gen = router.stream(prompt="test", model="test", provider="nonexistent")
    
    # Try to get first item - should raise ValueError
    with pytest.raises(ValueError) as exc_info:
        async for _ in gen:
            break
    
    assert "Unknown provider" in str(exc_info.value)


@pytest.mark.anyio
async def test_stream_without_keys_raises():
    """Test streaming without API keys raises appropriate error."""
    from services.ai_router import AIRouter
    
    router = AIRouter()
    
    gen = router.stream(prompt="test", model="llama-3.1-8b-instant", provider="groq")
    
    with pytest.raises(ValueError) as exc_info:
        async for _ in gen:
            break
    
    assert "No Groq API keys" in str(exc_info.value)


@pytest.mark.anyio
async def test_stream_empty_prompt_raises():
    """Test streaming with empty prompt raises ValueError."""
    from services.ai_router import AIRouter
    
    router = AIRouter(groq_keys=["test_key"])
    
    gen = router.stream(prompt="", model="llama-3.1-8b-instant", provider="groq")
    
    with pytest.raises(ValueError):
        async for _ in gen:
            break


@pytest.mark.anyio
async def test_stream_none_prompt_raises():
    """Test streaming with None prompt raises ValueError."""
    from services.ai_router import AIRouter
    
    router = AIRouter(groq_keys=["test_key"])
    
    gen = router.stream(prompt=None, model="llama-3.1-8b-instant", provider="groq")
    
    with pytest.raises(ValueError):
        async for _ in gen:
            break


@pytest.mark.anyio
async def test_openai_compatible_provider_validation():
    """Test OpenAI compatible provider validates inputs."""
    from app.providers.openai_compatible import OpenAICompatibleProvider
    
    provider = OpenAICompatibleProvider(
        name="test",
        base_url="https://api.test.com/v1"
    )
    
    # Test missing API key - using async generator consumption
    gen = provider.stream(prompt="test", model="model", api_key="")
    
    with pytest.raises(Exception):
        async for _ in gen:
            break


@pytest.mark.anyio
async def test_model_resolution_with_fallback():
    """Test model resolution has proper fallback logic."""
    from services.models import MODEL_CONFIGS
    
    # Check all model configs have providers and models
    for model_type, config in MODEL_CONFIGS.items():
        assert "preferred_providers" in config
        assert "models" in config
        assert len(config["preferred_providers"]) > 0
        assert len(config["models"]) > 0


def test_model_config_structure():
    """Test model configuration has required fields."""
    from services.models import MODEL_CONFIGS
    
    for model_type in ["fast", "balanced", "smart"]:
        config = MODEL_CONFIGS[model_type]
        
        # Check required keys
        assert "preferred_providers" in config
        assert "models" in config
        
        # Check providers have models
        for provider in config["preferred_providers"]:
            assert provider in config["models"], f"Provider {provider} missing in models"