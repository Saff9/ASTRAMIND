# Production Deployment Guide

Comprehensive guide for deploying ASTRAMIND Backend to production with 100k+ concurrent user support.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Infrastructure Architecture](#infrastructure-architecture)
3. [Kubernetes Deployment](#kubernetes-deployment)
4. [Docker Configuration](#docker-configuration)
5. [Database Setup](#database-setup)
6. [Monitoring & Observability](#monitoring--observability)
7. [Security Configuration](#security-configuration)
8. [Performance Tuning](#performance-tuning)
9. [Scaling Strategies](#scaling-strategies)
10. [CI/CD Pipeline](#cicd-pipeline)
11. [Disaster Recovery](#disaster-recovery)
12. [Cost Optimization](#cost-optimization)

## Prerequisites

### Required Tools
- Kubernetes cluster (v1.25+)
- Helm 3.10+
- Docker 20.10+
- Terraform 1.3+
- kubectl
- AWS/GCP/Azure CLI (depending on cloud provider)

### Environment Variables
```bash
# Database
DATABASE_URL="postgresql://user:pass@host:port/db"
DATABASE_POOL_SIZE=50
DATABASE_POOL_MAX_OVERFLOW=100

# Security
JWT_SECRET="your-super-secret-jwt-key-here"
ALLOWED_ORIGINS="https://yourdomain.com,https://app.yourdomain.com"

# AI Providers
GROQ_API_KEYS="key1,key2,key3"
OPENROUTER_API_KEYS="key1,key2,key3"
HUGGINGFACE_API_KEY="your-hf-key"

# Monitoring
ENABLE_METRICS=true
PROMETHEUS_URL="http://prometheus:9090"
GRAFANA_URL="http://grafana:3000"

# Performance
MAX_REQUEST_SIZE=10485760  # 10MB
REQUEST_TIMEOUT=30
RATE_LIMIT_PER_MINUTE=1000
```

## Infrastructure Architecture

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   API Gateway   │    │   CDN (Static)  │
│   (Cloudflare)  │    │   (NGINX)       │    │   (Cloudflare)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Rate Limiter  │
                    │   (Redis)       │
                    └─────────────────┘
                                 │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
┌─────────────┐        ┌─────────────┐        ┌─────────────┐
│ Chat Service│        │ Auth Service│        │ User Service│
│   (FastAPI) │        │   (FastAPI) │        │   (FastAPI) │
│   Replicas: │        │   Replicas: │        │   Replicas: │
│   10-50     │        │   3-5       │        │   3-5       │
└─────────────┘        └─────────────┘        └─────────────┘
        │                         │                         │
        └─────────────────────────┼─────────────────────────┘
                                 │
                    ┌─────────────────┐
                    │     Redis       │
                    │   (Cache/Queue) │
                    │   Cluster       │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │   PostgreSQL    │
                    │   (Primary DB)  │
                    │   RDS/Aurora    │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Object Store  │
                    │   (S3/GCS)      │
                    └─────────────────┘
```

### Network Topology
- **VPC**: Private subnets for services, public subnets for load balancers
- **Security Groups**: Restrictive inbound/outbound rules
- **VPN/Peering**: Secure connections between environments
- **CDN**: Global content delivery with edge caching

## Kubernetes Deployment

### 1. Cluster Setup

#### Recommended Cluster Configuration
```yaml
# cluster-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-config
data:
  node-count: "20"
  node-type: "t3.large"  # or equivalent
  autoscaling-min: "10"
  autoscaling-max: "100"
  region: "us-east-1"
```

#### Node Pools Configuration
```yaml
# node-pools.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: node-pools
data:
  general-purpose: |
    min_nodes: 5
    max_nodes: 50
    instance_type: t3.large
    labels: "workload=general-purpose"
  
  high-memory: |
    min_nodes: 2
    max_nodes: 20
    instance_type: r6.large
    labels: "workload=high-memory"
  
  gpu-workers: |
    min_nodes: 1
    max_nodes: 10
    instance_type: g4dn.xlarge
    labels: "workload=gpu"
```

### 2. Namespace and RBAC

```yaml
# 01-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: ASTRAMIND-ai-prod
  labels:
    environment: production
    app: ASTRAMIND-ai

---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: ASTRAMIND-ai-prod
  name: app-role
rules:
- apiGroups: [""]
  resources: ["pods", "services", "endpoints"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets"]
  verbs: ["get", "list", "watch"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: app-rolebinding
  namespace: ASTRAMIND-ai-prod
subjects:
- kind: ServiceAccount
  name: default
  namespace: ASTRAMIND-ai-prod
roleRef:
  kind: Role
  name: app-role
  apiGroup: rbac.authorization.k8s.io
```

### 3. ConfigMaps and Secrets

```yaml
# 02-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: ASTRAMIND-ai-prod
data:
  ENV: "production"
  LOG_LEVEL: "INFO"
  MAX_REQUEST_SIZE: "10485760"
  REQUEST_TIMEOUT: "30"
  RATE_LIMIT_PER_MINUTE: "1000"
  JWT_ALGORITHM: "HS256"
  JWT_EXPIRATION_HOURS: "24"

---
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: ASTRAMIND-ai-prod
type: Opaque
stringData:
  JWT_SECRET: "your-super-secret-jwt-key-here"
  DATABASE_URL: "postgresql://user:pass@host:port/db"
  GROQ_API_KEYS: "key1,key2,key3"
  OPENROUTER_API_KEYS: "key1,key2,key3"
  HUGGINGFACE_API_KEY: "your-hf-key"
```

### 4. Database Deployment

```yaml
# 03-database.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-db
  namespace: ASTRAMIND-ai-prod
spec:
  serviceName: postgres-service
  replicas: 3
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15
        env:
        - name: POSTGRES_DB
          value: "ASTRAMINDai"
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: DB_USER
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: DB_PASSWORD
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: "2Gi"
            cpu: "500m"
          limits:
            memory: "8Gi"
            cpu: "2000m"
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
      storageClassName: "gp2"

---
apiVersion: v1
kind: Service
metadata:
  name: postgres-service
  namespace: ASTRAMIND-ai-prod
spec:
  selector:
    app: postgres
  ports:
  - protocol: TCP
    port: 5432
    targetPort: 5432
  type: ClusterIP
```

### 5. Redis Deployment

```yaml
# 04-redis.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-cluster
  namespace: ASTRAMIND-ai-prod
spec:
  serviceName: redis-service
  replicas: 3
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        command:
        - redis-server
        - /etc/redis/redis.conf
        - --appendonly
        - "yes"
        ports:
        - containerPort: 6379
        volumeMounts:
        - name: redis-storage
          mountPath: /data
        - name: redis-config
          mountPath: /etc/redis
        resources:
          requests:
            memory: "1Gi"
            cpu: "250m"
          limits:
            memory: "4Gi"
            cpu: "1000m"
  volumeClaimTemplates:
  - metadata:
      name: redis-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 50Gi
      storageClassName: "gp2"

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-config
  namespace: ASTRAMIND-ai-prod
data:
  redis.conf: |
    maxmemory 2gb
    maxmemory-policy allkeys-lru
    appendonly yes
    appendfsync everysec

---
apiVersion: v1
kind: Service
metadata:
  name: redis-service
  namespace: ASTRAMIND-ai-prod
spec:
  selector:
    app: redis
  ports:
  - protocol: TCP
    port: 6379
    targetPort: 6379
  type: ClusterIP
```

### 6. Application Deployment

```yaml
# 05-application.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ASTRAMIND-ai-backend
  namespace: ASTRAMIND-ai-prod
  labels:
    app: ASTRAMIND-ai-backend
    version: v1.1.4
spec:
  replicas: 10
  selector:
    matchLabels:
      app: ASTRAMIND-ai-backend
  template:
    metadata:
      labels:
        app: ASTRAMIND-ai-backend
        version: v1.1.4
    spec:
      containers:
      - name: backend
        image: ASTRAMINDai/backend:v1.1.4
        ports:
        - containerPort: 8000
        envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: app-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
        startupProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 10
          periodSeconds: 5
          failureThreshold: 30
      nodeSelector:
        workload: general-purpose
      tolerations:
      - key: "workload"
        operator: "Equal"
        value: "general-purpose"
        effect: "NoSchedule"

---
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  namespace: ASTRAMIND-ai-prod
spec:
  selector:
    app: ASTRAMIND-ai-backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8000
  type: ClusterIP

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: backend-ingress
  namespace: ASTRAMIND-ai-prod
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/rate-limit: "1000"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
    nginx.ingress.kubernetes.io/enable-cors: "true"
    nginx.ingress.kubernetes.io/cors-allow-methods: "GET, POST, PUT, DELETE, OPTIONS"
    nginx.ingress.kubernetes.io/cors-allow-headers: "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization"
    nginx.ingress.kubernetes.io/cors-allow-credentials: "true"
spec:
  tls:
  - hosts:
    - api.yourdomain.com
    secretName: ASTRAMIND-ai-tls
  rules:
  - host: api.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: backend-service
            port:
              number: 80
```

### 7. Horizontal Pod Autoscaler

```yaml
# 06-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ASTRAMIND-ai-hpa
  namespace: ASTRAMIND-ai-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ASTRAMIND-ai-backend
  minReplicas: 10
  maxReplicas: 100
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
      - type: Pods
        value: 5
        periodSeconds: 60
      selectPolicy: Min
```

## Docker Configuration

### Multi-Stage Dockerfile

```dockerfile
# Dockerfile
# Build stage
FROM python:3.11-slim as builder

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Production stage
FROM python:3.11-slim as production

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Set working directory
WORKDIR /app

# Copy Python dependencies from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p /app/logs /app/temp && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health', timeout=5)"

# Expose port
EXPOSE 8000

# Start command
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

### Docker Compose for Development

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Database
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: ASTRAMINDai
      POSTGRES_USER: ASTRAMINDai
      POSTGRES_PASSWORD: ASTRAMINDai123
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ASTRAMINDai"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Backend
  backend:
    build: .
    environment:
      DATABASE_URL: postgresql://ASTRAMINDai:ASTRAMINDai123@postgres:5432/ASTRAMINDai
      REDIS_URL: redis://redis:6379
      JWT_SECRET: dev-secret-key
      LOG_LEVEL: DEBUG
    volumes:
      - ./backend:/app
    ports:
      - "8000:8000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  # Frontend (if needed)
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8000
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

## Database Setup

### PostgreSQL Production Configuration

```sql
-- production-db-setup.sql
-- Create database and users
CREATE DATABASE ASTRAMINDai_prod;
CREATE DATABASE ASTRAMINDai_staging;
CREATE DATABASE ASTRAMINDai_dev;

-- Create application user
CREATE USER ASTRAMINDai_app WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE ASTRAMINDai_prod TO ASTRAMINDai_app;
GRANT ALL PRIVILEGES ON DATABASE ASTRAMINDai_staging TO ASTRAMINDai_app;

-- Enable required extensions
\c ASTRAMINDai_prod
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Optimize settings
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;

-- Restart PostgreSQL to apply changes
-- SELECT pg_reload_conf();
```

### Database Backup Strategy

```bash
#!/bin/bash
# backup-db.sh

BACKUP_DIR="/backups/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="ASTRAMINDai_prod"
BACKUP_FILE="$BACKUP_DIR/ASTRAMINDai_prod_$DATE.sql"

# Create backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME -f $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Upload to cloud storage (example for AWS S3)
aws s3 cp ${BACKUP_FILE}.gz s3://ASTRAMINDai-backups/daily/

# Keep only last 30 days
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
```

### Database Monitoring Queries

```sql
-- Check connection count
SELECT count(*) FROM pg_stat_activity;

-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Check table sizes
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size(tablename::regclass)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(tablename::regclass) DESC;

-- Check index usage
SELECT 
    t.tablename,
    indexname,
    c.reltuples AS num_rows,
    pg_size_pretty(pg_relation_size(quote_ident(t.tablename)::regclass)) AS table_size,
    pg_size_pretty(pg_relation_size(quote_ident(t.tablename)::regclass, 'i')) AS index_size,
    CASE WHEN indisunique THEN 'Y' ELSE 'N' END AS unique,
    idx_scan AS number_of_scans,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched
FROM pg_tables t
LEFT OUTER JOIN pg_class c ON c.relname = t.tablename
LEFT OUTER JOIN (
    SELECT c.relname AS ctablename, ipg.relname AS indexname, x.indnatts AS number_of_columns, idx_scan, idx_tup_read, idx_tup_fetch, indexrelname, indisunique
    FROM pg_index x
    JOIN pg_class c ON c.oid = x.indrelid
    JOIN pg_class ipg ON ipg.oid = x.indexrelid
    JOIN pg_stat_user_indexes psui ON x.indexrelid = psui.indexrelid
) AS foo ON t.tablename = foo.ctablename
WHERE t.schemaname = 'public'
ORDER BY 1, 2;
```

## Monitoring & Observability

### Prometheus Configuration

```yaml
# prometheus-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s
    
    rule_files:
      - "alert_rules.yml"
    
    scrape_configs:
      - job_name: 'kubernetes-pods'
        kubernetes_sd_configs:
        - role: pod
          namespaces:
            names:
            - ASTRAMIND-ai-prod
        relabel_configs:
        - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
          action: keep
          regex: true
        - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
          action: replace
          target_label: __metrics_path__
          regex: (.+)
      
      - job_name: 'kubernetes-service-endpoints'
        kubernetes_sd_configs:
        - role: endpoints
        relabel_configs:
        - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_scrape]
          action: keep
          regex: true
    
    alerting:
      alertmanagers:
        - static_configs:
            - targets:
              - alertmanager:9093

  alert_rules.yml: |
    groups:
    - name: ASTRAMIND-ai-alerts
      rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"
      
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }}s"
      
      - alert: DatabaseConnectionPoolExhausted
        expr: pg_stat_database_numbackends / pg_settings_max_connections > 0.8
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Database connection pool nearly exhausted"
          description: "Connection pool usage is {{ $value | humanizePercentage }}"
```

### Grafana Dashboards

```json
{
  "dashboard": {
    "id": null,
    "title": "ASTRAMIND Backend Monitoring",
    "tags": ["ASTRAMIND-ai", "production"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{status}}"
          }
        ],
        "yAxes": [
          {
            "label": "Requests/sec"
          }
        ]
      },
      {
        "id": 2,
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "50th percentile"
          }
        ]
      },
      {
        "id": 3,
        "title": "Error Rate",
        "type": "singlestat",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m]) / rate(http_requests_total[5m]) * 100"
          }
        ],
        "format": "percent"
      },
      {
        "id": 4,
        "title": "Database Connections",
        "type": "graph",
        "targets": [
          {
            "expr": "pg_stat_database_numbackends",
            "legendFormat": "Active connections"
          },
          {
            "expr": "pg_settings_max_connections",
            "legendFormat": "Max connections"
          }
        ]
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "30s"
  }
}
```

### Application Metrics Endpoint

```python
# metrics-endpoint.py
from fastapi import APIRouter, Depends
from core.monitoring import get_detailed_health_status
from core.security import require_admin

router = APIRouter()

@router.get("/metrics")
async def get_metrics():
    """Prometheus-compatible metrics endpoint."""
    health = get_detailed_health_status()
    
    metrics = []
    
    # System metrics
    metrics.append(f'ASTRAMINDai_system_cpu_usage {health["cpu_usage"]}')
    metrics.append(f'ASTRAMINDai_system_memory_usage {health["memory_usage"]}')
    metrics.append(f'ASTRAMINDai_system_disk_usage {health["disk_usage"]}')
    
    # Application metrics
    app_metrics = health["app_metrics"]
    for key, value in app_metrics.items():
        metrics.append(f'ASTRAMINDai_app_{key} {value}')
    
    # Request metrics
    metrics.append(f'ASTRAMINDai_active_requests {health["active_requests"]}')
    metrics.append(f'ASTRAMINDai_slow_requests {health["slow_requests"]}')
    metrics.append(f'ASTRAMINDai_error_rate_5min {health["error_rate_5min"]}')
    
    return "\n".join(metrics)

@router.get("/health/detailed")
async def detailed_health_check():
    """Detailed health check for monitoring systems."""
    return get_detailed_health_status()
```

## Security Configuration

### Network Security

```yaml
# network-policies.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-ingress
  namespace: ASTRAMIND-ai-prod
spec:
  podSelector: {}
  policyTypes:
  - Ingress

---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ingress
  namespace: ASTRAMIND-ai-prod
spec:
  podSelector:
    matchLabels:
      app: ASTRAMIND-ai-backend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 8000
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - podSelector:
        matchLabels:
          app: redis
    ports:
    - protocol: TCP
      port: 6379
  - to: []
    ports:
    - protocol: TCP
      port: 443
    - protocol: TCP
      port: 80
```

### Pod Security Standards

```yaml
# pod-security.yaml
apiVersion: v1
kind: PodSecurityPolicy
metadata:
  name: restricted-psp
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    - 'persistentVolumeClaim'
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
  readOnlyRootFilesystem: true
  allowedProcMountTypes:
    - 'Default'

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: restricted-psp-role
rules:
- apiGroups: ['policy']
  resources: ['podsecuritypolicies']
  verbs:     ['use']
  resourceNames:
  - restricted-psp

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: restricted-psp-binding
roleRef:
  kind: ClusterRole
  name: restricted-psp-role
  apiGroup: rbac.authorization.k8s.io
subjects:
- kind: Group
  name: system:serviceaccounts:ASTRAMIND-ai-prod
  apiGroup: rbac.authorization.k8s.io
```

### Secrets Management

```yaml
# sealed-secrets.yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: app-secrets
  namespace: ASTRAMIND-ai-prod
  annotations:
    sealedsecrets.bitnami.com/cluster-wide: "true"
spec:
  encryptedData:
    JWT_SECRET: AgBy3i4OJSWZ2h3qKXntUPZvKLL1PdsQcWzfNioNDTUa9kCAvubTjkCKyiSZ6C7M0VJwFP3P8JBPovF5C39EX2Mk+1f6d9yA9yGSCiMj26cR9qnn0Z6wrCFvb8Gu74cKXzxT0nO1oyz+Ea4WVQTAW1oC52CAZAgMBAAECggEBAK0N2J1+...
    DATABASE_URL: AgBy3i4OJSWZ2h3qKXntUPZvKLL1PdsQcWzfNioNDTUa9kCAvubTjkCKyiSZ6C7M0VJwFP3P8JBPovF5C39EX2Mk+1f6d9yA9yGSCiMj26cR9qnn0Z6wrCFvb8Gu74cKXzxT0nO1oyz+Ea4WVQTAW1oC52CAZAgMBAAECggEBAK0N2J1+...
```

### TLS Configuration

```yaml
# tls-config.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@yourdomain.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: backend-ingress
  namespace: ASTRAMIND-ai-prod
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/ssl-protocols: "TLSv1.2 TLSv1.3"
    nginx.ingress.kubernetes.io/ssl-ciphers: "ECDHE-ECDSA-AES128-GCM-SHA256,ECDHE-RSA-AES128-GCM-SHA256,ECDHE-ECDSA-AES256-GCM-SHA384,ECDHE-RSA-AES256-GCM-SHA384"
spec:
  tls:
  - hosts:
    - api.yourdomain.com
    secretName: ASTRAMIND-ai-tls
  rules:
  - host: api.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: backend-service
            port:
              number: 80
```

## Performance Tuning

### Application-Level Optimizations

```python
# performance-config.py
import uvicorn
from fastapi import FastAPI
from starlette.middleware.gzip import GZipMiddleware
from starlette.middleware.cors import CORSMiddleware

def create_app():
    app = FastAPI(
        title="ASTRAMIND Backend",
        version="1.1.4",
        docs_url="/docs",
        redoc_url="/redoc",
    )
    
    # Enable compression
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    
    # CORS optimization
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["https://yourdomain.com"],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["*"],
        max_age=86400,  # 24 hours
    )
    
    # Request/response optimization
    @app.middleware("http")
    async def add_process_time_header(request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        return response
    
    return app

# Uvicorn configuration
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        workers=4,  # CPU cores * 2
        loop="uvloop",  # Faster event loop
        http="httptools",  # Faster HTTP parser
        log_level="info",
        access_log=False,  # Disable for performance
    )
```

### Database Performance

```sql
-- Index optimization
CREATE INDEX CONCURRENTLY idx_messages_chat_created 
ON messages(chat_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_users_email_quota 
ON users(email, daily_quota);

CREATE INDEX CONCURRENTLY idx_chats_user_workspace 
ON chats(user_id, workspace_id);

-- Connection pooling optimization
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '512MB';
ALTER SYSTEM SET effective_cache_size = '2GB';
ALTER SYSTEM SET maintenance_work_mem = '128MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;
ALTER SYSTEM SET work_mem = '4MB';

-- Restart required for some settings
```

### Redis Optimization

```yaml
# redis-optimization.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
tcp-keepalive 300
timeout 0
tcp-backlog 511
databases 16
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
slave-serve-stale-data yes
slave-read-only yes
repl-diskless-sync no
repl-diskless-sync-delay 5
repl-disable-tcp-nodelay no
repl-backlog-size 1mb
repl-backlog-ttl 3600
maxclients 10000
lazyfree-lazy-eviction no
lazyfree-lazy-expire no
lazyfree-lazy-server-del no
slave-lazy-flush no
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec
no-appendfsync-on-rewrite no
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
aof-load-truncated yes
aof-use-rdb-preamble no
lua-time-limit 5000
slowlog-log-slower-than 10000
slowlog-max-len 128
latency-monitor-threshold 0
notify-keyspace-events "Ex"
hash-max-ziplist-entries 512
hash-max-ziplist-value 64
list-max-ziplist-size -2
list-compress-depth 0
set-max-intset-entries 512
zset-max-ziplist-entries 128
zset-max-ziplist-value 64
hll-sparse-max-bytes 3000
stream-node-max-bytes 4096
stream-node-max-entries 100
activerehashing yes
client-output-buffer-limit normal 0 0 0
client-output-buffer-limit replica 256mb 64mb 60
client-output-buffer-limit pubsub 32mb 8mb 60
hz 10
dynamic-hz yes
aof-rewrite-incremental-fsync yes
rdb-save-incremental-fsync yes
```

## Scaling Strategies

### Horizontal Pod Autoscaling

```yaml
# advanced-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ASTRAMIND-ai-hpa
  namespace: ASTRAMIND-ai-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ASTRAMIND-ai-backend
  minReplicas: 10
  maxReplicas: 200
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 70
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "100"
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
      - type: Pods
        value: 2
        periodSeconds: 60
      selectPolicy: Min
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
      - type: Pods
        value: 10
        periodSeconds: 60
      selectPolicy: Max
```

### Cluster Autoscaling

```yaml
# cluster-autoscaler.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-autoscaler-status
  namespace: kube-system
data:
  nodes.max: "100"
  nodes.min: "10"
  scale-down-delay-after-add: "10m"
  scale-down-unneeded-time: "10m"
  scale-down-utilization-threshold: "0.5"
  scale-up-cpu-utilization-threshold: "0.7"
  scale-up-memory-utilization-threshold: "0.7"

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cluster-autoscaler
  template:
    metadata:
      labels:
        app: cluster-autoscaler
    spec:
      serviceAccountName: cluster-autoscaler
      containers:
      - image: k8s.gcr.io/autoscaling/cluster-autoscaler:v1.25.0
        name: cluster-autoscaler
        command:
        - ./cluster-autoscaler
        - --v=4
        - --stderrthreshold=info
        - --cloud-provider=aws
        - --skip-nodes-with-local-storage=false
        - --expander=least-waste
        - --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/ASTRAMIND-ai-prod
        - --balance-similar-node-groups
        - --scale-down-enabled=true
        - --scale-down-delay-after-add=10m
        - --scale-down-unneeded-time=10m
        - --scale-down-utilization-threshold=0.5
        - --scale-up-cpu-utilization-threshold=0.7
        - --scale-up-memory-utilization-threshold=0.7
        volumeMounts:
        - name: ssl-certs
          mountPath: /etc/ssl/certs/ca-certificates.crt
          readOnly: true
        imagePullPolicy: "Always"
      volumes:
      - name: ssl-certs
        hostPath:
          path: "/etc/ssl/certs/ca-certificates.crt"
```

### Database Scaling

```yaml
# database-scaling.yaml
# Read replicas for PostgreSQL
apiVersion: v1
kind: Service
metadata:
  name: postgres-read
  namespace: ASTRAMIND-ai-prod
spec:
  selector:
    app: postgres-read
  ports:
  - protocol: TCP
    port: 5432
    targetPort: 5432

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres-read-replica
  namespace: ASTRAMIND-ai-prod
spec:
  replicas: 2
  selector:
    matchLabels:
      app: postgres-read
  template:
    metadata:
      labels:
        app: postgres-read
    spec:
      containers:
      - name: postgres
        image: postgres:15
        env:
        - name: PG_PRIMARY_HOST
          value: "postgres-service"
        - name: PG_MODE
          value: "slave"
        - name: PG_DATABASE
          value: "ASTRAMINDai"
        - name: PG_USER
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: DB_USER
        - name: PG_PASSWORD
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: DB_PASSWORD
        ports:
        - containerPort: 5432
        resources:
          requests:
            memory: "2Gi"
            cpu: "500m"
          limits:
            memory: "4Gi"
            cpu: "1000m"
```

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r backend/requirements.txt
        pip install pytest pytest-cov
    
    - name: Run tests
      run: pytest backend/tests/ -v --cov=backend
    
    - name: Security scan
      run: |
        pip install bandit safety
        bandit -r backend/
        safety check -r backend/requirements.txt

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    
    steps:
    - name: Checkout repository
      uses: actions/checkout@v3
    
    - name: Log in to Container Registry
      uses: docker/login-action@v2
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    
    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v4
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=sha,prefix={{branch}}-
          type=raw,value=latest,enable={{is_default_branch}}
    
    - name: Build and push Docker image
      uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        cache-from: type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:buildcache
        cache-to: type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:buildcache,mode=max

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    environment: production
    if: github.ref == 'refs/heads/main'
    
    steps:
    - name: Checkout repository
      uses: actions/checkout@v3
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-east-1
    
    - name: Configure kubectl
      run: aws eks update-kubeconfig --name ASTRAMIND-ai-cluster
    
    - name: Deploy to Kubernetes
      run: |
        kubectl set image deployment/ASTRAMIND-ai-backend backend=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
        kubectl rollout status deployment/ASTRAMIND-ai-backend -n ASTRAMIND-ai-prod
    
    - name: Run smoke tests
      run: |
        kubectl run smoke-test --image=curlimages/curl --rm -i --restart=Never -- \
          curl -f http://backend-service.ASTRAMIND-ai-prod.svc.cluster.local/health
```

### Terraform Infrastructure

```hcl
# terraform/main.tf
terraform {
  required_version = ">= 1.3.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.20"
    }
  }
  
  backend "s3" {
    bucket = "ASTRAMIND-ai-terraform-state"
    key    = "production/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
}

provider "kubernetes" {
  host                   = data.aws_eks_cluster.cluster.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority[0].data)
  
  token = data.aws_eks_cluster_auth.cluster.token
}

# VPC
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  
  name = "ASTRAMIND-ai-vpc"
  cidr = "10.0.0.0/16"
  
  azs             = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  
  enable_nat_gateway = true
  enable_vpn_gateway = true
  
  tags = {
    Environment = "production"
    Project     = "ASTRAMIND-ai"
  }
}

# EKS Cluster
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"
  
  cluster_name    = "ASTRAMIND-ai-prod"
  cluster_version = "1.27"
  subnets         = module.vpc.private_subnets
  
  vpc_id = module.vpc.vpc_id
  
  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
    }
  }
  
  node_groups = {
    general_purpose = {
      desired_size = 10
      max_size     = 50
      min_size     = 5
      
      instance_type = "t3.large"
      ami_type      = "AL2_x86_64
      
      additional_tags = {
        Environment = "production"
        Team        = "platform"
      }
    }
    
    high_memory = {
      desired_size = 4
      max_size     = 20
      min_size     = 2
      
      instance_type = "r6.large"
      ami_type      = "AL2_x86_64"
      
      additional_tags = {
        Environment = "production"
        Team        = "platform"
        Workload    = "high-memory"
      }
    }
  }
  
  tags = {
    Environment = "production"
    Project     = "ASTRAMIND-ai"
  }
}

# RDS PostgreSQL
resource "aws_db_instance" "postgres" {
  identifier = "ASTRAMIND-ai-prod"
  
  engine         = "postgres"
  engine_version = "15.3"
  instance_class = "db.m5.large"
  
  allocated_storage     = 100
  max_allocated_storage = 1000
  storage_type          = "gp2"
  storage_encrypted     = true
  
  db_name  = "ASTRAMINDai"
  username = var.db_username
  password = var.db_password
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  skip_final_snapshot = false
  final_snapshot_identifier = "ASTRAMIND-ai-prod-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"
  
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  
  performance_insights_enabled = true
  performance_insights_retention_period = 7
  
  tags = {
    Environment = "production"
    Project     = "ASTRAMIND-ai"
  }
}

# Redis (Elasticache)
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "ASTRAMIND-ai-prod"
  description                = "ASTRAMIND Redis Cluster"
  
  port               = 6379
  parameter_group_name = "default.redis7"
  
  node_type = "cache.t3.medium"
  num_cache_clusters = 3
  
  subnet_group_name = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  
  snapshot_retention_limit = 5
  snapshot_window         = "03:00-05:00"
  
  tags = {
    Environment = "production"
    Project     = "ASTRAMIND-ai"
  }
}
```

## Disaster Recovery

### Backup Strategy

```bash
#!/bin/bash
# disaster-recovery-backup.sh

# Database backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME | gzip > /backups/db_$(date +%Y%m%d_%H%M%S).sql.gz

# Application data backup (files, uploads)
tar -czf /backups/app_data_$(date +%Y%m%d_%H%M%S).tar.gz /app/uploads /app/temp

# Configuration backup
kubectl get all --all-namespaces -o yaml > /backups/k8s_config_$(date +%Y%m%d_%H%M%S).yaml
kubectl get secrets --all-namespaces -o yaml > /backups/k8s_secrets_$(date +%Y%m%d_%H%M%S).yaml

# Upload to multiple regions
aws s3 cp /backups/ s3://ASTRAMIND-ai-backups-us-east-1/ --recursive --storage-class STANDARD_IA
aws s3 cp /backups/ s3://ASTRAMIND-ai-backups-us-west-2/ --recursive --storage-class STANDARD_IA

# Clean up local backups older than 7 days
find /backups -name "*.gz" -mtime +7 -delete
```

### Recovery Procedure

```bash
#!/bin/bash
# disaster-recovery-restore.sh

# Restore database
gunzip -c /backups/db_YYYYMMDD_HHMMSS.sql.gz | psql -h $DB_HOST -U $DB_USER -d $DB_NAME

# Restore application data
tar -xzf /backups/app_data_YYYYMMDD_HHMMSS.tar.gz -C /app/

# Restore Kubernetes configuration
kubectl apply -f /backups/k8s_config_YYYYMMDD_HHMMSS.yaml
kubectl apply -f /backups/k8s_secrets_YYYYMMDD_HHMMSS.yaml

# Verify restoration
kubectl get pods -n ASTRAMIND-ai-prod
curl -f http://api.yourdomain.com/health
```

### Multi-Region Setup

```yaml
# multi-region-deployment.yaml
# Primary region (us-east-1)
apiVersion: v1
kind: Namespace
metadata:
  name: ASTRAMIND-ai-prod-us-east-1

---
# Secondary region (us-west-2)
apiVersion: v1
kind: Namespace
metadata:
  name: ASTRAMIND-ai-prod-us-west-2

---
# Global load balancer configuration
apiVersion: networking.gke.io/v1
kind: ManagedCertificate
metadata:
  name: ASTRAMIND-ai-tls
spec:
  domains:
    - api.yourdomain.com

---
apiVersion: networking.gke.io/v1beta1
kind: MultiClusterIngress
metadata:
  name: ASTRAMIND-ai-global-ingress
spec:
  template:
    spec:
      backend:
        serviceName: ASTRAMIND-ai-backend
        servicePort: 80
  defaultBackend:
    service:
      name: ASTRAMIND-ai-backend
      port:
        number: 80
  rules:
  - host: api.yourdomain.com
    http:
      paths:
      - path: /*
        backend:
          serviceName: ASTRAMIND-ai-backend
          servicePort: 80
```

## Cost Optimization

### Resource Optimization

```yaml
# resource-optimization.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: resource-limits
  namespace: ASTRAMIND-ai-prod
spec:
  limits:
  - default:
      cpu: "500m"
      memory: "1Gi"
    defaultRequest:
      cpu: "250m"
      memory: "512Mi"
    type: Container

---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-resources
  namespace: ASTRAMIND-ai-prod
spec:
  hard:
    requests.cpu: "50"
    requests.memory: 100Gi
    limits.cpu: "100"
    limits.memory: 200Gi
    persistentvolumeclaims: "20"

---
# Spot instances for cost savings
apiVersion: v1
kind: ConfigMap
metadata:
  name: spot-instances-config
  namespace: ASTRAMIND-ai-prod
data:
  use-spot-instances: "true"
  spot-instance-percentage: "50"
  on-demand-base-capacity: "5"
```

### Monitoring Cost Optimization

```python
# cost-monitoring.py
import boto3
import requests
from datetime import datetime, timedelta

def get_cost_analysis():
    """Get cost analysis from AWS Cost Explorer."""
    client = boto3.client('ce')
    
    end_date = datetime.utcnow().strftime('%Y-%m-%d')
    start_date = (datetime.utcnow() - timedelta(days=30)).strftime('%Y-%m-%d')
    
    response = client.get_cost_and_usage(
        TimePeriod={
            'Start': start_date,
            'End': end_date
        },
        Granularity='DAILY',
        Metrics=['UnblendedCost'],
        GroupBy=[
            {
                'Type': 'DIMENSION',
                'Key': 'SERVICE'
            }
        ]
    )
    
    return response['ResultsByTime']

def optimize_resources():
    """Optimize resources based on usage patterns."""
    # Get current resource usage
    # Analyze usage patterns
    # Recommend optimizations
    pass

if __name__ == "__main__":
    costs = get_cost_analysis()
    print(f"Monthly cost: ${sum(float(day['Total']['UnblendedCost']['Amount']) for day in costs)}")
```

### Auto-Scaling Cost Optimization

```yaml
# cost-optimized-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ASTRAMIND-ai-cost-optimized-hpa
  namespace: ASTRAMIND-ai-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ASTRAMIND-ai-backend
  minReplicas: 5    # Lower minimum for cost savings
  maxReplicas: 50   # Lower maximum to control costs
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 80  # Higher threshold for cost optimization
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 600  # Longer stabilization for cost savings
      policies:
      - type: Percent
        value: 20
        periodSeconds: 120
    scaleUp:
      stabilizationWindowSeconds: 120
      policies:
      - type: Percent
        value: 100  # Aggressive scaling up
        periodSeconds: 60
```

This comprehensive deployment guide provides everything needed to deploy ASTRAMIND Backend to production with enterprise-grade reliability, security, and scalability for 100k+ concurrent users.
