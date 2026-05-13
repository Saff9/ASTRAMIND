# 🏛️ ASTRAMIND - System Architecture & Scalability

This document outlines the technical architecture of ASTRAMIND and the roadmap for scaling to 1 million users.

---

## 🏗️ Core Architecture (Current v1.2.0)

ASTRAMIND is built using a modern, asynchronous micro-architecture designed for resilience, performance, and advanced agentic capabilities.

### 1. Global Components
*   **Edge Layer**: Cloudflare (CDN, WAF, DDoS Protection).
*   **Frontend**: Next.js 15 (React) deployed on Vercel. Uses server-side rendering (SSR) for initial loads, client-side transitions for chat, and hardware-accelerated animations.
*   **Backend**: FastAPI (Python 3.13) Web Service. Fully asynchronous with highly optimized memory management (bounded deques, connection pooling).
*   **Database**: PostgreSQL (Structured data, Users) + LocalStorage (Client-side chat session persistence).

### 2. Agentic Intelligence & Orchestration
The heart of ASTRAMIND is the `AIRouter` and the `AgentOrchestrator`:
*   **Skill Injection Engine**: Detects user intent via regex pattern-matching and dynamically injects one of 9 world-class agentic skills (Code Interpreter, Research, Math, Data Analyst, System Architect, etc.).
*   **Real-Time Discovery**: Features an in-memory cached (30-min TTL) DuckDuckGo news scraper that parallelizes topic fetching to deliver Perplexity-style live results in sub-milliseconds without database overhead.
*   **Multi-Provider Fallback**: Automatically switches between Groq, OpenRouter, Cerebras, and Anthropic.
*   **Tiered Model Resolution**: Maps application tiers (`fast`, `balanced`, `smart`) to the best models, including DeepSeek R1 for zero-cost advanced reasoning.

### 3. Lightweight Stability Engine
A highly optimized internal monitoring sub-system:
*   Replaced legacy thread-heavy telemetry with a single-thread, lazy 60-second snapshot monitor.
*   Uses `collections.deque(maxlen=200)` to ensure $O(1)$ memory footprint, completely eliminating Render Free Tier OOM crashes.
*   Provides a system-wide "Stability Score" via the `/api/v1/health` endpoint.

---

## 🚀 Scalability Roadmap

The system is designed to scale horizontally from 10k to 1M+ users.

### Phase 1: Current Scale (10k - 50k Users)
*   **Instance**: Single high-memory Web Service (Render).
*   **Database**: Managed PostgreSQL instance with connection pooling enabled.
*   **Optimization**: In-memory LRU caching and capped HTTPX pools (50 max) for stability.

### Phase 2: Enterprise Scale (100k Concurrent Users)
*   **Infrastructure**: Transition to Kubernetes (Pods: 20-50).
*   **Database**: Primary + Read Replicas. Heavy use of Redis for distributed session and quota management.
*   **Global Delivery**: Regional backend deployments to reduce latency.

### Phase 3: Mass Scale (1M+ Users)
*   **Architecture**: Sharded PostgreSQL clusters (partitioned by User ID).
*   **Edge Compute**: Use of Edge Workers (Cloudflare/Vercel) for rapid content filtering and prompt sanitization.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Backend** | Python 3.13, FastAPI, SQLAlchemy |
| **Frontend** | Next.js 15, Tailwind CSS, TypeScript, Lucide React |
| **Database** | PostgreSQL (asyncpg) |
| **AI Intelligence** | ReAct Pattern, DuckDuckGo API |
| **Deployment** | Docker, Render, Vercel |
