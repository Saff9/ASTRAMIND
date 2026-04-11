# ASTRAMIND Backend - Production Deployment Guide

This guide covers deploying the ASTRAMIND Backend to Render.com or similar cloud platforms.

## Version 1.1.2 - What's New

- **15+ AI Providers**: Groq, OpenRouter, Together, Mistral, Cerebras, SiliconFlow, Google AI Studio, DeepSeek, xAI, Anthropic, Cohere, AI21, Novita, SambaNova, HuggingFace
- **Role-based Quotas**: USER_DAILY_QUOTA, ADMIN_DAILY_QUOTA, PREMIUM_DAILY_QUOTA
- **Customizable Personality**: Configure AI behavior via PERSONALITY_SKILLS.md
- **Stability Engine**: Circuit breakers with automatic recovery
- **28 Tests Passing**: Comprehensive test coverage

## Pre-Deployment Checklist

✅ **Dependencies:** All packages properly specified in requirements.txt

✅ **Configuration:** Production-ready settings with validation

✅ **Database:** Async PostgreSQL support with connection pooling

✅ **Security:** JWT, rate limiting, input validation, CSP headers

✅ **Personality:** Configurable AI behavior via YAML/MD files

## Environment Variables

Copy `.env.example` to `.env` and set:

```bash
# [REQUIRED] - Core Configuration
ENV=production
DATABASE_URL=postgresql://user:pass@host:port/db
JWT_SECRET=your-32+char-secret-here

# [REQUIRED] - At least one AI provider (15+ supported)
GROQ_API_KEYS=your_groq_key
OPENROUTER_API_KEYS=your_openrouter_key

# [OPTIONAL] - Additional providers (comma-separated for multiple keys)
DEEPSEEK_API_KEYS=your_deepseek_key
XAI_API_KEYS=your_xai_key
ANTHROPIC_API_KEYS=your_anthropic_key
TOGETHER_API_KEYS=your_together_key
MISTRAL_API_KEYS=your_mistral_key
CEREBRAS_API_KEYS=your_cerebras_key
SILICONFLOW_API_KEYS=your_siliconflow_key
COHERE_API_KEYS=your_cohere_key

# [OPTIONAL] - Quota settings
USER_DAILY_QUOTA=50
ADMIN_DAILY_QUOTA=500
PREMIUM_DAILY_QUOTA=200
ENABLE_QUOTA_TIERS=true

# [OPTIONAL] - Personality configuration
# PERSONALITY_CONFIG_PATH=./custom_personality.yaml
# PERSONALITY_PROFILE=professional

# [REQUIRED] - CORS
ALLOWED_ORIGINS=https://your-frontend.com

# [OPTIONAL] - Admin users
ADMIN_EMAILS=admin@example.com,owner@example.com
```

## Render.com Deployment

### 1. Create Web Service

- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `python main.py`
- **Python Version:** 3.11+

### 2. Environment Variables

Set all required environment variables in Render dashboard:

```
ENV=production
DATABASE_URL=<your-postgres-url>
JWT_SECRET=<32+char-secret>
GROQ_API_KEYS=<your-groq-key>
ALLOWED_ORIGINS=https://your-frontend.com
```

### 3. Health Checks

- **Health Check Path:** `/health`
- **Readiness Check Path:** `/ready`
- **Health Check Timeout:** 5 seconds
- **Interval:** 30 seconds

### 4. Scaling (Optional)

- **Instance Type:** Standard (recommended)
- **Auto-scaling:** Enable based on CPU/RAM

## Database Setup

### PostgreSQL on Render

1. Create PostgreSQL database
2. Get connection string from Render dashboard
3. Add to environment variables
4. Run migrations automatically:

```bash
alembic upgrade head
```

### Local Development Database

For development, SQLite is used automatically:
- No DATABASE_URL needed
- Auto-creates `ASTRAMINDai_local.db`
- Creates admin user `admin@localhost`

## Testing Deployment

### 1. Validate Environment

Run deployment validation script:
```bash
python render_deploy.py
```

### 2. Test Endpoints

```bash
# Health check
curl https://your-service.onrender.com/health

# Root endpoint
curl https://your-service.onrender.com/

# Ready check
curl https://your-service.onrender.com/ready
```

### 3. Verify AI Providers

Check that providers are responding:
```bash
# Check if providers are configured
curl https://your-service.onrender.com/api/v1/status
```

## Troubleshooting

### Common Issues

**ModuleNotFoundError: No module named 'email_validator'**
```bash
# Fix: Add to requirements.txt
pip install email-validator
```

**JWT_SECRET not configured**
- Set JWT_SECRET environment variable (32+ chars)

**Database connection errors**
- Check DATABASE_URL format
- Ensure PostgreSQL is accessible

**CORS errors**
- Set ALLOWED_ORIGINS environment variable
- Include frontend domain

### Logs

Check Render logs for:
- Startup errors
- Database connection issues
- AI provider authentication failures

## Monitoring

### Built-in Metrics

```bash
# Prometheus metrics endpoint
GET /metrics

# Application health
GET /health
GET /ready
```

### Performance Monitoring

- Render built-in metrics
- Application logs via Render dashboard
- Database performance via PostgreSQL metrics

## Security Considerations

### Production Security

✅ Implemented:
- JWT token authentication
- Rate limiting
- CORS protection
- SQL injection prevention
- Input validation

### Additional Recommendations

- Use HTTPS everywhere
- Monitor for suspicious activity
- Regular dependency updates
- Database backup strategy

## Support

For deployment issues:

1. Check Render deployment logs
2. Run `python render_deploy.py` locally
3. Test endpoints manually
4. Review environment variables

---

## Run Tests Before Deployment

```bash
cd backend

# Run all tests
python -m pytest tests/ -v

# Expected: 28 passed
```

---

**Deployment Status:** ✅ **PRODUCTION READY**
**Version:** 1.1.2
