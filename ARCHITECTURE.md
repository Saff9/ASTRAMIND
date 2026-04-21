# 🏛️ ASTRAMIND - System Architecture & Scalability

This document outlines the technical architecture of ASTRAMIND and the roadmap for scaling to 1 million users.

---

## 🏗️ Core Architecture (Current v1.1.5)

ASTRAMIND is built using a modern, asynchronous micro-architecture designed for resilience and performance.

### 1. Global Components
*   **Edge Layer**: Cloudflare (CDN, WAF, DDoS Protection).
*   **Frontend**: Next.js (React) deployed on Vercel or Render. Uses server-side rendering (SSR) for initial loads and client-side transitions for chat.
*   **Backend**: FastAPI (Python 3.13) Web Service. Fully asynchronous with connection pooling and non-blocking IO.
*   **Database**: PostgreSQL (Structured data, Users, Chats) + Redis (Optional caching/rate-limiting).

### 2. The AIRouter (Orchestration Layer)
The heart of ASTRAMIND is the custom `AIRouter`. It manages:
*   **Multi-Provider Fallback**: Automatically switches between 10+ providers (Groq, OpenRouter, Mistral, etc.) if a primary provider fails.
*   **Circuit Breakers**: Monitors provider health and "opens" the circuit to bypass failing services, protecting the system from cascading failures.
*   **Tiered Model Resolution**: Maps application tiers (`fast`, `balanced`, `smart`) to the best available model/provider combination in real-time.

### 3. Stability Engine
An internal monitoring sub-system that tracks:
*   Real-time error rates across services.
*   Recovery success rates.
*   Active circuit breaker states.
*   System-wide "Stability Score" available via API.

---

## 🚀 Scalability Roadmap

The system is designed to scale horizontally from 10k to 1M+ users.

### Phase 1: Current Scale (10k - 50k Users)
*   **Instance**: Single high-memory Web Service (Render/AWS).
*   **Database**: Managed PostgreSQL instance with connection pooling enabled.
*   **Optimization**: Multi-level localized caching (LRU) for performance.

### Phase 2: Enterprise Scale (100k Concurrent Users)
*   **Infrastructure**: Transition to Kubernetes (Pods: 20-50).
*   **Database**: Primary + Read Replicas. Heavy use of Redis for distributed session and quota management.
*   **Global Delivery**: Regional backend deployments to reduce latency for international users.

### Phase 3: Mass Scale (1M+ Users)
*   **Architecture**: Sharded PostgreSQL clusters (partitioned by User ID).
*   **Edge Compute**: Use of Edge Workers (Cloudflare/Vercel) for rapid content filtering and prompt sanitization.
*   **Intelligence**: Dedicated embedding and fine-tuned models for specialized tasks.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Backend** | Python 3.13, FastAPI, SQLAlchemy, Alembic |
| **Frontend** | Next.js 14, Tailwind CSS, TypeScript |
| **Database** | PostgreSQL (asyncpg), Redis (aioredis) |
| **Security** | JWT, bcrypt, bleach (sanitization), CORS/HSTS |
| **Deployment** | Docker, Render, Vercel |
