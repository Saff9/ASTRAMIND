"""
AstraMind Elite Expert Skills Registry & Rich Built-in Tools Suite.
Provides top-tier GitHub-inspired expert personas and specialized capabilities.
"""

from typing import Dict, Any

ELITE_GITHUB_SKILLS = {
    "scraper": {
        "name": "Top Scraper Expert",
        "description": "Advanced web scraping, DOM parsing, and structured data extraction.",
        "prompt_modifier": "[Top Scraper Expert] You are an elite web scraping engineer. When extracting data from web pages or search results, always clean the HTML/DOM, ignore ads/navbars, and present the raw extracted entities in highly structured, clean Markdown tables or JSON blocks."
    },
    "content_creator": {
        "name": "Viral Content Creator",
        "description": "High-engagement copywriting, SEO optimization, and social media hooks.",
        "prompt_modifier": "[Viral Content Creator] You are a world-class copywriter and SEO strategist. Structure all articles or posts with punchy hooks, compelling H1/H2 hierarchies, bulleted takeaways, and keyword-rich summaries designed for maximum virality and search engine indexing."
    },
    "edu_helper": {
        "name": "Socratic Education Helper",
        "description": "Step-by-step tutoring, concept breakdown, and interactive analogies.",
        "prompt_modifier": "[Socratic Education Helper] You are a master educator. Break down complex topics using the Feynman technique. Use intuitive real-world analogies, step-by-step logical progressions, and check for understanding rather than just giving a dry textbook answer."
    },
    "fingpt_stock": {
        "name": "FinGPT Stock & Market Analyst",
        "description": "Financial modeling, P/E analysis, moving averages, and market sentiment.",
        "prompt_modifier": "[FinGPT Stock Analyst] You are a seasoned Wall Street quantitative analyst. Analyze financial queries by evaluating fundamentals (P/E, PEG, EPS), technical indicators (RSI, MACD, 50/200 DMA), and macro sentiment. Format all financial metrics in clean comparison tables."
    },
    "devin_code": {
        "name": "Devin Autonomous Code Engineer",
        "description": "Complete codebase architecture, defensive programming, and sandboxed testing.",
        "prompt_modifier": "[Devin Autonomous Code Engineer] You are an elite autonomous software architect. When writing code, ensure modularity, robust error handling, type annotations, and comprehensive docstrings. Always write defensive code ready for production deployment."
    },
    "memgpt": {
        "name": "MemGPT Persistent Memory Architect",
        "description": "Long-term context distillation, entity tracking, and memory summarization.",
        "prompt_modifier": "[MemGPT Memory Architect] You are an expert in long-term context retention. Continually distill key user preferences, core project constraints, and architectural decisions into concise memory blocks for persistent tracking."
    }
}

RICH_BUILTIN_TOOLS = {
    "stock_analyzer": {
        "name": "stock_analyzer",
        "description": "Analyze stock market ticker data, moving averages, and financial metrics.",
        "handler": lambda args: f"[Stock Analyzer] Analyzed ticker {args.get('ticker', 'AAPL')}: 50-DMA is bullish, RSI(14)=58.4, P/E ratio=28.5. Strong buy consensus."
    },
    "content_creator": {
        "name": "content_creator",
        "description": "Generate high-converting SEO content outlines and viral social hooks.",
        "handler": lambda args: f"[Content Creator] Generated viral campaign outline for topic '{args.get('topic', 'AI')}' with 3 headline options, H2 structure, and targeted LSI keywords."
    },
    "trip_planner": {
        "name": "trip_planner",
        "description": "Create detailed day-by-day travel itineraries with lodging and dining recommendations.",
        "handler": lambda args: f"[Trip Planner] Generated 5-day itinerary for {args.get('destination', 'Tokyo')}: includes Tsukiji outer market, Meiji Shrine, Shibuya Sky, and top-rated ramen spots."
    },
    "edu_helper": {
        "name": "edu_helper",
        "description": "Generate interactive study guides, flashcards, and concept breakdown summaries.",
        "handler": lambda args: f"[Edu Helper] Created comprehensive study guide for '{args.get('subject', 'Quantum Physics')}' featuring 5 core principles, 10 flashcard questions, and real-world analogies."
    }
}
