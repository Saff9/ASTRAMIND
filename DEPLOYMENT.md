# 🚀 AstraMind Production Deployment Guide

**Deploy AstraMind backend (Python/FastAPI) on Render and frontend (Next.js) on Render/Vercel**

---

## 📋 Prerequisites

- GitHub account with repository access
- Render account (render.com)
- Vercel account (vercel.com) - optional, alternative to Render for frontend
- Supabase account for database
- API keys for AI providers (Groq, OpenRouter, etc.)

---

## 🏗️ Backend Deployment (Render)

### 1. Prepare Repository

Ensure your backend code is in the `backend/` directory with:
- `main.py` (FastAPI entry point)
- `requirements.txt` (Python dependencies)
- `runtime.txt` (Python version specification)

### 2. Create Render Web Service

1. Go to [render.com](https://render.com) and sign in
2. Click **"New"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure service:
   ```
   Name: ASTRAMINDai-backend
   Runtime: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: python main.py
   ```

### 3. Environment Variables

In Render dashboard, add these environment variables:

#### Core Configuration
```
ENV=production
LOG_LEVEL=INFO
PORT=10000
```

#### Database
```
DATABASE_URL=postgresql://user:pass@host:port/dbname
```

#### Security
```
JWT_SECRET=your-very-long-secure-random-string-min-32-chars
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
```

#### AI Provider API Keys
```
GROQ_API_KEYS=key1,key2,key3
OPENROUTER_API_KEYS=key1,key2
HUGGINGFACE_API_KEY=hf_xxxxxxxxx
```

#### Admin Configuration
```
ADMIN_EMAILS=admin@yourdomain.com
```

#### CORS (if needed)
```
ALLOWED_ORIGINS=https://your-frontend-domain.com,https://www.your-frontend-domain.com
```

### 4. Deploy & Verify

1. Click **"Create Web Service"**
2. Wait for deployment (5-10 minutes)
3. Check **"Logs"** tab for any errors
4. Test health endpoint: `curl https://your-service.onrender.com/health`
5. Test readiness: `curl https://your-service.onrender.com/ready`

**Expected Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "service": "AstraMind Backend"
}
```

---

## 🎨 Frontend Deployment (Render)

### 1. Prepare Repository

Ensure your frontend code is in the `frontend/` directory with:
- `package.json` with build scripts
- `next.config.js` configured
- Environment variables properly set

### 2. Create Render Static Site

1. In Render dashboard, click **"New"** → **"Static Site"**
2. Connect your GitHub repository
3. Configure site:
   ```
   Name: ASTRAMINDai-frontend
   Build Command: cd frontend && npm install && npm run build
   Publish Directory: frontend/out
   ```

### 3. Environment Variables

Add these environment variables in Render:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional: Override API keys globally
OPENAI_API_KEY=sk-xxxxx
GROQ_API_KEY=gsk_xxxxx
OPENROUTER_API_KEY=sk-or-xxxxx
```

### 4. Deploy & Verify

1. Click **"Create Static Site"**
2. Wait for deployment (3-5 minutes)
3. Visit the generated URL
4. Test login and basic functionality

---

## ⚡ Frontend Deployment (Vercel) - Alternative

### 1. Import Repository

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Import Project"**
3. Connect your GitHub repository
4. Configure project:
   ```
   Framework Preset: Next.js
   Root Directory: frontend
   Build Command: npm run build
   Output Directory: .next
   ```

### 2. Environment Variables

In Vercel dashboard, add environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional: Override API keys
OPENAI_API_KEY=sk-xxxxx
GROQ_API_KEY=gsk_xxxxx
```

### 3. Deploy

1. Click **"Deploy"**
2. Wait for deployment (2-3 minutes)
3. Visit the generated URL
4. Configure custom domain if needed

---

## 🗄️ Database Setup (Supabase)

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Wait for setup completion

### 2. Get Connection Details

From Supabase dashboard:
- **Project URL**: `https://xxxxx.supabase.co`
- **Anon Key**: `eyJhbGc...`
- **Service Role Key**: `eyJhbGc...`

### 3. Database URL for Backend

Use the PostgreSQL connection string from Supabase:
```
postgresql://postgres:[password]@db.xxxxx.supabase.co:5432/postgres
```

---

## 🔑 API Keys Setup

### Groq (Fast AI)
1. Visit [console.groq.com](https://console.groq.com)
2. Create API key
3. Add to environment: `GROQ_API_KEYS=gsk_xxxxx`

### OpenRouter (Smart AI)
1. Visit [openrouter.ai](https://openrouter.ai)
2. Create API key
3. Add to environment: `OPENROUTER_API_KEYS=sk-or-xxxxx`

### Optional: Other Providers
- HuggingFace: `HUGGINGFACE_API_KEY=hf_xxxxx`
- OpenAI: `OPENAI_API_KEY=sk-xxxxx`

---

## 🔍 Troubleshooting Common Issues

### Backend Issues

**Port binding error:**
- Ensure `runtime.txt` specifies correct Python version
- Check that `PORT` environment variable is used

**Database connection failed:**
- Verify `DATABASE_URL` is correct
- Ensure Supabase project is active
- Check firewall settings

**Health check fails:**
- Check logs for startup errors
- Verify AI API keys are set
- Ensure database tables exist

### Frontend Issues

**Build fails:**
- Check Node.js version compatibility
- Ensure all dependencies are in `package.json`
- Verify environment variables are set

**API calls fail:**
- Check Supabase configuration
- Verify API keys are set correctly
- Check CORS settings

**Authentication issues:**
- Ensure Supabase keys are correct
- Check JWT configuration matches backend

---

## 📊 Monitoring & Maintenance

### Health Checks
- Set up uptime monitoring on `/health` endpoint
- Monitor `/ready` endpoint for service availability
- Check provider status via `/api/v1/status`

### Logs
- Monitor Render/Vercel logs for errors
- Set up alerts for failed deployments
- Regularly check AI provider rate limits

### Scaling
- Render: Upgrade instance type as needed
- Vercel: Functions scale automatically
- Monitor response times and error rates

---

## 🔄 Updates & Rollbacks

### Backend Updates
1. Push code changes to GitHub
2. Render auto-deploys from main branch
3. Monitor logs during deployment
4. Rollback if needed via Render dashboard

### Frontend Updates
1. Push changes to GitHub
2. Vercel/Render auto-deploys
3. Test functionality after deployment
4. Use preview deployments for testing

---

**🎉 AstraMind is now live and ready to serve users!**
