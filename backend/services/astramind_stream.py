# backend/services/ASTRAMIND_stream.py
"""
ASTRAMIND Streaming Service - Enhanced streaming with personality adaptation
"""

import asyncio
import json
from typing import AsyncGenerator, AsyncIterator, Dict, Any, Optional, Union
from fastapi.responses import StreamingResponse
from core.ASTRAMIND_ai_personality import ASTRAMIND_personality_engine
import logging

logger = logging.getLogger(__name__)

class ASTRAMINDStreamService:
    """
    Enhanced streaming service that adapts AI responses to ASTRAMIND personality.
    """

    def __init__(self):
        self.active_streams: Dict[str, asyncio.Queue] = {}
        self.conversation_histories: Dict[str, list] = {}

    async def adapt_response_offline(
        self,
        base_response: str,
        conversation_id: str,
        user_message: str
    ) -> str:
        """
        Apply ASTRAMIND personality adaptation to a complete response.
        """

        # Initialize conversation history if needed
        if conversation_id not in self.conversation_histories:
            self.conversation_histories[conversation_id] = []

        # Add user message to history
        self.conversation_histories[conversation_id].append(user_message)

        # Apply ASTRAMIND personality adaptation
        try:
            ASTRAMIND_response = await ASTRAMIND_personality_engine.adapt_response(
                user_message=user_message,
                conversation_id=conversation_id,
                base_response=base_response
            )

            # Add ASTRAMIND response to conversation history
            self.conversation_histories[conversation_id].append(ASTRAMIND_response)

            # Keep history manageable (last 20 messages)
            if len(self.conversation_histories[conversation_id]) > 20:
                self.conversation_histories[conversation_id] = self.conversation_histories[conversation_id][-20:]

            return ASTRAMIND_response

        except Exception as e:
            logger.error(f"ASTRAMIND personality adaptation failed: {e}")
            return base_response  # Fallback to base response

    def get_conversation_title(self, conversation_id: str) -> str:
        """Generate a ASTRAMIND-style title for the conversation."""
        history = self.conversation_histories.get(conversation_id, [])
        if not history:
            return "New Chat ✨"

        try:
            return asyncio.run(ASTRAMIND_personality_engine.generate_conversation_title(history))
        except Exception as e:
            logger.error(f"Title generation failed: {e}")
            return "ASTRAMIND Chat 💫"

    def get_conversation_summary(self, conversation_id: str) -> Optional[str]:
        """Generate a summary of the conversation."""
        history = self.conversation_histories.get(conversation_id, [])
        if len(history) < 4:  # Need some conversation to summarize
            return None

        # Simple summary based on topic analysis
        all_text = " ".join(history[-10:])  # Last 10 messages
        word_count = len(all_text.split())

        topics = []
        if any(word in all_text.lower() for word in ['code', 'programming', 'ai', 'software']):
            topics.append("tech")
        if any(word in all_text.lower() for word in ['game', 'gaming', 'play']):
            topics.append("gaming")
        if any(word in all_text.lower() for word in ['music', 'song', 'artist']):
            topics.append("music")

        topic_str = ", ".join(topics) if topics else "general"

        return f"{len(history)//2} messages • {word_count} words • {topic_str} chat"

async def adapt_response_to_ASTRAMIND(
    base_response: str,
    conversation_id: str = "default",
    user_message: str = ""
) -> str:
    """
    Adapt a complete AI response to ASTRAMIND personality.
    """
    ASTRAMIND_service = ASTRAMINDStreamService()
    return await ASTRAMIND_service.adapt_response_offline(
        base_response=base_response,
        conversation_id=conversation_id,
        user_message=user_message
    )

def stream_ASTRAMIND_response(
    base_stream_generator: Union[AsyncGenerator[str, None], AsyncIterator[str]],
    conversation_id: str = "default",
    user_message: str = ""
) -> StreamingResponse:
    """
    Create a streaming response with ASTRAMIND enhancements.
    For now, this just passes through the base streaming.
    Future enhancement: real-time ASTRAMIND adaptation.
    """

    async def ASTRAMIND_generator():
        async for chunk in base_stream_generator:
            # Format as SSE (Server-Sent Events)
            yield f"data: {json.dumps({'content': chunk})}\n\n"

        # Send end marker
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        ASTRAMIND_generator(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        }
    )

# Global instance
ASTRAMIND_stream_service = ASTRAMINDStreamService()

__all__ = ['ASTRAMINDStreamService', 'stream_ASTRAMIND_response', 'ASTRAMIND_stream_service']
