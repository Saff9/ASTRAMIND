# backend/app/core/config.py
"""
Production-grade configuration with validation and security defaults.
FIXED: All list fields now properly parse from environment variables
"""

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    All critical values are required and validated.
    """

    # ===== DATABASE =====
    DATABASE_URL: Optional[str] = Field(
        default=None,
        description="PostgreSQL connection string (optional for local development)",
    )

    # ===== SECURITY =====
    JWT_SECRET: Optional[str] = Field(
        default=None,
        description="JWT signing secret (min 32 chars, base64 preferred)",
    )
    JWT_ALGORITHM: str = Field(default="HS256")
    JWT_EXPIRATION_HOURS: int = Field(default=24)

    # ===== API KEYS (Multi-provider support) =====
    # Store as strings, parse in validators
    GROQ_API_KEYS: str = Field(
        default="",
        description="Comma-separated Groq API keys"
    )
    OPENROUTER_API_KEYS: str = Field(
        default="",
        description="Comma-separated OpenRouter API keys"
    )
    TOGETHER_API_KEYS: str = Field(
        default="",
        description="Comma-separated Together AI API keys",
    )
    MISTRAL_API_KEYS: str = Field(
        default="",
        description="Comma-separated Mistral AI API keys",
    )
    CEREBRAS_API_KEYS: str = Field(
        default="",
        description="Comma-separated Cerebras API keys",
    )
    SILICONFLOW_API_KEYS: str = Field(
        default="",
        description="Comma-separated SiliconFlow (硅基流动) API keys",
    )
    GOOGLE_AI_STUDIO_API_KEYS: str = Field(
        default="",
        description="Comma-separated Google AI Studio (Gemini) API keys",
    )
    ALIBABA_BAILIAN_API_KEYS: str = Field(
        default="",
        description="Comma-separated Alibaba Bailian (阿里云百炼) API keys",
    )

    # ===== ADDITIONAL FREE/PROVIDER API KEYS =====
    DEEPSEEK_API_KEYS: str = Field(
        default="",
        description="Comma-separated DeepSeek API keys",
    )
    XAI_API_KEYS: str = Field(
        default="",
        description="Comma-separated xAI (Grok) API keys",
    )
    ANTHROPIC_API_KEYS: str = Field(
        default="",
        description="Comma-separated Anthropic (Claude) API keys",
    )
    COHERE_API_KEYS: str = Field(
        default="",
        description="Comma-separated Cohere API keys",
    )
    AI21_API_KEYS: str = Field(
        default="",
        description="Comma-separated AI21 API keys",
    )
    NOVITA_API_KEYS: str = Field(
        default="",
        description="Comma-separated Novita AI API keys",
    )
    SAMBANOVA_API_KEYS: str = Field(
        default="",
        description="Comma-separated SambaNova API keys",
    )

    # Cloudflare Workers AI (token + account id)
    CLOUDFLARE_ACCOUNT_ID: Optional[str] = Field(
        default=None,
        description="Cloudflare account id for Workers AI",
    )
    CLOUDFLARE_API_TOKEN: Optional[str] = Field(
        default=None,
        description="Cloudflare API token for Workers AI",
    )

    # Optional base URLs for OpenAI-compatible providers (override defaults if needed)
    TOGETHER_BASE_URL: str = Field(default="https://api.together.xyz/v1")
    MISTRAL_BASE_URL: str = Field(default="https://api.mistral.ai/v1")
    CEREBRAS_BASE_URL: str = Field(default="https://api.cerebras.ai/v1")
    SILICONFLOW_BASE_URL: str = Field(default="https://api.siliconflow.cn/v1")
    OPENROUTER_BASE_URL: str = Field(default="https://openrouter.ai/api/v1")
    GROQ_BASE_URL: str = Field(default="https://api.groq.com/openai/v1")
    OPENAI_BASE_URL: str = Field(default="https://api.openai.com/v1")
    # Alibaba Bailian compatible-mode endpoint (often DashScope compatible mode)
    ALIBABA_BAILIAN_BASE_URL: str = Field(default="https://dashscope.aliyuncs.com/compatible-mode/v1")
    
    # ===== ADDITIONAL PROVIDER BASE URLs =====
    DEEPSEEK_BASE_URL: str = Field(default="https://api.deepseek.com/v1")
    XAI_BASE_URL: str = Field(default="https://api.x.ai/v1")
    ANTHROPIC_BASE_URL: str = Field(default="https://api.anthropic.com/v1")
    COHERE_BASE_URL: str = Field(default="https://api.cohere.ai/v1")
    AI21_BASE_URL: str = Field(default="https://api.ai21.com/v1")
    NOVITA_BASE_URL: str = Field(default="https://api.novita.ai/v1")
    SAMBANOVA_BASE_URL: str = Field(default="https://api.sambanova.ai/v1")
    
    HUGGINGFACE_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = Field(
        default=None,
        description="OpenAI API key for fallback"
    )
    OLLAMA_URL: Optional[str] = Field(
        default="http://localhost:11434",
        description="Ollama server URL for local AI models"
    )

    # ===== ADMIN & SECURITY =====
    ADMIN_EMAILS: str = Field(
        default="",
        description="Comma-separated admin emails",
    )

    # ===== CORS =====
    ALLOWED_ORIGINS: str = Field(
        default="http://localhost:3000",
        description="Comma-separated allowed origins",
    )

    # ===== RATE LIMITING =====
    RATE_LIMIT_PER_MINUTE: int = Field(default=60)
    RATE_LIMIT_WINDOW_SECONDS: int = Field(default=60)
    USER_DAILY_QUOTA: int = Field(
        default=50,
        description="Default daily request quota per user"
    )
    ADMIN_DAILY_QUOTA: int = Field(
        default=500,
        description="Daily request quota for admin users"
    )
    PREMIUM_DAILY_QUOTA: int = Field(
        default=200,
        description="Daily request quota for premium users"
    )
    ENABLE_QUOTA_TIERS: bool = Field(
        default=True,
        description="Enable quota tiers based on user role"
    )

    # ===== DATABASE POOLING =====
    DATABASE_POOL_SIZE: int = Field(default=20)
    DATABASE_POOL_MAX_OVERFLOW: int = Field(default=40)
    DATABASE_POOL_RECYCLE_SECONDS: int = Field(default=3600)

    # ===== REQUEST LIMITS =====
    MAX_REQUEST_SIZE_BYTES: int = Field(default=50_000)
    REQUEST_TIMEOUT_SECONDS: int = Field(default=30)

    # ===== OUTBOUND HTTP (provider calls) =====
    OUTBOUND_HTTP_MAX_CONNECTIONS: int = Field(default=2000)
    OUTBOUND_HTTP_MAX_KEEPALIVE: int = Field(default=500)
    OUTBOUND_HTTP_CONNECT_TIMEOUT_SECONDS: float = Field(default=3.0)
    OUTBOUND_HTTP_READ_TIMEOUT_SECONDS: float = Field(default=30.0)

    # ===== ENVIRONMENT =====
    ENV: str = Field(default="development")
    LOG_LEVEL: str = Field(default="INFO")

    # ===== MODEL CONFIGURATION =====
    GROQ_FAST_MODEL: str = Field(default="llama-3.1-8b-instant")
    GROQ_BALANCED_MODEL: str = Field(default="llama-3.1-70b")
    OPENROUTER_SMART_MODEL: str = Field(default="openai/gpt-4o-mini")
    OPENROUTER_BALANCED_MODEL: str = Field(default="openai/gpt-4-turbo-preview")

    # ===== ENDPOINTS =====
    APP_URL: str = Field(default="https://ASTRAMINDai.ai")
    HF_MODEL_ENDPOINT: str = Field(default="https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium")

    # ===== FEATURE FLAGS =====
    ENABLE_WEB_SEARCH: bool = Field(default=True)
    ENABLE_IMAGE_GENERATION: bool = Field(default=False)

    # ===== MONITORING / NOISE CONTROL =====
    # When false, alert logs are suppressed (still tracked internally).
    ENABLE_ALERT_LOGS: bool = Field(default=True)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # ===== VALIDATORS =====

    @field_validator("JWT_SECRET")
    @classmethod
    def validate_jwt_secret(cls, v: Optional[str]) -> Optional[str]:
        """Ensure JWT secret is strong enough when provided."""
        if v is None:
            return v
        if len(v) < 32:
            raise ValueError("JWT_SECRET must be at least 32 characters")
        return v

    # ===== COMPUTED PROPERTIES =====
    # These parse the string fields into lists at runtime

    @staticmethod
    def _parse_csv(value: str, *, placeholder_prefixes: tuple[str, ...] = ()) -> list[str]:
        if not value:
            return []
        keys = [k.strip() for k in value.split(",") if k.strip()]
        if not placeholder_prefixes:
            return keys
        return [k for k in keys if k and not any(k.startswith(p) for p in placeholder_prefixes)]

    @property
    def groq_api_keys(self) -> list[str]:
        """Parse GROQ_API_KEYS into list, filtering placeholders."""
        return self._parse_csv(self.GROQ_API_KEYS, placeholder_prefixes=("GROQ_KEY",))

    @property
    def openrouter_api_keys(self) -> list[str]:
        """Parse OPENROUTER_API_KEYS into list, filtering placeholders."""
        return self._parse_csv(self.OPENROUTER_API_KEYS, placeholder_prefixes=("OPENROUTER_KEY",))

    @property
    def together_api_keys(self) -> list[str]:
        """Parse TOGETHER_API_KEYS into list."""
        return self._parse_csv(self.TOGETHER_API_KEYS, placeholder_prefixes=("TOGETHER_KEY",))

    @property
    def mistral_api_keys(self) -> list[str]:
        """Parse MISTRAL_API_KEYS into list."""
        return self._parse_csv(self.MISTRAL_API_KEYS, placeholder_prefixes=("MISTRAL_KEY",))

    @property
    def cerebras_api_keys(self) -> list[str]:
        """Parse CEREBRAS_API_KEYS into list."""
        return self._parse_csv(self.CEREBRAS_API_KEYS, placeholder_prefixes=("CEREBRAS_KEY",))

    @property
    def siliconflow_api_keys(self) -> list[str]:
        """Parse SILICONFLOW_API_KEYS into list."""
        return self._parse_csv(self.SILICONFLOW_API_KEYS, placeholder_prefixes=("SILICONFLOW_KEY",))

    @property
    def google_ai_studio_api_keys(self) -> list[str]:
        """Parse GOOGLE_AI_STUDIO_API_KEYS into list."""
        return self._parse_csv(self.GOOGLE_AI_STUDIO_API_KEYS, placeholder_prefixes=("GOOGLE_KEY", "GEMINI_KEY"))

    @property
    def alibaba_bailian_api_keys(self) -> list[str]:
        """Parse ALIBABA_BAILIAN_API_KEYS into list."""
        return self._parse_csv(self.ALIBABA_BAILIAN_API_KEYS, placeholder_prefixes=("BAILIAN_KEY", "DASHSCOPE_KEY"))

    @property
    def deepseek_api_keys(self) -> list[str]:
        """Parse DEEPSEEK_API_KEYS into list."""
        return self._parse_csv(self.DEEPSEEK_API_KEYS, placeholder_prefixes=("DEEPSEEK_KEY",))

    @property
    def xai_api_keys(self) -> list[str]:
        """Parse XAI_API_KEYS into list."""
        return self._parse_csv(self.XAI_API_KEYS, placeholder_prefixes=("XAI_KEY",))

    @property
    def anthropic_api_keys(self) -> list[str]:
        """Parse ANTHROPIC_API_KEYS into list."""
        return self._parse_csv(self.ANTHROPIC_API_KEYS, placeholder_prefixes=("ANTHROPIC_KEY",))

    @property
    def cohere_api_keys(self) -> list[str]:
        """Parse COHERE_API_KEYS into list."""
        return self._parse_csv(self.COHERE_API_KEYS, placeholder_prefixes=("COHERE_KEY",))

    @property
    def ai21_api_keys(self) -> list[str]:
        """Parse AI21_API_KEYS into list."""
        return self._parse_csv(self.AI21_API_KEYS, placeholder_prefixes=("AI21_KEY",))

    @property
    def novita_api_keys(self) -> list[str]:
        """Parse NOVITA_API_KEYS into list."""
        return self._parse_csv(self.NOVITA_API_KEYS, placeholder_prefixes=("NOVITA_KEY",))

    @property
    def sambanova_api_keys(self) -> list[str]:
        """Parse SAMBANOVA_API_KEYS into list."""
        return self._parse_csv(self.SAMBANOVA_API_KEYS, placeholder_prefixes=("SAMBANOVA_KEY",))

    @property
    def admin_emails(self) -> list[str]:
        """Parse ADMIN_EMAILS into list."""
        if not self.ADMIN_EMAILS:
            return []
        return [email.strip() for email in self.ADMIN_EMAILS.split(",") if email.strip()]

    @property
    def allowed_origins(self) -> list[str]:
        """Parse ALLOWED_ORIGINS into list."""
        if not self.ALLOWED_ORIGINS:
            return ["http://localhost:3000"]
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.ENV.lower() == "production"

    def is_development(self) -> bool:
        """Check if running in development environment."""
        return self.ENV.lower() == "development"

    @property
    def effective_database_url(self) -> str:
        """Get the effective database URL, falling back to SQLite for local development.

        asyncpg does NOT support `sslmode` as a query parameter in the URL.
        SSL is handled via `connect_args={"ssl": True}` in the engine.
        This method strips sslmode from the URL to prevent TypeError.
        """
        if self.DATABASE_URL:
            url = self.DATABASE_URL

            # Strip sslmode query param — asyncpg rejects it as a kwarg
            import re
            url = re.sub(r'[?&]sslmode=[^&]*', '', url).rstrip('?').rstrip('&')

            # Normalize to async drivers
            if url.startswith("postgresql://"):
                return url.replace("postgresql://", "postgresql+asyncpg://", 1)
            if url.startswith("postgres://"):
                return url.replace("postgres://", "postgresql+asyncpg://", 1)
            if url.startswith("libsql://"):
                return url.replace("libsql://", "sqlite+libsql://", 1)
            return url
        else:
            # Fallback to local SQLite database for development/demo mode
            import os
            db_dir = os.path.dirname(os.path.dirname(__file__))
            db_path = os.path.join(db_dir, "ASTRAMINDai_local.db")
            # Use absolute path for SQLite
            return f"sqlite+aiosqlite:///{db_path.replace(os.sep, '/')}"


# Singleton instance
settings = Settings()

def validate_startup():
    """Called in app startup to verify all critical settings."""
    errors = []
    warnings = []

    # JWT secret validation for production
    if settings.is_production() and not settings.JWT_SECRET:
        errors.append("JWT_SECRET not configured in production - required for security")
    elif settings.is_production() and settings.JWT_SECRET and len(settings.JWT_SECRET) < 32:
        errors.append("JWT_SECRET must be at least 32 characters for production security")

    # CORS validation for production
    if settings.is_production() and not settings.allowed_origins:
        errors.append("ALLOWED_ORIGINS not configured in production - required for CORS")
    elif settings.is_production() and len(settings.allowed_origins) == 0:
        errors.append("ALLOWED_ORIGINS cannot be empty in production")

    # Database validation for production
    if settings.is_production() and not settings.DATABASE_URL:
        errors.append("DATABASE_URL not configured in production - SQLite fallback not suitable")
    elif settings.is_production() and settings.DATABASE_URL and settings.DATABASE_URL.startswith("sqlite"):
        warnings.append("Using SQLite in production - not recommended for high traffic")

    # AI providers validation
    has_providers = (
        len(settings.groq_api_keys) > 0 or
        len(settings.openrouter_api_keys) > 0 or
        len(settings.together_api_keys) > 0 or
        len(settings.mistral_api_keys) > 0 or
        len(settings.cerebras_api_keys) > 0 or
        len(settings.siliconflow_api_keys) > 0 or
        len(settings.google_ai_studio_api_keys) > 0 or
        len(settings.alibaba_bailian_api_keys) > 0 or
        len(settings.deepseek_api_keys) > 0 or
        len(settings.xai_api_keys) > 0 or
        len(settings.anthropic_api_keys) > 0 or
        len(settings.cohere_api_keys) > 0 or
        len(settings.ai21_api_keys) > 0 or
        len(settings.novita_api_keys) > 0 or
        len(settings.sambanova_api_keys) > 0
    )

    if not has_providers:
        errors.append("No AI provider API keys configured. At least one provider (Groq, OpenRouter, Anthropic, etc.) is required.")

    # Security dependencies check
    try:
        import bcrypt
        import cryptography
    except ImportError:
        errors.append("Security dependencies (bcrypt, cryptography) not installed. Run 'pip install bcrypt cryptography'")

    if errors:
        error_message = f"Configuration validation failed:\n  • " + "\n  • ".join(errors)
        if warnings:
            error_message += f"\n\nWarnings:\n  • " + "\n  • ".join(warnings)
        raise RuntimeError(error_message)

    # Show configuration summary
    db_type = "PostgreSQL" if settings.DATABASE_URL else "SQLite (local fallback)"
    providers = []
    if settings.groq_api_keys:
        providers.append(f"Groq ({len(settings.groq_api_keys)} keys)")
    if settings.openrouter_api_keys:
        providers.append(f"OpenRouter ({len(settings.openrouter_api_keys)} keys)")
    if settings.together_api_keys:
        providers.append(f"Together ({len(settings.together_api_keys)} keys)")
    if settings.mistral_api_keys:
        providers.append(f"Mistral ({len(settings.mistral_api_keys)} keys)")
    if settings.cerebras_api_keys:
        providers.append(f"Cerebras ({len(settings.cerebras_api_keys)} keys)")
    if settings.siliconflow_api_keys:
        providers.append(f"SiliconFlow ({len(settings.siliconflow_api_keys)} keys)")
    if settings.google_ai_studio_api_keys:
        providers.append(f"Google AI Studio ({len(settings.google_ai_studio_api_keys)} keys)")
    if settings.CLOUDFLARE_ACCOUNT_ID and settings.CLOUDFLARE_API_TOKEN:
        providers.append("Cloudflare Workers AI")
    if settings.alibaba_bailian_api_keys:
        providers.append(f"Alibaba Bailian ({len(settings.alibaba_bailian_api_keys)} keys)")
    if settings.deepseek_api_keys:
        providers.append(f"DeepSeek ({len(settings.deepseek_api_keys)} keys)")
    if settings.xai_api_keys:
        providers.append(f"xAI ({len(settings.xai_api_keys)} keys)")
    if settings.anthropic_api_keys:
        providers.append(f"Anthropic ({len(settings.anthropic_api_keys)} keys)")
    if settings.cohere_api_keys:
        providers.append(f"Cohere ({len(settings.cohere_api_keys)} keys)")
    if settings.ai21_api_keys:
        providers.append(f"AI21 ({len(settings.ai21_api_keys)} keys)")
    if settings.novita_api_keys:
        providers.append(f"Novita ({len(settings.novita_api_keys)} keys)")
    if settings.sambanova_api_keys:
        providers.append(f"SambaNova ({len(settings.sambanova_api_keys)} keys)")
    if settings.HUGGINGFACE_API_KEY:
        providers.append("HuggingFace")
    if settings.OPENAI_API_KEY:
        providers.append("OpenAI")

    print(f"\n Configuration validated for {settings.ENV.upper()} environment")
    print(f"   Database: {db_type}")
    print(f"   AI Providers: {', '.join(providers) if providers else 'None configured'}")
    print(f"   Log Level: {settings.LOG_LEVEL}")

    if warnings:
        print(f"\n⚠️  Warnings:")
        for warning in warnings:
            print(f"   • {warning}")

    print(f"\nDatabase: {db_type}")
