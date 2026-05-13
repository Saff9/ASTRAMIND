"""Collect full text from OpenAI-style streaming generator chunks."""

from __future__ import annotations

import json
import logging
from typing import AsyncIterator

logger = logging.getLogger(__name__)


async def collect_openai_style_stream(generator: AsyncIterator[str]) -> str:
    """Concatenate textual deltas from provider JSON chunks or raw strings."""
    parts: list[str] = []
    async for chunk in generator:
        if chunk is None:
            continue
        if not isinstance(chunk, str):
            chunk = str(chunk)
        chunk = chunk.strip()
        if not chunk:
            continue
        try:
            parsed = json.loads(chunk)
            if isinstance(parsed, dict):
                content = None
                choices = parsed.get("choices") or []
                if choices:
                    delta = choices[0].get("delta") or {}
                    content = delta.get("content")
                    if delta.get("finish_reason") == "stop":
                        continue
                if content is None and isinstance(parsed.get("delta"), dict):
                    content = parsed["delta"].get("text")
                if content:
                    parts.append(content)
                    continue
        except (json.JSONDecodeError, KeyError, IndexError, TypeError):
            pass
        parts.append(chunk)
    return "".join(parts)
