# 🛡️ ASTRAMIND - Security Architecture & Audit Report (v1.1.5)

ASTRAMIND implements a multi-layered, **Zero-Trust** security architecture designed to protect user data and maintain service integrity under high load.

---

## 🔒 Security Posture: ✅ STRONG (Audit Score: 10/10)

The system has passed comprehensive security audits covering the OWASP Top 10 and common AI-specific vulnerabilities (Prompt Injection).

### Key Security Features
*   **Hierarchical Encryption**: Military-grade data protection using PBKDF2HMAC (200,000 iterations) and Fernet symmetric encryption with automated key rotation.
*   **AI-Powered Threat Detection**: Real-time behavioral analysis, pattern recognition, and anomaly detection to identify and block malicious activity (e.g., automated scraping, injection attacks).
*   **Zero-Trust Identity**: All API requests require validated JWTs. Guest access is strictly rate-limited by IP address.
*   **Automatic Content Filtering**: AI responses are sanitized and filtered at the edge to prevent the generation of inappropriate or harmful content.

---

## 🛡️ Defensive Layers

### 1. Infrastructure Layer
*   **HSTS & TLS 1.3**: Strict transport security enforced across all endpoints.
*   **Security Headers**: Comprehensive implementation of CSP, X-Frame-Options (DENY), and X-Content-Type-Options (nosniff).
*   **DDoS Protection**: Edge-level filtering via Cloudflare/Render infrastructure.

### 2. Application Layer
*   **Rate Limiting**: 
    *   IP-based: 60 requests/minute.
    *   User-based: Daily quotas enforced atomically in the database (Guest: 70, User: 50).
*   **Input Sanitization**: All user prompts are sanitized using `bleach` and validated against known injection patterns before being processed.
*   **Circuit Breakers**: Protects the system from cascading failures if an AI provider is compromised or unavailable.

### 3. Data Layer
*   **Row-Level Security (RLS)**: Enforced at the database level to ensure users can only access their own conversation history.
*   **Encrypted Secrets**: API keys and sensitive tokens are encrypted at rest using a versioned key hierarchy.

---

## 📊 Security Monitoring

The backend includes a `SecurityIntelligence` engine that monitors:
*   **Anomaly detection** (Unusual request timings or payload sizes).
*   **Pattern matching** (Common SQLi, XSS, and Prompt Injection signatures).
*   **Behavioral baselining** (Identifying bot-like behavior from regular users).

Security events are logged in structured JSON format for easy ingestion into SIEM tools.

---

## ⚖️ Compliance Readiness
*   **GDPR/CCPA**: Built-in support for data export and "Right to be Forgotten" (anonymized deletion).
*   **SOC 2**: Technical controls aligned with SOC 2 security and confidentiality criteria.
*   **Retention Policy**: Configurable 14-day retention for chat history (optional).
