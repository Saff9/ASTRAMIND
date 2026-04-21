# 🚀 ASTRAMIND - Production Deployment Guide (v1.1.5)

This guide provides the official instructions for deploying the ASTRAMIND platform in a production environment.

---

## 📋 System Architecture

*   **Backend**: Python 3.13 / FastAPI (Web Service)
*   **Frontend**: Next.js 14 (Static Site or Managed Next.js)
*   **Database**: PostgreSQL (Neon, Supabase, or AWS RDS)
*   **AI Orchestration**: Multi-provider AIRouter with Circuit Breakers
*   **Security**: Zero-Trust architecture with IP-based rate limiting and JWT

---

## 🏗️ Backend Deployment (Render Web Service)

### 1. Service Configuration

Connect your repository to [Render](https://render.com) and create a new **Web Service**.

*   **Name**: `astramind-backend`
*   **Runtime**: Python 3
*   **Root Directory**: `backend`
*   **Build Command**: `pip install -r requirements.txt`
*   **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
*   **Plan**: Pro or higher (recommended for 2GB+ RAM)

### 2. Environment Variables

Set the following variables in the Render Dashboard:

| Key | Description |
| :--- | :--- |
| `ENV` | `production` |
| `LOG_LEVEL` | `INFO` |
| `DATABASE_URL` | PostgreSQL connection string (`postgresql+asyncpg://...`) |
| `JWT_SECRET` | Strong secret key (min 32 chars) |
| `ALLOWED_ORIGINS` | Comma-separated frontend URLs (e.g., `https://astramind.vercel.app`) |
| `GROQ_API_KEYS` | Comma-separated API keys for Groq |
| `OPENROUTER_API_KEYS` | Comma-separated API keys for OpenRouter |
| `GOOGLE_AI_STUDIO_API_KEYS` | Comma-separated API keys for Gemini |

### 3. Health & Readiness
*   **Health Check Path**: `/api/v1/health`
*   **Readiness Path**: `/api/v1/ready`

---

## 🎨 Frontend Deployment (Vercel or Render)

### 1. Build Configuration
*   **Framework**: Next.js
*   **Root Directory**: `frontend`
*   **Build Command**: `npm run build`
*   **Output Directory**: `.next` (or `out` for static exports)

### 2. Environment Variables
*   **`NEXT_PUBLIC_API_URL`**: Your backend URL (e.g., `https://astramind-backend.onrender.com`)
*   **`NEXT_PUBLIC_APP_VERSION`**: `1.1.5`

---

## 🛡️ Security Operations

### 1. IP Whitelisting
Ensure your database (e.g., Neon or Supabase) accepts connections from your backend service IP.

### 2. Rate Limiting
Production limits are enforced at two levels:
*   **Application Level**: 60 requests/min per IP (configurable in `config.py`)
*   **User Level**: Daily quotas based on account tier (Guest: 70, User: 50, Premium: 200).

---

## 🔍 Monitoring & Stability

### 1. Stability Engine
The backend includes a `StabilityEngine` that monitors error rates and manages circuit breakers.
*   **Status Endpoint**: `/api/v1/stability` provides a real-time stability score and health metrics.

### 2. Logging
Logs are structured as JSON for production. Monitor Render logs for:
*   `Circuit Breaker state changed`
*   `Rate limit exceeded`
*   `Quota enforcement`

---

## 🔄 Scaling Strategy

1.  **Vertical Scaling**: Start with 1GB-2GB RAM. If memory usage exceeds 80%, upgrade to the next tier.
2.  **Horizontal Scaling**: Render supports multiple instances. The system is stateless and supports horizontal scaling out of the box, provided `DATABASE_POOL_SIZE` is adjusted accordingly (default: 20).

---

## 🆘 Troubleshooting

*   **Database Error**: Ensure the URL uses the `+asyncpg` driver for SQLAlchemy.
*   **CORS Issues**: Cross-check `ALLOWED_ORIGINS` in backend config with the actual frontend URL.
*   **Provider Failures**: Check `/api/v1/stability` to see if a specific AI provider's circuit breaker is open.
