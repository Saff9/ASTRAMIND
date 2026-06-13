# backend/services/stream.py
"""
SSE streaming response wrapper with support for both text chunks
and structured agent/tool events.
"""

import asyncio
import json
from fastapi.responses import StreamingResponse
from typing import Any, AsyncIterator, Optional
import logging

from core.system_prompt import system_suffix_stack, local_time_context

logger = logging.getLogger(__name__)


def stream_response(
    generator: AsyncIterator[str],
    *,
    system_suffix: Optional[str] = None,
    local_time: Optional[str] = None,
    user_email: Optional[str] = None,
    user_prompt: Optional[str] = None,
    ai_router: Optional[Any] = None,
) -> StreamingResponse:
    """
    Wraps an async generator into a FastAPI SSE StreamingResponse.

    Handles two event formats:
    - Plain text chunks (from AI provider) → {"content": "...", "type": "text"}
    - Pre-formatted structured events (from agent) → passed through unchanged if valid JSON

    SSE format: `data: <json_string>\n\n`
    """

    async def event_stream():
        full_assistant_content = []
        try:
            with local_time_context(local_time):
                with system_suffix_stack(system_suffix or ""):
                    async for chunk in generator:
                        # Skip None or empty
                        if chunk is None:
                            continue
                        if not isinstance(chunk, str):
                            try:
                                chunk = str(chunk)
                            except Exception as e:
                                logger.error(f"Failed to convert chunk to string: {e}")
                                continue

                        if not chunk.strip():
                            continue

                        # Try to parse as JSON
                        try:
                            parsed = json.loads(chunk)
                            if isinstance(parsed, dict):
                                event_type = parsed.get("type", "")

                                # Structured agent events pass through unchanged
                                if event_type in (
                                    "thinking", "tool_start", "tool_result",
                                    "agent_done", "error", "done",
                                ):
                                    yield f"data: {json.dumps(parsed)}\n\n"
                                    continue

                                # Text events — extract content from known formats
                                content = None
                                if "choices" in parsed and parsed["choices"]:
                                    delta = parsed["choices"][0].get("delta", {})
                                    content = delta.get("content")
                                    if parsed["choices"][0].get("finish_reason") == "stop":
                                        continue
                                elif "delta" in parsed and isinstance(parsed["delta"], dict):
                                    content = parsed["delta"].get("text")
                                elif "content" in parsed:
                                    content = parsed["content"]

                                if content:
                                    full_assistant_content.append(content)
                                    yield f"data: {json.dumps({'content': content, 'type': 'text'})}\n\n"
                                # else: skip empty/unknown structured chunk
                            else:
                                full_assistant_content.append(str(parsed))
                                yield f"data: {json.dumps({'content': str(parsed), 'type': 'text'})}\n\n"

                        except (json.JSONDecodeError, ValueError, TypeError, KeyError):
                            # Raw string chunk — wrap as text
                            full_assistant_content.append(chunk)
                            yield f"data: {json.dumps({'content': chunk, 'type': 'text'})}\n\n"

            # Stream finished successfully, save to SQLite database
            if user_email and user_prompt and full_assistant_content:
                assistant_response = "".join(full_assistant_content)
                try:
                    from app.db.session import get_db_session
                    from services.conversation_store import save_message, summarize_if_needed
                    async with get_db_session() as db:
                        if db:
                            await save_message(db, user_email, "user", user_prompt)
                            await save_message(db, user_email, "assistant", assistant_response)
                            if ai_router:
                                await summarize_if_needed(db, user_email, ai_router)
                except Exception as save_err:
                    logger.error(f"Error saving stream messages to SQLite: {save_err}")

        except asyncio.CancelledError:
            logger.info("Stream cancelled by client")
            # Save partial response even if cancelled
            if user_email and user_prompt and full_assistant_content:
                assistant_response = "".join(full_assistant_content)
                try:
                    from app.db.session import get_db_session
                    from services.conversation_store import save_message
                    async with get_db_session() as db:
                        if db:
                            await save_message(db, user_email, "user", user_prompt)
                            await save_message(db, user_email, "assistant", assistant_response + " [cancelled]")
                except Exception as save_err:
                    logger.error(f"Error saving partial cancelled messages: {save_err}")
            raise
        except GeneratorExit:
            logger.info("Stream closed by client")
            raise
        except StopAsyncIteration:
            logger.info("Stream completed normally")
            raise
        except Exception as e:
            logger.error(f"Error in stream response: {e}", exc_info=True)
            error_payload = {
                "error": "Stream interrupted",
                "message": "Please try again",
                "type": "error",
                "details": str(e),
            }
            yield f"data: {json.dumps(error_payload)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Content-Type": "text/event-stream; charset=utf-8",
        },
    )
