from __future__ import annotations

from typing import Any
from urllib.parse import quote_plus

import anyio
import httpx
from bs4 import BeautifulSoup


_USER_AGENT = "Mozilla/5.0 (compatible; ASTRAMINDAI/1.1; +https://ASTRAMIND-ai.com)"
_HEADERS = {"User-Agent": _USER_AGENT, "Accept": "text/html,application/xhtml+xml"}


def _parse_duckduckgo_html(html: str, *, limit: int) -> list[dict[str, Any]]:
    soup = BeautifulSoup(html, "html.parser")
    results: list[dict[str, Any]] = []

    # DuckDuckGo HTML results page uses `.result__a` anchors for titles.
    for anchor in soup.select(".result__a")[:limit]:
        title = anchor.get_text(strip=True) or None
        url = anchor.get("href")
        results.append({"title": title, "url": url})

    return results


async def web_search_scrape(
    query: str,
    limit: int = 5,
    *,
    client: httpx.AsyncClient | None = None,
) -> list[dict[str, Any]]:
    """
    Fetch DuckDuckGo HTML results asynchronously and parse them off the event loop.

    Notes:
    - Network is fully async.
    - HTML parsing runs in a worker thread to avoid blocking the event loop.
    """
    limit = max(1, min(10, int(limit)))
    q = quote_plus(query.strip())
    url = f"https://duckduckgo.com/html/?q={q}"

    timeout = httpx.Timeout(10.0, connect=3.0, read=10.0)
    if client is None:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as local_client:
            resp = await local_client.get(url, headers=_HEADERS)
    else:
        resp = await client.get(url, headers=_HEADERS, timeout=timeout)

    resp.raise_for_status()
    return await anyio.to_thread.run_sync(_parse_duckduckgo_html, resp.text, limit=limit)


def web_search_fallback(_query: str) -> list[dict[str, Any]]:
    """Safe fallback if scraping fails. Never raises."""
    return [{"title": "Search unavailable", "url": None, "snippet": "Web search provider unavailable."}]
