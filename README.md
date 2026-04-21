# 🚀 ASTRAMIND - Premium AI Orchestration Platform

### *The Culturally-Aware Intelligence for the Next Generation.*

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.1.5-brightgreen.svg)](CHANGELOG.md)
[![Status](https://img.shields.io/badge/status-production%20ready-success.svg)](STATUS_DASHBOARD.md)
[![Security](https://img.shields.io/badge/security-10%2F10%20audit-critical.svg)](SECURITY.md)
[![Scalability](https://img.shields.io/badge/scalability-100k%2B%20users-blueviolet.svg)](ARCHITECTURE.md)
[![TypeScript](https://img.shields.io/badge/typescript-5.x%20strict-blue.svg)](frontend/tsconfig.json)

---

## ✨ Overview

ASTRAMIND is an enterprise-grade AI chat platform that bridges the gap between sterile logic and human relatability. Built on a robust **FastAPI** backend and a sleek **Next.js** frontend, it features a proprietary **Advanced Personality Engine** designed to understand cultural context, memes, and emotional subtext in real-time.

---

## 🏛️ System Architecture

### 🧠 The Core
*   **Multi-Provider Router**: Intelligent, circuit-broken routing across Groq, OpenRouter, Google AI, Anthropic, and more.
*   **Personality Engine**: A three-layer system (Cultural Awareness, Emotional Intelligence, and Creative Expression) that injects authenticity into every interaction.
*   **Zero-Trust Security**: Grade-A protection with hierarchical encryption, atomic quota enforcement, and automated threat detection.

### 🛠️ Technology Stack
*   **Backend**: Python 3.13 / FastAPI / SQLAlchemy Async / Pydantic v2
*   **Frontend**: Next.js 14 (App Router) / TypeScript / Tailwind CSS / Framer Motion
*   **Infrastructure**: PostgreSQL / Supabase / Redis / Docker / Render

---

## 📖 Key Documentation

We have consolidated our technical guides into simplified "Sources of Truth":

*   🚀 **[Getting Started](README.md#getting-started)**: Installation and local setup.
*   🚢 **[Deployment Guide](DEPLOYMENT.md)**: Official production ops manual.
*   🏗️ **[System Architecture](ARCHITECTURE.md)**: High-level design and scalability.
*   🛡️ **[Security Posture](SECURITY.md)**: Offensive/Defensive architecture details.
*   🎨 **[Personality Engine](PERSONALITY.md)**: Deep dive into the AI personas.
*   📜 **[Documentation Index](DOCUMENTATION_INDEX.md)**: Map of all project documents.

---

## 🚀 Getting Started

### Prerequisites
*   **Python 3.11+** & **Node.js 18+**
*   **PostgreSQL** (Sync/Async compatible)
*   **Supabase Project** (For Auth & DB)
*   At least one AI Provider API Key (Groq, Anthropic, etc.)

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

ASTRAMIND is engineered to handle massive interactions without breaking a sweat:
*   **Average Latency**: ~150ms (AI processing + routing).
*   **Concurrency**: Optimized for 100,000+ simultaneous connections.
*   **Reliability**: Multi-level fallback chain with automated provider switching.

---

## 🤝 Contributing

We welcome high-quality contributions. Please review our **[ARCHITECTURE.md](ARCHITECTURE.md)** before submitting a PR to ensure alignment with our design patterns.

---

## 📜 License & Support

*   **License**: Licensed under the MIT License.
*   **Support**: Open an issue or contact `support@astramind.ai`.

---

**Made with ❤️ by the ASTRAMIND Engineering Team.**  
*v1.1.5 • Production Ready*
