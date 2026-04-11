# 🚀 ASTRAMIND Backend - Enterprise Production Guide

> **High-scale FastAPI backend supporting 100,000+ users and 50,000+ concurrent connections with multi-provider AI routing, JWT authentication, comprehensive monitoring, and customizable AI personality.**

---

## 📋 Quick Reference

| Component | Tech | Status |
|-----------|------|--------|
| **Framework** | FastAPI + Uvicorn | ✅ Production |
| **Database** | PostgreSQL 14+ (Async) | ✅ Connected |
| **Authentication** | JWT (HS256) | ✅ Implemented |
| **AI Providers** | 15+ providers | ✅ Configured |
| **Personality Engine** | Configurable YAML | ✅ Supported |
| **Testing** | pytest (28 tests) | ✅ Passing |

---

## 🎯 Scaling Targets

**Production Requirements:**
- **Users**: 100,000+ registered users
- **Concurrency**: 50,000+ simultaneous connections
- **Latency**: <500ms P95 response time
- **Availability**: 99.9% uptime
- **Throughput**: 10,000+ requests/minute

**Architecture Decisions:**
- **Stateless**: All instances identical, no shared state
- **Async**: Full async/await patterns, non-blocking I/O
- **Horizontal**: Scales via instance count, not size
- **Resilient**: Circuit breakers, retries, graceful degradation

---

## 🏗️ Architecture

### Request Flow Diagram

```
Browser Request
    ↓
[HTTPS]
    ↓
┌─────────────────────────────────────────┐
│ FastAPI Server (Port 8000)             │
├─────────────────────────────────────────┤
│ 1. RequestID Middleware (tracing)       │
│ 2. SecurityHeaders Middleware          │
│ 3. RequestValidation Middleware       │
│ 4. Rate Limiting Middleware            │
│ 5. CORS Middleware                    │
├─────────────────────────────────────────┤
│ Authentication: JWT verification        │
│ ↓                                       │
│ Rate Limiting: check_quota()           │
│ ↓                                       │
│ Personality Engine: apply_style()      │
│ ↓                                       │
│ Request Handler: /api/v1/chat          │
├─────────────────────────────────────────┤
│ Service Layer:                         │
│ • AIRouter.stream()                    │
│ • StabilityEngine.execute_with_stability│
│ • ModelRouter.get_best_provider()     │
├─────────────────────────────────────────┤
│ AI Providers (15+):                    │
│ • Groq, OpenRouter, Together, Mistral  │
│ • Cerebras, SiliconFlow, Google AI     │
│ • DeepSeek, xAI, Anthropic, Cohere    │
│ • AI21, Novita, SambaNova, HuggingFace │
├─────────────────────────────────────────┤
│ PostgreSQL Database:                   │
│ • users (id, email, quota, is_admin)   │
│ • provider_status (uptime tracking)   │
└─────────────────────────────────────────┘
    ↓
[Streaming Response: Server-Sent Events]
    ↓
Browser (displays tokens as they arrive)
```

---

## 🚀 Getting Started

### 1. Local Development (5 minutes)

```bash
# Clone and setup
git clone https://github.com/yourusername/ASTRAMINDai.git
cd ASTRAMINDai/backend

# Virtual environment
python -m venv venv
source venv/bin/activate

# Dependencies
pip install -r requirements.txt

# Environment setup
cp .env.example .env

# Edit .env - set these as minimum:
# DATABASE_URL=postgresql+asyncpg://localhost/ASTRAMINDai_dev
# JWT_SECRET=your-super-secret-key-min-32-chars
# GROQ_API_KEYS=your_groq_key

# Run server
uvicorn main:app --reload --port 8000

# Test with curl
curl http://localhost:8000/health
```

### 2. Database Setup

```bash
# Using Supabase (recommended for production)
1. Create account at https://supabase.com
2. Create new project
3. Copy connection string → DATABASE_URL in .env
4. Tables auto-create on first run

# Using local PostgreSQL
1. Install PostgreSQL 14+
2. Create database: createdb ASTRAMINDai_dev
3. Set DATABASE_URL=postgresql://user:pass@localhost/ASTRAMINDai_dev
```

### 3. API Keys Setup

```bash
# Groq (fastest)
1. Go to https://console.groq.com/keys
2. Create API key
3. Add to .env: GROQ_API_KEYS=gsk_xxxxx

# OpenRouter (smartest)
1. Go to https://openrouter.ai/keys
2. Create API key
3. Add to .env: OPENROUTER_API_KEYS=sk-or-xxxxx

# DeepSeek (free tier available)
1. Go to https://platform.deepseek.com/
2. Add to .env: DEEPSEEK_API_KEYS=sk-xxxxx

# xAI (Grok)
1. Go to https://console.x.ai/
2. Add to .env: XAI_API_KEYS=xai-xxxxx

# Anthropic (Claude)
1. Go to https://console.anthropic.com/
2. Add to .env: ANTHROPIC_API_KEYS=sk-ant-xxxxx
```

### 4. Configure AI Personality

```bash
# Option 1: Use default personality (casual/hip style)
# No additional config needed

# Option 2: Point to custom config file
PERSONALITY_CONFIG_PATH=/path/to/my_config.yaml

# Option 3: Use built-in profile
PERSONALITY_PROFILE=professional
```

See `PERSONALITY_SKILLS.md` for full customization options.

---

## 📡 API Endpoints Reference

### Authentication

#### Login (Get JWT Token)
```bash
POST /api/v1/auth/login

Body:
{
  "email": "user@example.com"
}

Response (200):
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 86400,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "daily_quota": 50,
    "daily_used": 0,
    "is_admin": false
  }
}
```

### Chat

#### Send Message
```bash
POST /api/v1/chat
Header: Authorization: Bearer {token}

Body:
{
  "prompt": "What is AI?",
  "model": "fast",           # fast|balanced|smart
  "stream": true
}

Response (200):
Server-Sent Events stream
data: {"choices":[{"delta":{"content":"This"},"index":0,"finish_reason":null}]}
data: {"choices":[{"delta":{"content":" is"},"index":0,"finish_reason":null}]}
```

#### Get User Quota
```bash
GET /api/v1/quota
Header: Authorization: Bearer {token}

Response (200):
{
  "used": 15,
  "limit": 50,
  "remaining": 35,
  "resets_at": "2026-04-11T00:00:00",
  "reset_time_utc": "00:00 UTC"
}
```

#### List Available Models
```bash
GET /api/v1/models
Header: Authorization: Bearer {token}

Response (200):
{
  "models": [
    {"id": "fast", "name": "Fast ⚡", "description": "Quick responses", "available": true, "auto_provider": true},
    {"id": "balanced", "name": "Balanced ⚖️", "description": "Balance of speed and quality", "available": true, "auto_provider": true},
    {"id": "smart", "name": "Smart 🧠", "description": "Best quality", "available": true, "auto_provider": true}
  ],
  "features": {
    "local_detection": true,
    "auto_fallback": true,
    "health_monitoring": true
  }
}
```

### Status & Health

#### Backend Health
```bash
GET /health

Response (200):
{
  "status": "healthy",
  "version": "1.1.2",
  "service": "ASTRAMIND Backend",
  "providers_configured": 15
}
```

#### Provider Status
```bash
GET /api/v1/status

Response (200):
[
  {"provider": "groq", "status": "up", "uptime": 99.82},
  {"provider": "deepseek", "status": "up", "uptime": 98.45},
  {"provider": "anthropic", "status": "up", "uptime": 95.12}
]
```

---

## 🔐 Security Details

### Middleware Security Stack

```
Request
   ↓
[1] RequestIDMiddleware    → Adds X-Request-ID header
   ↓
[2] SecurityHeadersMiddleware → CSP, HSTS, X-Frame-Options
   ↓
[3] RateLimitingMiddleware  → 60 req/min per IP
   ↓
[4] CORSMiddleware         → Allowed origins only
   ↓
[5] JWT Verification       → Validates Bearer token
   ↓
[6] Quota Check           → Enforces daily limits
   ↓
[7] Content Filter        → Safety checks
   ↓
Handler
```

### Quota System (Role-based)

| Role | Daily Quota | Env Variable |
|------|-------------|--------------|
| Regular User | 50 | `USER_DAILY_QUOTA` |
| Admin | 500 | `ADMIN_DAILY_QUOTA` |
| Premium | 200 | `PREMIUM_DAILY_QUOTA` |

Quotas reset at midnight UTC daily.

---

## ⚙️ Configuration Deep Dive

### Environment Variables

```bash
# === CORE ===
ENV=production
LOG_LEVEL=INFO

# === DATABASE ===
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/dbname
DATABASE_POOL_SIZE=20
DATABASE_POOL_MAX_OVERFLOW=40

# === SECURITY ===
JWT_SECRET=min-32-characters-very-secure-string
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# === API KEYS (comma-separated for multiple) ===
GROQ_API_KEYS=key1,key2,key3
OPENROUTER_API_KEYS=key1,key2
TOGETHER_API_KEYS=key1
CEREBRAS_API_KEYS=key1
MISTRAL_API_KEYS=key1
SILICONFLOW_API_KEYS=key1
GOOGLE_AI_STUDIO_API_KEYS=key1
DEEPSEEK_API_KEYS=key1
XAI_API_KEYS=key1
ANTHROPIC_API_KEYS=key1
COHERE_API_KEYS=key1
AI21_API_KEYS=key1
NOVITA_API_KEYS=key1
SAMBANOVA_API_KEYS=key1
HUGGINGFACE_API_KEY=key1

# === QUOTA TIERS ===
USER_DAILY_QUOTA=50
ADMIN_DAILY_QUOTA=500
PREMIUM_DAILY_QUOTA=200
ENABLE_QUOTA_TIERS=true

# === PERSONALITY (optional) ===
# PERSONALITY_CONFIG_PATH=./custom_personality.yaml
# PERSONALITY_PROFILE=professional

# === ADMIN USERS ===
ADMIN_EMAILS=admin@example.com,owner@example.com

# === CORS ===
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

---

## 🎨 AI Personality Configuration

Customize how ASTRAMIND responds using `PERSONALITY_SKILLS.md`:

```yaml
# personality settings
personality:
  energy_level: 0.8        # 0.0 = chill, 1.0 = hype
  sarcasm_level: 0.6       # 0.0 = straight, 1.0 = savage  
  meme_level: 0.7          # 0.0 = formal, 1.0 = meme lord
  emoji_usage: 0.9         # 0.0 = none, 1.0 = emoji overload
  slang_frequency: 0.8    # How often to use slang

# conversation styles
styles:
  default: "casual"       # casual, hype, chill, savage, professional, witty
  
# custom slang
slang:
  greeting: ["yo", "hey", "vibes"]
  agreement: ["bet", "facts", "no cap"]
```

---

## 🧪 Testing

```bash
# Run all tests
cd backend
python -m pytest tests/ -v

# Run specific test files
python -m pytest tests/test_stability.py -v
python -m pytest tests/test_ai_router.py -v

# Run with coverage
python -m pytest tests/ --cov=. --cov-report=html

# Test output:
# ============================= 28 passed in 5s ==============================
```

### Test Coverage

| Test File | Tests | Description |
|-----------|-------|-------------|
| `test_stability.py` | 9 | Circuit breaker, recovery, health |
| `test_ai_router.py` | 9 | Provider routing, validation |
| `test_health_endpoints.py` | 3 | Health, ready, root |
| `test_security.py` | 7 | Auth, validation |

---

## 🔄 Provider Fallback Logic

```
When User Requests Response:

1. Check circuit breaker
   ├─ Open? → Use fallback response
   └─ Closed? → Continue

2. Try Primary Provider
   ├─ Success? → Return response ✅
   ├─ Rate limited? → Try next key, then next provider
   ├─ Error? → Try next provider
   └─ All failed? → Use stability fallback

3. Fallback Response:
   "Sorry, we're experiencing technical difficulties. Please try again!"

4. Circuit Breaker:
   - Opens after 5 consecutive failures
   - Half-open after 60 seconds
   - Closed on successful retry
```

---

## 📚 Code Structure

```
backend/
├── main.py                     # FastAPI app + middleware
├── PERSONALITY_SKILLS.md       # AI personality config guide
├── .env.example                # Environment template
│
├── app/
│   ├── db/
│   │   ├── models.py          # SQLAlchemy User model
│   │   └── session.py          # AsyncDB session
│   ├── middleware/
│   │   ├── security.py         # CSP, HSTS headers
│   │   ├── rate_limit.py       # Rate limiting
│   │   └── request_id.py       # Request tracing
│   ├── providers/
│   │   ├── base.py             # AIProvider interface
│   │   ├── openai_compatible.py# OpenAI-compatible clients
│   │   ├── anthropic.py        # Claude provider
│   │   ├── google_ai_studio.py # Gemini provider
│   │   └── cloudflare_workers_ai.py
│   └── deps/
│       └── auth.py             # JWT auth dependency
│
├── api/v1/
│   ├── chat.py                 # Chat endpoint
│   ├── auth.py                 # Login/logout
│   ├── status.py               # Provider status
│   ├── health.py               # Health checks
│   └── web_search.py           # Web search
│
├── core/
│   ├── config.py               # Settings (pydantic)
│   ├── security.py             # JWT utilities
│   ├── stability_engine.py     # Circuit breakers
│   ├── model_provider.py       # Model routing
│   ├── personality_config.py   # Personality loader
│   └── astramind_ai_personality.py # Personality engine
│
├── services/
│   ├── ai_router.py           # Multi-provider routing
│   ├── models.py               # Model configurations
│   └── stream.py              # SSE streaming
│
└── tests/
    ├── conftest.py            # pytest fixtures
    ├── test_stability.py      # Stability tests
    ├── test_ai_router.py      # Router tests
    ├── test_health_endpoints.py
    └── test_security.py       # Security tests
```

---

## 🆘 Troubleshooting

### Quota Exceeded
```bash
Error: 429 "Daily quota exceeded"

Solution:
1. Check /api/v1/quota endpoint
2. Quota resets at midnight UTC
3. Admin can increase USER_DAILY_QUOTA in .env
4. Admin users get 500 daily (ADMIN_DAILY_QUOTA)
```

### Provider Not Configured
```bash
Error: 503 "AI provider not configured"

Solution:
1. Check .env has at least one API key
2. Verify API key is valid
3. Check settings.LOGGED_CONFIG for configured providers
4. Add more providers for redundancy
```

### Personality Not Loading
```bash
Warning: Personality config not found, using defaults

Solution:
1. Set PERSONALITY_CONFIG_PATH in .env
2. Or set PERSONALITY_PROFILE=casual|professional|hype
3. Check PERSONALITY_SKILLS.md for valid config format
```

---

## 📊 Monitoring & Metrics

### Key Metrics

```
Health Status:
- Uptime percentage
- Memory/CPU usage  
- Error rate (errors/minute)
- Recovery success rate

Provider Status:
- Per-provider uptime
- Latency per provider
- Key rotation status

User Activity:
- Daily active users
- Quota usage distribution
- Top users by usage
```

### Stability Engine Endpoints
```bash
GET /api/v1/stability
# Returns: uptime, memory, cpu, error_rate, circuit_breakers
```

---

## 🎯 Next Steps

- [ ] Add `/api/v1/feedback` endpoint for user ratings
- [ ] Implement request caching for identical prompts
- [ ] Add advanced analytics dashboard
- [ ] Support function calling/tools
- [ ] Image generation integration
- [ ] Voice input/output

---

**Backend is production-ready. 🚀**