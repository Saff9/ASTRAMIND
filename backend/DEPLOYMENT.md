# ASTRAMIND Backend - Production Deployment Guide

This guide covers deploying the ASTRAMIND Backend to Render.com or similar cloud platforms.

## Pre-Deployment Checklist

✅ **Dependencies Fixed:** 
- Added `email-validator` package for Pydantic EmailStr validation
- Updated Python version to 3.11.8 (stable LTS)
- All required packages properly specified

✅ **Configuration:**
- Production-ready settings with validation
- Environment variable template (.env.example)
- Security headers and CORS configured

✅ **Database:**
- Async PostgreSQL support with connection pooling
- SQLite fallback for development
- Proper connection timeout handling

✅ **Security:**
- JWT token generation working correctly
- Rate limiting middleware
- Input validation and sanitization

## Environment Variables

Copy `.env.example` to `.env` and set:

```bash
# [REQUIRED] - Core Configuration
ENV=production
DATABASE_URL=postgresql://user:pass@host:port/db
JWT_SECRET=your-32+char-secret-here

# [REQUIRED] - At least one AI provider
GROQ_API_KEYS=your_groq_key
OPENROUTER_API_KEYS=your_openrouter_key

# [OPTIONAL] - Additional providers
HUGGINGFACE_API_KEY=hf_your_token
OPENAI_API_KEY=your_openai_key

# [REQUIRED] - CORS
ALLOWED_ORIGINS=https://your-frontend.com
```

## Render.com Deployment

### 1. Create Web Service

- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `python main.py`
- **Python Version:** 3.11.8

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

**Deployment Status:** ✅ **PRODUCTION READY**
**Last Updated:** $(date)
**Version:** 1.1.2
