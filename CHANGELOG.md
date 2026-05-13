# 📜 AstraMind Changelog

All notable changes to AstraMind are documented here. This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.0] - 2026-05-13

### 🎯 Production-Grade Overhaul & Agentic AI
#### Added
- **World-Class Agentic Skills**: Introduced 9 specialized skill modules (`Code Interpreter`, `Research`, `Math Reasoning`, `Data Analyst`, `System Architect`, `Security Auditor`, `Planner`, `Content Writer`, `Self-Refine`) with regex-based auto-detection in `agent_skills.py`.
- **Live Discovery Feed**: Perplexity-style real-time news via DuckDuckGo API with parallel topic fetching and 30-minute in-memory caching.
- **Premium UI Enhancements**:
  - Hardware-accelerated message slide-in animations.
  - Interactive "Thinking" state glows and pulsing micro-animations.
  - Separated persistent memory for each chat session stored locally with auto-generated titles.
- **DeepSeek R1 Tier**: Implemented a highly capable "Smart" tier using DeepSeek R1 via OpenRouter for free, advanced reasoning.
- **Pricing Page**: Added a transparent pricing and API limit communication page.

#### Fixed
- **Memory Leaks & OOM Crashes**: Completely rewrote `monitoring.py` from 670 to 140 lines. Replaced unbounded memory dictionaries with `collections.deque(maxlen=200)` and 60-second lazy snapshots, preventing Render Free Tier crashes.
- **JSON Stream Corruption**: Removed `bleach.clean()` from the chat streaming path which was previously corrupting AI response chunks silently.
- **ChatInput Bugs**: Fixed SSR mismatches with `isMobile` detection, corrected input border glows, and integrated the "Stop" button natively into the toolbar.
- **Session Memory Conflicts**: Fixed the "New Chat" bug where clearing the UI didn't reset the session ID, causing messages to bleed into old conversations.
- **Token Limits**: Raised security validator prompt limits from 8k to 32k to match actual model capabilities.

#### Removed
- **Dead Code (~120KB)**: Deleted deprecated security modules (`advanced_security.py`, `production_security.py`, `performance_testing.py`, `scalability_optimization.py`, `advanced_personality_engine.py`, `file_security.py`) and old adapters to drastically simplify the architecture.

---

## [1.1.5] - 2026-04-21
### 🎯 Documentation Overhaul & Production Sync
- **Consolidated Documentation**: Merged 30+ redundant files into 8 core "Source of Truth" documents.

---

## [1.1.4] - 2026-01-25
### 🎯 Quality, Stability & Security Hardening
- **Enhanced Error Handling** and Advanced Rate Limiting.
- **Atomic Quota System**: Resolved race conditions.

---

**Legend:**
- 🚀 **Added** New features
- 🔧 **Changed** Updates to existing features
- 🐛 **Fixed** Bug fixes
- 🗑️ **Removed** Code deletions
- 🔒 **Security** Vulnerability patches
