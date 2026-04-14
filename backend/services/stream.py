# backend/app/services/stream.py

import asyncio
import json
from fastapi.responses import StreamingResponse
from typing import AsyncIterator
import logging

logger = logging.getLogger(__name__)


def stream_response(generator: AsyncIterator[str]) -> StreamingResponse:
    """
    Wraps async generator into FastAPI streaming response with robust error handling.
    Prevents 'Unexpected end of JSON input' errors by ensuring valid SSE format.
    
    CRITICAL FIXES:
    1. Properly formats all chunks as valid JSON strings
    2. Escapes special characters in chunk content
    3. Handles provider errors gracefully with fallback messages
    4. Ensures SSE format is always maintained
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
                    
                # CRITICAL: Wrap chunk content in proper JSON structure
                # This prevents "Unexpected token 'd'" errors when client parses SSE
                try:
                    # Check if chunk is already JSON
                    if chunk.startswith('{') or chunk.startswith('['):
                        # Validate it's proper JSON
                        json.loads(chunk)
                        # Already valid JSON, send as-is in SSE format
                        yield f"data: {chunk}\n\n"
                    else:
                        # Plain text chunk - wrap in JSON object
                        safe_chunk = {
                            "content": chunk,
                            "type": "text"
                        }
                        yield f"data: {json.dumps(safe_chunk)}\n\n"
                except (json.JSONDecodeError, ValueError):
                    # Chunk is not valid JSON, wrap it safely
                    safe_chunk = {
                        "content": chunk,
                        "type": "text"
                    }
                    yield f"data: {json.dumps(safe_chunk)}\n\n"
                
        except asyncio.CancelledError:
            logger.info("Stream cancelled by client")
            raise
        except GeneratorExit:
            logger.info("Stream closed by client")
            raise
        except StopAsyncIteration:
            logger.info("Stream completed normally")
            raise
        except Exception as e:
            logger.error(f"Error in stream response: {e}", exc_info=True)
            # Send error message to client in proper SSE JSON format
            error_payload = {
                "error": "Stream interrupted",
                "message": "Please try again",
                "type": "error",
                "details": str(e)
            }
            yield f"data: {json.dumps(error_payload)}\n\n"
            # Don't re-raise - let stream complete gracefully
            return

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
            "Content-Type": "text/event-stream; charset=utf-8",
        },
    )
