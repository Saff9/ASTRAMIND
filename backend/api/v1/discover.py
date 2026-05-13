"""
AstraMind Discover — Real-time AI/Tech News Feed
Fetches LIVE news via DuckDuckGo News API (like Perplexity).

Architecture:
- In-memory cache with 30-minute TTL (no DB dependency for news)
- Parallel fetching from 4 news topics
- Falls back to quality curated items if fetch fails
- No auth required for public news feed
"""

from fastapi import APIRouter, BackgroundTasks
import asyncio
import logging
import time
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

router = APIRouter()

# ──────────────────────────────────────────────────────────────────────────────
# IN-MEMORY NEWS CACHE (30-minute TTL — no DB for this)
# ──────────────────────────────────────────────────────────────────────────────
_news_cache: List[Dict] = []
_cache_time: float = 0
_CACHE_TTL = 1800  # 30 minutes
_fetching = False


# ──────────────────────────────────────────────────────────────────────────────
# REAL NEWS FETCHER — DuckDuckGo News (free, no API key)
# ──────────────────────────────────────────────────────────────────────────────

SEARCH_TOPICS = [
    "artificial intelligence news 2025",
    "large language model release 2025",
    "OpenAI Anthropic Google AI news",
    "machine learning research breakthrough",
]

SOURCE_IMAGES = {
    "techcrunch": "https://techcrunch.com/wp-content/uploads/2015/02/cropped-cropped-favicon-gradient.png",
    "verge": "https://cdn.vox-cdn.com/uploads/chorus_image/image/49493993/this-is-the-verge.0.jpg",
    "wired": "https://www.wired.com/images/logos/wired-logo.jpg",
    "openai": "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=600&q=80",
    "anthropic": "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=600&q=80",
    "google": "https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?auto=format&fit=crop&w=600&q=80",
    "deepseek": "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=600&q=80",
    "meta": "https://images.unsplash.com/photo-1677691824655-8d5e04de66c2?auto=format&fit=crop&w=600&q=80",
}

DEFAULT_IMAGES = [
    "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1677691824655-8d5e04de66c2?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?auto=format&fit=crop&w=600&q=80",
]


def _pick_image(url: str, title: str, idx: int) -> str:
    """Pick best image for article."""
    if url:
        domain = url.lower()
        for key, img in SOURCE_IMAGES.items():
            if key in domain:
                return img
    # Cycle through defaults
    return DEFAULT_IMAGES[idx % len(DEFAULT_IMAGES)]


def _extract_source_name(url: str) -> str:
    """Extract readable source name from URL."""
    if not url:
        return "AI News"
    try:
        from urllib.parse import urlparse
        host = urlparse(url).netloc.replace("www.", "").replace(".com", "").replace(".ai", "").replace(".org", "")
        return host.replace("-", " ").title()
    except Exception:
        return "AI News"


def _fetch_news_sync() -> List[Dict]:
    """Synchronous DuckDuckGo news fetch — run in thread pool."""
    seen_titles = set()
    items = []
    
    try:
        from duckduckgo_search import DDGS
        with DDGS() as ddgs:
            for topic in SEARCH_TOPICS:
                try:
                    results = list(ddgs.news(topic, max_results=6))
                    for r in results:
                        title = (r.get("title") or "").strip()
                        if not title or title in seen_titles:
                            continue
                        seen_titles.add(title)
                        items.append({
                            "title": title,
                            "summary": (r.get("body") or r.get("excerpt") or "")[:300],
                            "source_name": r.get("source") or _extract_source_name(r.get("url", "")),
                            "source_url": r.get("url") or r.get("link") or "",
                            "image_url": r.get("image") or None,
                            "published_at": r.get("date") or datetime.now(timezone.utc).isoformat(),
                        })
                except Exception as e:
                    logger.warning(f"DuckDuckGo news topic '{topic}' failed: {e}")
                    continue
    except Exception as e:
        logger.error(f"DuckDuckGo news fetch failed: {e}")

    # Enrich with images
    for i, item in enumerate(items):
        if not item.get("image_url"):
            item["image_url"] = _pick_image(item.get("source_url", ""), item["title"], i)

    # Sort by publish date (newest first)
    def _sort_key(item):
        try:
            dt_str = item.get("published_at", "")
            if dt_str:
                from dateutil import parser as dparser
                return dparser.parse(dt_str, ignoretz=True)
        except Exception:
            pass
        return datetime.min

    items.sort(key=_sort_key, reverse=True)
    return items[:20]  # Return top 20


async def _refresh_cache():
    """Refresh the news cache in background."""
    global _news_cache, _cache_time, _fetching
    if _fetching:
        return
    _fetching = True
    try:
        loop = asyncio.get_event_loop()
        items = await loop.run_in_executor(None, _fetch_news_sync)
        if items:
            _news_cache = items
            _cache_time = time.time()
            logger.info(f"Discover: fetched {len(items)} live news items")
        else:
            logger.warning("Discover: no items fetched, keeping previous cache")
    except Exception as e:
        logger.error(f"Discover cache refresh failed: {e}")
    finally:
        _fetching = False


def _get_fallback_news() -> List[Dict]:
    """High-quality curated fallback news when fetch fails."""
    now = datetime.now(timezone.utc)
    return [
        {
            "id": 1,
            "title": "DeepSeek R1: The Free Reasoning Model That Rivals GPT-o1",
            "summary": "DeepSeek's R1 model achieves o1-level reasoning performance and is available completely free via OpenRouter. AstraMind uses it as the primary smart model.",
            "source_name": "DeepSeek",
            "source_url": "https://deepseek.com",
            "image_url": DEFAULT_IMAGES[0],
            "published_at": now.isoformat(),
        },
        {
            "id": 2,
            "title": "Groq Llama 3.3-70B: 300 Tokens/Second Free Inference",
            "summary": "Groq's LPU hardware delivers lightning-fast inference for Llama 3.3-70B at 300+ tokens per second, completely free. The backbone of AstraMind's balanced tier.",
            "source_name": "Groq",
            "source_url": "https://groq.com",
            "image_url": DEFAULT_IMAGES[1],
            "published_at": now.isoformat(),
        },
        {
            "id": 3,
            "title": "OpenRouter Now Offers 50+ Free AI Models",
            "summary": "OpenRouter expanded its free tier to include DeepSeek R1, Llama 3.3, Mistral, and more — enabling AstraMind's multi-provider fallback at zero cost.",
            "source_name": "OpenRouter",
            "source_url": "https://openrouter.ai",
            "image_url": DEFAULT_IMAGES[2],
            "published_at": now.isoformat(),
        },
        {
            "id": 4,
            "title": "Claude 3.5 Sonnet Sets New Coding Benchmark Record",
            "summary": "Anthropic's Claude 3.5 Sonnet outperforms GPT-4o on SWE-bench, Aider leaderboard, and HumanEval — confirming its position as the best coding AI available.",
            "source_name": "Anthropic",
            "source_url": "https://anthropic.com",
            "image_url": DEFAULT_IMAGES[3],
            "published_at": now.isoformat(),
        },
        {
            "id": 5,
            "title": "Cerebras Inference: The Fastest AI API in the World",
            "summary": "Cerebras' wafer-scale chip delivers 2000+ tokens/second for Llama models, making it the fastest AI API available — integrated into AstraMind's fast tier.",
            "source_name": "Cerebras",
            "source_url": "https://cerebras.ai",
            "image_url": DEFAULT_IMAGES[4],
            "published_at": now.isoformat(),
        },
        {
            "id": 6,
            "title": "Google Gemini 2.0 Flash: Multimodal AI for Everyone",
            "summary": "Google's Gemini 2.0 Flash brings vision, audio, and reasoning capabilities to free-tier users, dramatically expanding what's possible without premium API access.",
            "source_name": "Google AI",
            "source_url": "https://deepmind.google",
            "image_url": DEFAULT_IMAGES[5],
            "published_at": now.isoformat(),
        },
    ]


# ──────────────────────────────────────────────────────────────────────────────
# API ENDPOINTS
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/feed", summary="Get Discover News Feed — Live AI/Tech News")
async def get_discover_feed(background_tasks: BackgroundTasks):
    """
    Returns live AI/tech news fetched from the web.
    - Cache TTL: 30 minutes
    - No auth required (public)
    - Falls back to curated news if fetch fails
    """
    global _news_cache, _cache_time

    cache_age = time.time() - _cache_time
    cache_expired = cache_age > _CACHE_TTL

    if cache_expired and not _fetching:
        # Trigger refresh in background so this request returns immediately
        background_tasks.add_task(_refresh_cache)

    if _news_cache:
        # Return cache (may be slightly stale — user gets instant response)
        items = [
            {
                "id": i,
                "title": n.get("title", ""),
                "summary": n.get("summary", ""),
                "source_name": n.get("source_name", "AI News"),
                "source_url": n.get("source_url", ""),
                "image_url": n.get("image_url") or DEFAULT_IMAGES[i % len(DEFAULT_IMAGES)],
                "published_at": n.get("published_at", datetime.now(timezone.utc).isoformat()),
            }
            for i, n in enumerate(_news_cache)
        ]
        return {
            "items": items,
            "cached": True,
            "cache_age_seconds": round(cache_age),
            "source": "live",
        }

    # First call or cache empty — fetch immediately (blocking for first user)
    if not _fetching:
        await _refresh_cache()

    if _news_cache:
        items = [
            {
                "id": i,
                "title": n.get("title", ""),
                "summary": n.get("summary", ""),
                "source_name": n.get("source_name", "AI News"),
                "source_url": n.get("source_url", ""),
                "image_url": n.get("image_url") or DEFAULT_IMAGES[i % len(DEFAULT_IMAGES)],
                "published_at": n.get("published_at", datetime.now(timezone.utc).isoformat()),
            }
            for i, n in enumerate(_news_cache)
        ]
        return {"items": items, "cached": False, "source": "live"}

    # Total fallback — curated quality news
    return {"items": _get_fallback_news(), "cached": False, "source": "fallback"}
