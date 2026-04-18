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
                    
                # CRITICAL: ALL chunks must be wrapped in a JSON object for consistent client parsing
                # This prevents "Unexpected token 'd'" errors - client expects: data: {"content":"...", "type":"..."}
                # Even if chunk is already JSON from provider, we wrap it to ensure consistent format
                
                try:
                    # Try to parse chunk as JSON (provider may return JSON like {"choices":[...]})
                    parsed_json = json.loads(chunk)
                    # Chunk is valid JSON - extract content if possible, otherwise use whole chunk
                    if isinstance(parsed_json, dict):
                        # Extract content from various provider formats
                        content = None
                        # OpenAI/Groq format: {"choices":[{"delta":{"content":"..."}}]}
                        if "choices" in parsed_json and parsed_json["choices"]:
                            delta = parsed_json["choices"][0].get("delta", {})
                            content = delta.get("content")
                            # Also check for finish_reason to handle stream end
                            if delta.get("finish_reason") == "stop":
                                continue  # Skip end-of-stream markers
                        # Anthropic format: {"delta":{"text":"..."}}
                        elif "delta" in parsed_json and isinstance(parsed_json["delta"], dict):
                            content = parsed_json["delta"].get("text")
                        # Direct content field
                        elif "content" in parsed_json:
                            content = parsed_json["content"]
                        
                        if content:
                            safe_chunk = {"content": content, "type": "text"}
                        else:
                            # No extractable content, skip this chunk
                            continue
                    else:
                        # JSON but not an object (array, string, etc.), treat as content
                        safe_chunk = {"content": str(parsed_json), "type": "text"}
                    
                    yield f"data: {json.dumps(safe_chunk)}\n\n"
                    
                except (json.JSONDecodeError, ValueError, TypeError, KeyError):
                    # Chunk is not valid JSON or extraction failed - treat as plain text
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
