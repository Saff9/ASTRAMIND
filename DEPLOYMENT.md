# 🚀 ASTRAMIND - Production Deployment Guide (v1.2.0)

This guide provides the official instructions for deploying the ASTRAMIND platform in a production environment.

---

## 📋 System Architecture

*   **Backend**: Python 3.13 / FastAPI (Web Service)
*   **Frontend**: Next.js 15 (Static Site or Managed Next.js)
*   **Database**: PostgreSQL (Neon, Supabase, or AWS RDS)
*   **AI Orchestration**: Multi-provider AIRouter with 9 Agentic Skills
*   **Security**: Zero-Trust architecture with IP-based rate limiting

---

## 🏗️ Backend Deployment (Render Web Service)

### 1. Service Configuration

Connect your repository to [Render](https://render.com) and create a new **Web Service**.

*   **Name**: `astramind-backend`
*   **Runtime**: Python 3
*   **Root Directory**: `backend`
*   **Build Command**: `pip install -r requirements.txt`
*   **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
*   **Plan**: Free Tier compatible (512MB RAM) thanks to v1.2.0 memory optimizations.

### 2. Environment Variables

Set the following variables in the Render Dashboard:

| Key | Description |
| :--- | :--- |
| `ENV` | `production` |
| `LOG_LEVEL` | `INFO` |
| `DATABASE_URL` | PostgreSQL connection string (`postgresql+asyncpg://...`) |
| `JWT_SECRET` | Strong secret key (min 32 chars) |
| `ALLOWED_ORIGINS` | Comma-separated frontend URLs (e.g., `https://your-frontend.vercel.app`) |
| `GROQ_API_KEYS` | Comma-separated API keys for Groq (Primary Fast) |
| `OPENROUTER_API_KEYS` | Comma-separated API keys for OpenRouter (DeepSeek R1 Smart) |
| `CEREBRAS_API_KEYS` | Comma-separated API keys for Cerebras |

### 3. Health & Readiness
*   **Health Check Path**: `/api/v1/health`
*   **Stability Score Path**: `/api/v1/stability`

---

## 🎨 Frontend Deployment (Vercel)

### 1. Build Configuration
*   **Framework**: Next.js
*   **Root Directory**: `frontend`
*   **Build Command**: `npm run build`
*   **Output Directory**: `.next`

### 2. Environment Variables
*   **`NEXT_PUBLIC_API_URL`**: Your backend URL (e.g., `https://astramind-backend.onrender.com`). **CRITICAL: App will not work without this.**
*   **`NEXT_PUBLIC_APP_VERSION`**: `1.2.0`

---

## 🛡️ Security Operations

### 1. IP Whitelisting
Ensure your database (e.g., Neon or Supabase) accepts connections from your backend service IP.

### 2. Rate Limiting
Production limits are enforced at two levels:
*   **Application Level**: 60 requests/min per IP (configurable in `config.py`)
*   **User Level**: Daily quotas based on account tier.

---

## 🔍 Monitoring & Stability

### 1. Lightweight Monitor
The backend includes a highly optimized O(1) memory monitor that tracks CPU, RAM, and error rates without crashing constrained containers.

### 2. Logging
Monitor Render logs for:
*   `Circuit Breaker state changed`
*   `Rate limit exceeded`

---

## 🔄 Scaling Strategy

1.  **Vertical Scaling**: 512MB RAM is sufficient for standard workloads. If concurrent users exceed 500+, upgrade to 1GB+.
2.  **Horizontal Scaling**: Render supports multiple instances. The system is stateless (chat memory is on the client) and supports horizontal scaling out of the box, provided `DATABASE_POOL_SIZE` is adjusted accordingly (default: 20).

---

## 🆘 Troubleshooting

*   **Database Error**: Ensure the URL uses the `+asyncpg` driver for SQLAlchemy.
*   **CORS Issues**: Cross-check `ALLOWED_ORIGINS` in backend config with the actual frontend URL.
*   **Discover Page Blank**: Ensure `NEXT_PUBLIC_API_URL` is set in Vercel.
