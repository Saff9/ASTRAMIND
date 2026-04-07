# 🔧 ASTRAMIND Environment Variables Configuration

**Complete guide to configuring environment variables for backend and frontend deployment**

---

## 🏗️ Backend Environment Variables (Render)

### Core Configuration
```bash
# Environment
ENV=production                    # development|production
LOG_LEVEL=INFO                   # DEBUG|INFO|WARNING|ERROR

# Server
PORT=10000                       # Auto-assigned by Render
```

### Database
```bash
# Supabase PostgreSQL
DATABASE_URL=postgresql://user:pass@host:port/dbname
```

### Security & Authentication
```bash
# JWT Configuration
JWT_SECRET=your-super-secure-random-string-min-32-chars
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# Admin Users
ADMIN_EMAILS=admin@yourdomain.com,owner@yourdomain.com
```

### AI Provider API Keys
```bash
# Groq (Fast AI) - Comma-separated for key rotation
GROQ_API_KEYS=gsk_xxxxx,gsk_yyyyy,gsk_zzzzz

# OpenRouter (Smart AI) - Comma-separated
OPENROUTER_API_KEYS=sk-or-xxxxx,sk-or-yyyyy

# HuggingFace (Optional)
HUGGINGFACE_API_KEY=hf_xxxxxxxxx

# Additional providers (optional)
OPENAI_API_KEYS=sk-xxxxx,sk-yyyyy
ANTHROPIC_API_KEYS=sk-ant-xxxxx
GOOGLE_GEMINI_API_KEYS=AIza...
```

### Performance & Limits
```bash
# Rate Limiting
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_WINDOW_SECONDS=60
USER_DAILY_QUOTA=50

# Request Handling
MAX_REQUEST_SIZE_BYTES=50000
REQUEST_TIMEOUT_SECONDS=30

# Database Pooling
DATABASE_POOL_SIZE=20
DATABASE_POOL_MAX_OVERFLOW=40
DATABASE_POOL_RECYCLE_SECONDS=3600
```

### Model Configuration
```bash
# Default Models
GROQ_FAST_MODEL=llama-3.1-8b-instant
GROQ_BALANCED_MODEL=llama-3.1-70b
OPENROUTER_SMART_MODEL=openai/gpt-4o-mini

# Context Lengths
DEFAULT_CONTEXT_LENGTH=4096
```

### CORS & Networking
```bash
# Allowed Origins (comma-separated)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Trusted Hosts (auto-configured in production)
# RENDER_EXTERNAL_URL=auto-set-by-render
```

---

## 🎨 Frontend Environment Variables

### Supabase Configuration
```bash
# Public Supabase Keys
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Private Supabase Key (server-side only)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### API Keys (Optional - Override user settings)
```bash
# Global API Keys (bypass user settings)
OPENAI_API_KEY=sk-xxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxx
GOOGLE_GEMINI_API_KEY=AIza...
MISTRAL_API_KEY=your-mistral-key
GROQ_API_KEY=gsk_xxxxx
PERPLEXITY_API_KEY=pplx-xxxxx
OPENROUTER_API_KEY=sk-or-xxxxx
```

### Azure OpenAI (Optional)
```bash
AZURE_OPENAI_API_KEY=your-azure-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_GPT_35_TURBO_NAME=gpt-35-turbo
AZURE_GPT_45_VISION_NAME=gpt-4-vision
AZURE_GPT_45_TURBO_NAME=gpt-45-turbo
AZURE_EMBEDDINGS_NAME=text-embedding-ada-002
```

### OpenAI Organization (Optional)
```bash
NEXT_PUBLIC_OPENAI_ORGANIZATION_ID=org-xxxxx
```

### Local AI (Optional)
```bash
NEXT_PUBLIC_OLLAMA_URL=http://localhost:11434
```

### File Upload Limits
```bash
NEXT_PUBLIC_USER_FILE_SIZE_LIMIT=10485760  # 10MB in bytes
```

### Email Configuration (Optional)
```bash
EMAIL_DOMAIN_WHITELIST=yourdomain.com
EMAIL_WHITELIST=user@yourdomain.com,admin@yourdomain.com
```

---

## 🔐 Security Best Practices

### Backend Secrets
- **JWT_SECRET**: Generate a cryptographically secure random string (min 32 characters)
- **API Keys**: Rotate regularly, use separate keys for different environments
- **DATABASE_URL**: Never commit to version control

### Environment Separation
- **Development**: Use local Supabase instance and test API keys
- **Production**: Use production Supabase and production API keys
- **Staging**: Mirror production environment for testing

### Key Management
- Store production keys securely (Render/Vercel encrypted env vars)
- Use key rotation for high-traffic applications
- Monitor API usage and set up alerts for quota limits

---

## ⚙️ Environment-Specific Configurations

### Development (.env.local)
```bash
# Local development settings
ENV=development
LOG_LEVEL=DEBUG
DATABASE_URL=postgresql://localhost/ASTRAMINDai_dev

# Test API keys (limited quota)
GROQ_API_KEYS=gsk_test_key
OPENROUTER_API_KEYS=sk-or-test-key
```

### Production (Render/Vercel)
```bash
# Production settings
ENV=production
LOG_LEVEL=INFO

# Production database
DATABASE_URL=postgresql://prod-user:prod-pass@prod-host/prod-db

# Production API keys
GROQ_API_KEYS=gsk_prod_key1,gsk_prod_key2
OPENROUTER_API_KEYS=sk-or-prod-key1,sk-or-prod-key2
```

---

## 🔍 Validation & Testing

### Backend Validation
```bash
# Test configuration loading
python -c "from core.config import settings; print('Config loaded successfully')"

# Test database connection
python -c "from app.db.session import check_database_connection; import asyncio; asyncio.run(check_database_connection())"

# Test API keys
curl -X GET "https://your-backend.onrender.com/api/v1/status" -H "Authorization: Bearer test-token"
```

### Frontend Validation
```bash
# Test Supabase connection
npm run dev
# Check browser console for Supabase errors

# Test API key overrides
# Verify AI providers work in chat interface
```

---

## 🚨 Common Environment Issues

### Backend Issues
- **"Database connection failed"**: Check DATABASE_URL format and credentials
- **"JWT token invalid"**: Ensure JWT_SECRET is set and consistent
- **"API key not found"**: Verify AI provider keys are set correctly
- **"Port binding error"**: PORT variable not used (fixed in main.py)

### Frontend Issues
- **"Supabase connection failed"**: Check NEXT_PUBLIC_SUPABASE_URL and keys
- **"Authentication error"**: Verify SUPABASE_SERVICE_ROLE_KEY
- **"API calls failing"**: Check if API keys override user settings

---

## 📊 Monitoring Environment Health

### Backend Health Checks
```bash
# Service health
GET /health

# Readiness check
GET /ready

# Provider status
GET /api/v1/status
```

### Environment Monitoring
- Monitor API key usage in provider dashboards
- Set up alerts for database connection issues
- Track JWT token expiration and refresh patterns
- Monitor rate limiting and quota usage

---

**Keep production secrets secure and regularly rotate API keys! 🔒**
