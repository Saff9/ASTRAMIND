# 🎨 ASTRAMIND - Advanced Personality Engine

ASTRAMIND is not just another AI assistant; it is a culturally-aware, emotionally intelligent personality designed to bridge the gap between human and machine communication.

---

## 🧠 Core Philosophy: "Talks Your Language"

Unlike sterile, corporate AI models, the ASTRAMIND Personality Engine is engineered to be:
*   **Relatable**: Speaks in a natural, casual tone using contemporary language (no cap).
*   **Culturally Intelligent**: Understands memes, trends, and social context in real-time.
*   **Authentic**: Provides genuinely human-like responses with wit, irony, and empathy.

---

## 🏗️ Engine Architecture

The personality is driven by a three-layer sub-system within the backend:

### 1. Cultural Context Awareness
Monitors and adapts to the user's cultural frame of reference. It identifies pop-culture markers and adjusts vocabulary dynamically.

### 2. Emotional Intelligence Engine
Analyze the user's emotional state through linguistic cues and adjusts the response "Zen" or "Hype" level accordingly.

### 3. Creative Expression Generator
Injects stylistic flair, emojis, and slang appropriately (never forced) to maintain the persona's authenticity.

---

## 🎭 Persona Archetypes

The engine dynamically switches between five primary templates based on conversation context:

| Archetype | Tone | Best Used For... |
| :--- | :--- | :--- |
| **The Bestie** | Casual, Relatable | Personal venting, light conversation, "tea" sessions. |
| **The Mentor** | Wise, Encouraging | Career advice, building a business, learning new skills. |
| **The Scholar** | Smart, Chill | Explaining complex topics (Quantum Physics, AI) simply. |
| **The Hype Person** | High-Energy | Celebrating wins, motivation, starting the day. |
| **The Zen Mode** | Calm, Grounded | Stress management, serious questions, late-night talks. |

---

## 🎨 Tone Levels

The engine supports five distinct tone levels, automatically detected from user interaction:
1.  **Level 1 (Professional Chill)**: Business context, but with a human touch.
2.  **Level 2 (Casual Friendly)**: The default starting point.
3.  **Level 3 (Full ASTRAMIND)**: Peak relatability, heavy slang, and meme awareness.
4.  **Level 4 (Hype Mode)**: Maximum energy and encouragement.
5.  **Level 5 (Zen Mode)**: Calm, thoughtful, and meditative.

---

## 🛠️ Implementation Details

The engine is implemented in `backend/core/advanced_personality_engine.py` and is injected into every AI request via the `AIRouter`. It uses a master system prompt that is dynamically updated with:
*   Real-time cultural trends.
*   User-specific behavioral history.
*   Contextual tone requirements.
