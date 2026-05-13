"""Per-user sandbox directories for agent file + terminal tools."""

from __future__ import annotations

import hashlib
import os
import re
from pathlib import Path
from typing import Optional

from core.config import settings

_MAX_PATH_BYTES = 240


def workspace_key_from_principal(user_email: str, request_id: Optional[str] = None) -> str:
    """Stable opaque id for sandbox folder naming."""
    raw = (user_email or "guest").lower().strip()
    salt = getattr(settings, "SANDBOX_USER_SALT", "") or ""
    h = hashlib.sha256(f"{salt}:{raw}:{request_id or ''}".encode()).hexdigest()
    return h[:32]


def get_workspace_root(workspace_key: str) -> Path:
    base = getattr(settings, "SANDBOX_ROOT", None)
    if base:
        root = Path(base)
    else:
        root = Path(os.environ.get("TEMP") or os.environ.get("TMP") or "/tmp") / "astramind_workspace"
    ws = root / workspace_key
    ws.mkdir(parents=True, exist_ok=True)
    (ws / "notes").mkdir(exist_ok=True)
    (ws / "build").mkdir(exist_ok=True)
    return ws.resolve()


def resolve_safe_path(workspace_root: Path, relative: str) -> Path:
    """Resolve a user-relative path inside workspace; raises ValueError if escaping."""
    if not relative or len(relative) > _MAX_PATH_BYTES:
        raise ValueError("invalid path")
    clean = relative.replace("\\", "/").strip("/")
    for segment in clean.split("/"):
        if segment == "..":
            raise ValueError("path traversal")
    workspace_root = workspace_root.resolve()
    candidate = (workspace_root / clean).resolve()
    try:
        candidate.relative_to(workspace_root)
    except ValueError:
        raise ValueError("outside workspace") from None
    return candidate
