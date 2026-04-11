from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List

from app.db.session import get_db
from app.db.models import DiscoverNews
from core.enhanced_security import get_current_user_secure
import httpx
from bs4 import BeautifulSoup
import logging
from datetime import datetime, timezone
import asyncio

logger = logging.getLogger(__name__)

router = APIRouter()

async def scrape_tech_news(db: AsyncSession):
    """Background task to scrape latest AI/Tech news occasionally."""
    try:
        # Example dummy scraper logic simulating fetching from an RSS feed
        # In a real setup, this would fetch from TechCrunch, Verge, etc.
        # Check if we recently scraped
        recent = await db.execute(select(DiscoverNews).order_by(desc(DiscoverNews.published_at)).limit(1))
        latest = recent.scalar_one_or_none()
        
        if latest and (datetime.now(timezone.utc) - latest.published_at).total_seconds() < 3600:
            return # Scraped recently
            
        # Mocking some real-looking data insertion for the prototype
        mock_news = [
            {
                "title": "Anthropic releases Claude 3.5 Haiku",
                "summary": "The fastest model from Anthropic is now available, beating GPT-4o Mini in several benchmarks.",
                "source_name": "Tech News",
                "source_url": "https://example.com/claude",
                "image_url": "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=400&q=80",
                "published_at": datetime.now(timezone.utc)
            },
            {
                "title": "DeepSeek R1 blows past expectations",
                "summary": "Open-weight reasoning models are catching up to proprietary frontier models in complex logic tasks.",
                "source_name": "AI Weekly",
                "source_url": "https://example.com/deepseek",
                "image_url": "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=400&q=80",
                "published_at": datetime.now(timezone.utc)
            }
        ]
        
        for item in mock_news:
            news = DiscoverNews(**item)
            db.add(news)
            
        await db.commit()
    except Exception as e:
        logger.error(f"Error scraping news: {e}")


@router.get("/feed", summary="Get Discover News Feed")
async def get_discover_feed(
    background_tasks: BackgroundTasks,
    auth_data: dict = Depends(get_current_user_secure),
    db: AsyncSession = Depends(get_db)
):
    # Trigger background scrape optionally
    background_tasks.add_task(scrape_tech_news, db)
    
    result = await db.execute(select(DiscoverNews).order_by(desc(DiscoverNews.published_at)).limit(20))
    news_items = result.scalars().all()
    
    return {
        "items": [
            {
                "id": n.id,
                "title": n.title,
                "summary": n.summary,
                "source_name": n.source_name,
                "source_url": n.source_url,
                "image_url": n.image_url,
                "published_at": n.published_at.isoformat()
            } for n in news_items
        ]
    }
