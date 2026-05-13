# 🚀 ASTRAMIND - Production-Grade Agentic AI Platform

### *World-Class Intelligence, Real-Time News, and Agentic Skills.*

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.2.0-brightgreen.svg)](CHANGELOG.md)
[![Status](https://img.shields.io/badge/status-production%20ready-success.svg)](STATUS_DASHBOARD.md)
[![Security](https://img.shields.io/badge/security-10%2F10%20audit-critical.svg)](SECURITY.md)
[![TypeScript](https://img.shields.io/badge/typescript-5.x%20strict-blue.svg)](frontend/tsconfig.json)

---

## ✨ Overview

ASTRAMIND is an enterprise-grade AI chat platform engineered to compete with leading AI assistants like Claude, ChatGPT, and Perplexity. Built on a robust **FastAPI** backend and a sleek **Next.js 15** frontend, it features a proprietary **Agentic Skill Engine** with real-time news discovery, multi-step reasoning, and highly optimized memory management.

---

## 🏛️ System Architecture

### 🧠 The Core
*   **Agentic Orchestrator (ReAct)**: Dynamically injects 9 specialized skills (Code Interpreter, Deep Research, Math Reasoning, System Architect, etc.) based on user intent.
*   **Real-Time Discovery**: Perplexity-style live news feed powered by DuckDuckGo with sub-millisecond in-memory caching.
*   **Multi-Provider Router**: Intelligent, circuit-broken routing across OpenRouter (DeepSeek R1), Groq (Llama 3.3 70B), Cerebras, and Anthropic.
*   **Zero-Trust Security**: Robust prompt injection filtering and streaming sanitization.

### 🛠️ Technology Stack
*   **Backend**: Python 3.13 / FastAPI / SQLAlchemy / Pydantic v2
*   **Frontend**: Next.js 15 (App Router) / TypeScript / Tailwind CSS / Lucide React
*   **Infrastructure**: PostgreSQL / Render / Vercel

---

## 📖 Key Documentation

We have consolidated our technical guides into simplified "Sources of Truth":

*   🚀 **[Getting Started](README.md#getting-started)**: Installation and local setup.
*   🚢 **[Deployment Guide](DEPLOYMENT.md)**: Official production ops manual (Render/Vercel).
*   🏗️ **[System Architecture](ARCHITECTURE.md)**: High-level design and scalability.
*   🛡️ **[Security Posture](SECURITY.md)**: Offensive/Defensive architecture details.
*   📜 **[Documentation Index](DOCUMENTATION_INDEX.md)**: Map of all project documents.

---

## 🚀 Getting Started

### Prerequisites
*   **Python 3.11+** & **Node.js 18+**
*   **PostgreSQL** (Sync/Async compatible)
*   **API Keys**: OpenRouter, Groq, Cerebras (Free tiers supported)

### Quick Installation

1.  **Clone & Install Backend**
    ```bash
    cd backend
    pip install -r requirements.txt
    python main.py  # Check console for startup validation
    ```

2.  **Initialize Database**
    ```bash
    alembic upgrade head
    ```

3.  **Start Frontend**
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

---

## 📊 Performance at Scale

ASTRAMIND is engineered to handle production workloads even on constrained (Free Tier) hosting environments:
*   **Memory Optimization**: Operates comfortably within 512MB RAM limits (Render Free Tier) thanks to bounded memory queues and optimized monitoring.
*   **Average Latency**: ~150ms for cached responses, lightning-fast streaming for AI generation.
*   **Connection Pooling**: HTTPX and database connection pools are capped to prevent OOM crashes under high concurrent load.

---

## 🤝 Contributing

We welcome high-quality contributions. Please review our **[ARCHITECTURE.md](ARCHITECTURE.md)** before submitting a PR to ensure alignment with our design patterns.

---

## 📜 License & Support

*   **License**: Licensed under the MIT License.
*   **Support**: Open an issue or contact `support@astramind.ai`.

---

**Made with ❤️ by the ASTRAMIND Engineering Team.**  
*v1.2.0 • Production Ready*
