"""Perplexity-style multi-query web synthesis (no extra LLM call for query expansion)."""

from __future__ import annotations

import logging
import re
from typing import List

from services.web_search import fetch_web_search

logger = logging.getLogger(__name__)


def _expand_subqueries(main: str, max_q: int = 5) -> List[str]:
    """Generate complementary search queries from one user question."""
    q = main.strip()
    if not q:
        return []
    base = re.sub(r"\s+", " ", q)[:400]
    variants = [
        base,
        f"{base} latest news",
        f"{base} explained",
        f"{base} official site documentation",
        f"{base} Wikipedia overview",
    ]
    seen: set[str] = set()
    out: List[str] = []
    for v in variants:
        v = v.strip()
        if len(v) < 3 or v in seen:
            continue
        seen.add(v)
        out.append(v)
        if len(out) >= max_q:
            break
    return out


async def deep_research(query: str, max_subqueries: int = 5, results_per_query: int = 4) -> str:
    """
    Run several DuckDuckGo searches and concatenate snippets for model grounding.
    """
    subs = _expand_subqueries(query, max_q=max_subqueries)
    blocks: List[str] = []
    for sq in subs:
        try:
            ctx = await fetch_web_search(sq, max_results=results_per_query)
            if ctx:
                blocks.append(f"### Sub-query: {sq}\n{ctx}")
        except Exception as e:
            logger.warning("deep_research sub-query failed: %s", e)
    if not blocks:
        return ""
    return (
        "### **Deep research bundle (multiple web searches)**\n"
        "Use these sources to cite facts; prefer agreeing sources.\n\n" + "\n\n".join(blocks)
    )
