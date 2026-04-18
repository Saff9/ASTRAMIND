"""
Web Search Service utilizing DuckDuckGo
Fetches top results to inject into the AI context for real-time awareness.
"""

from duckduckgo_search import DDGS
import logging
import asyncio

logger = logging.getLogger(__name__)

async def fetch_web_search(query: str, max_results: int = 3) -> str:
    """
    Asynchronously fetch duckduckgo search results.
    Returns a formatted string of the top results or an empty string if failed.
    """
    def _search():
        try:
            with DDGS() as ddgs:
                results = list(ddgs.text(query, max_results=max_results))
                if not results:
                    return ""
                
                output = ["### **Real-Time Web Search Context (DuckDuckGo):**"]
                for i, r in enumerate(results):
                    output.append(f"**[{i+1}] {r.get('title', 'Unknown')}**")
                    output.append(f"Snippet: {r.get('body', '')}")
                    output.append(f"Source: {r.get('href', '')}\n")
                
                return "\n".join(output)
        except Exception as e:
            logger.error(f"DuckDuckGo search failed for query '{query}': {e}")
            return ""

    loop = asyncio.get_event_loop()
    # Run synchronous network DDGS search in a thread pool to avoid blocking async event loop
    return await loop.run_in_executor(None, _search)

async def web_search_scrape(query: str, limit: int = 5, client=None) -> list[dict]:
    """
    Backward-compat function for API v1 endpoint relying on JSON results via duckduckgo search library.
    """
    def _search():
        try:
            with DDGS() as ddgs:
                results = list(ddgs.text(query, max_results=limit))
                return [
                    {"title": r.get('title'), "url": r.get('href'), "snippet": r.get('body')} 
                    for r in results
                ]
        except Exception:
            return []

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _search)

def web_search_fallback(_query: str) -> list[dict]:
    """Fallback router."""
    return [{"title": "Search disabled", "url": None, "snippet": "DuckDuckGo Web Search is offline."}]
