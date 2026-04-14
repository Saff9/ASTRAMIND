# backend/app/services/stream.py

import asyncio
from fastapi.responses import StreamingResponse
from typing import AsyncIterator
import logging

logger = logging.getLogger(__name__)


def stream_response(generator: AsyncIterator[str]) -> StreamingResponse:
    """
    Wraps async generator into FastAPI streaming response with robust error handling.
    Prevents 'Unexpected end of JSON input' errors by ensuring valid SSE format.
    """

    async def event_stream():
        try:
            async for chunk in generator:
                # Ensure chunk is a valid string
                if chunk is None:
                    logger.debug("Skipping None chunk in stream")
                    continue
                if not isinstance(chunk, str):
                    try:
                        chunk = str(chunk)
                    except Exception as e:
                        logger.error(f"Failed to convert chunk to string: {e}")
                        continue
                
                # Skip empty chunks
                if not chunk.strip():
                    continue
                    
                # Format as proper SSE message
                yield f"data: {chunk}\n\n"
                
        except asyncio.CancelledError:
            logger.info("Stream cancelled by client")
            raise
        except GeneratorExit:
            logger.info("Stream closed by client")
            raise
        except Exception as e:
            logger.error(f"Error in stream response: {e}", exc_info=True)
            # Send error message to client in SSE format
            yield f"data: {{\"error\": \"Stream interrupted\", \"message\": \"Please try again\"}}\n\n"
            raise

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
    )
