# 🚀 ASTRAMIND - Render Deployment Guide (v1.1.3)

This guide provides step-by-step instructions for deploying ASTRAMIND on Render with separate backend and frontend services.

---

## 📋 Deployment Overview

**Target Architecture:**
- **Backend**: Python/FastAPI on Render Web Service
- **Frontend**: Next.js on Render Static Site
- **Database**: Supabase PostgreSQL
- **Version**: v1.1.3

---

## 🏗️ Backend Deployment (Render Web Service)

### 1. Prepare Backend Code

Ensure your backend directory contains:
```bash
backend/
├── main.py                # FastAPI entry point (v1.1.3)
├── requirements.txt       # Python dependencies
├── runtime.txt            # Python 3.13.7
├── render_config.py       # Render-specific configuration
├── render_deploy.py       # Deployment validation script
└── ...                    # All other backend files
```

### 2. Create Render Web Service

1. **Log in** to [render.com](https://render.com)
2. Click **"New"** → **"Web Service"**
3. **Connect your GitHub repository**
4. **Configure service settings**:

```bash
# Render Web Service Configuration
Name: ASTRAMINDai-backend-v1.1.3
Region: Oregon (US West)  # or closest to your users
Branch: main
Root Directory: backend
Build Command: pip install -r requirements.txt
Start Command: python main.py
Environment: Python 3
Python Version: 3.13.7
```

### 3. Environment Variables

Set these in **Render Dashboard → Environment**:

#### **Core Configuration**
```bash
ENV=production
LOG_LEVEL=INFO
PORT=10000
```

#### **Database (Supabase)**
```bash
DATABASE_URL=postgresql://user:password@host:port/dbname
```

#### **Security**
```bash
JWT_SECRET=your-very-long-secure-random-string-min-32-chars
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
```

#### **AI Provider API Keys**
```bash
GROQ_API_KEYS=key1,key2,key3
OPENROUTER_API_KEYS=key1,key2
HUGGINGFACE_API_KEY=hf_xxxxxxxxx
```

#### **Admin & CORS**
```bash
ADMIN_EMAILS=admin@yourdomain.com
ALLOWED_ORIGINS=https://your-frontend.onrender.com,https://localhost:3000
```

### 4. Advanced Configuration

#### **Auto-Deploy Settings**
- Enable **Auto-Deploy** from main branch
- Set **Deployment Strategy** to "Live"

#### **Scaling**
- **Instance Type**: Standard (1 CPU, 1GB RAM)
- **Auto-Scaling**: Enable with 1-4 instances
- **Concurrency**: 100 requests per instance

#### **Health Checks**
- **Path**: `/health`
- **Interval**: 30 seconds
- **Timeout**: 5 seconds
- **Max Failures**: 3

### 5. Deploy & Verify

1. Click **"Create Web Service"**
2. Wait for deployment (5-10 minutes)
3. **Check logs** in the "Logs" tab
4. **Test endpoints**:

```bash
# Health check
curl https://your-backend.onrender.com/health

# Readiness check
curl https://your-backend.onrender.com/ready

# API docs
curl https://your-backend.onrender.com/docs
```

**Expected Response:**
```json
{
  "status": "healthy",
  "version": "1.1.3",
  "service": "ASTRAMIND Backend",
  "uptime": 123.45,
  "stability_metrics": {
    "error_rate": 0.0,
    "recovery_success_rate": 1.0,
    "active_circuit_breakers": 0,
    "recent_errors": 0
  }
}
```

---

## 🎨 Frontend Deployment (Render Static Site)

### 1. Prepare Frontend Code

Ensure your frontend directory contains:
```bash
frontend/
├── package.json          # v1.1.3
├── next.config.js        # Configured for Render
├── vercel.json           # Deployment configuration
└── ...                    # All other frontend files
```

### 2. Create Render Static Site

1. In Render dashboard, click **"New"** → **"Static Site"**
2. **Connect your GitHub repository**
3. **Configure site**:

```bash
# Render Static Site Configuration
Name: ASTRAMINDai-frontend-v1.1.3
Region: Oregon (US West)  # match backend region
Branch: main
Root Directory: frontend
Build Command: npm install && npm run build
Publish Directory: frontend/out
```

### 3. Environment Variables

Set these in **Render Dashboard → Environment**:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# API Configuration
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
NEXT_PUBLIC_APP_VERSION=1.1.3

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_WEB_SEARCH=true
```

### 4. Advanced Configuration

#### **Auto-Deploy Settings**
- Enable **Auto-Deploy** from main branch
- Set **Deployment Strategy** to "Live"

#### **Custom Domain (Optional)**
```bash
Domain: ai.yourdomain.com
SSL: Automatic (managed by Render)
```

#### **Caching**
- **Cache Strategy**: Optimized for Next.js
- **Cache TTL**: 3600 seconds (1 hour)

### 5. Deploy & Verify

1. Click **"Create Static Site"**
2. Wait for deployment (3-5 minutes)
3. **Visit the generated URL**
4. **Test functionality**:
   - Login/Registration
   - Chat functionality
   - API connectivity
   - Responsive design

---

## 🔧 Render-Specific Optimizations

### Backend Optimizations

1. **Connection Pooling**:
```python
# In render_config.py
DATABASE_POOL_SIZE=10
DATABASE_POOL_MAX_OVERFLOW=20
```

2. **Timeout Settings**:
```python
REQUEST_TIMEOUT_SECONDS=30
UVICORN_TIMEOUT=300
```

3. **GZip Compression**:
```python
# Automatically enabled in render_config.py
app.add_middleware(GZipMiddleware, minimum_size=1000)
```

### Frontend Optimizations

1. **Next.js Configuration** (`next.config.js`):
```javascript
module.exports = {
  output: 'standalone',
  compress: true,
  images: {
    domains: ['your-backend.onrender.com', 'supabase.co'],
  },
  experimental: {
    optimizeCss: true,
    optimizeImages: true,
  }
}
```

2. **Vercel Configuration** (`vercel.json`):
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "https://your-backend.onrender.com/api/$1"
    }
  ]
}
```

---

## 🔍 Troubleshooting

### Common Issues & Solutions

#### **Backend Issues**

**Port binding error:**
- Ensure `runtime.txt` specifies `python-3.13.7`
- Check that `PORT` environment variable is used in `main.py`

**Database connection failed:**
- Verify `DATABASE_URL` is correct
- Ensure Supabase project is active
- Check SSL settings in `render_config.py`

**Health check fails:**
- Check logs for startup errors
- Verify AI API keys are set
- Ensure database tables exist

#### **Frontend Issues**

**Build fails:**
- Check Node.js version compatibility (v18+)
- Ensure all dependencies are in `package.json`
- Verify environment variables are set

**API calls fail:**
- Check Supabase configuration
- Verify API keys are set correctly
- Check CORS settings in backend

**Static assets not loading:**
- Verify `Publish Directory` is set to `frontend/out`
- Check build command includes `npm run build`

---

## 📊 Monitoring & Maintenance

### Health Checks
- **Backend**: Monitor `/health` and `/ready` endpoints
- **Frontend**: Set up uptime monitoring on main page
- **Database**: Check Supabase dashboard for performance

### Logs
- **Backend**: Render dashboard logs + structured logging
- **Frontend**: Browser console + Render static site logs
- **Alerts**: Set up email notifications for errors

### Scaling
- **Backend**: Monitor CPU/RAM usage, scale instances as needed
- **Frontend**: Render automatically scales static sites
- **Database**: Monitor Supabase performance metrics

---

## 🔄 Deployment Workflow

### Version 1.1.3 Deployment Process

1. **Code Preparation**:
```bash
# Update version numbers
sed -i 's/1.1.4/1.1.3/g' backend/main.py frontend/package.json

# Test locally
cd backend && python render_deploy.py
cd ../frontend && npm run build
```

2. **Commit & Push**:
```bash
git add .
git commit -m "v1.1.3: Render deployment ready"
git tag v1.1.3
git push origin main --tags
```

3. **Monitor Deployment**:
- Watch Render dashboard for build logs
- Verify health checks pass
- Test all functionality

4. **Rollback Plan**:
```bash
# If needed, rollback to previous version
git revert v1.1.3
git push origin main
```

---

## 🎯 Success Criteria

### Deployment Success (v1.1.3)
- ✅ **Zero deployment errors**
- ✅ **All health checks passing**
- ✅ **Version 1.1.3 displayed**
- ✅ **SSL certificates valid**
- ✅ **Backend responds in < 500ms**
- ✅ **Frontend loads in < 2s**

### Production Success (First 24 hours)
- ✅ **Response time < 500ms (P95)**
- ✅ **Error rate < 1%**
- ✅ **User authentication working**
- ✅ **Chat functionality operational**
- ✅ **No security incidents**

---

## 📚 Additional Resources

- **Render Documentation**: [https://render.com/docs](https://render.com/docs)
- **FastAPI Documentation**: [https://fastapi.tiangolo.com](https://fastapi.tiangolo.com)
- **Next.js Documentation**: [https://nextjs.org/docs](https://nextjs.org/docs)
- **Supabase Documentation**: [https://supabase.com/docs](https://supabase.com/docs)

---

**🎉 Your ASTRAMIND v1.1.3 application is now ready for production deployment on Render!**

**Deployment Status**: ✅ **READY FOR PRODUCTION**
**Version**: v1.1.3
**Target**: Render (Backend + Frontend)
**Status**: All systems operational
