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
    # Drop request_id to make workspace persistent across requests for a user
    h = hashlib.sha256(f"{salt}:{raw}".encode()).hexdigest()
    return h[:32]


def get_dir_size(path: Path) -> int:
    """Calculate total size of directory in bytes."""
    total = 0
    if not path.exists():
        return total
    for root, dirs, files in os.walk(path):
        for f in files:
            fp = os.path.join(root, f)
            try:
                total += os.path.getsize(fp)
            except OSError:
                pass
    return total


def workspace_ttl_cleanup(max_age_days: int = 7) -> None:
    """Delete workspace directories that have not been modified/accessed in max_age_days."""
    import time
    import shutil
    base = getattr(settings, "SANDBOX_ROOT", None)
    if base:
        root = Path(base)
    else:
        root = Path(os.environ.get("TEMP") or os.environ.get("TMP") or "/tmp") / "astramind_workspace"
    
    if not root.exists():
        return

    now = time.time()
    max_age_seconds = max_age_days * 86400

    try:
        for entry in os.scandir(root):
            if entry.is_dir():
                stat = entry.stat()
                last_time = max(stat.st_mtime, stat.st_atime)
                if (now - last_time) > max_age_seconds:
                    try:
                        shutil.rmtree(entry.path)
                    except Exception:
                        pass
    except Exception:
        pass


def get_workspace_root(workspace_key: str) -> Path:
    # Run a quick cleanup on each request
    workspace_ttl_cleanup()
    
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
