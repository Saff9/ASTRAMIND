"""Execute sandboxed agent tools (files, markdown→HTML, web search, restricted CLI)."""

from __future__ import annotations

import asyncio
import logging
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

import bleach

from core.config import settings
from services.sandbox_workspace import get_workspace_root, resolve_safe_path
from services.web_search import fetch_web_search

logger = logging.getLogger(__name__)

try:
    import markdown as md_lib
except ImportError:
    md_lib = None  # type: ignore


def _allowed_executable(name: str) -> bool:
    allow = getattr(settings, "SANDBOX_ALLOWED_BINARIES", "") or ""
    allowed = {x.strip().lower() for x in allow.split(",") if x.strip()}
    if not allowed:
        allowed = {
            "python",
            "py",
            "pip",
            "pip3",
            "npm",
            "npx",
            "node",
            "git",
            "dotnet",
            "rustc",
            "cargo",
        }
    return name.lower() in allowed


class ToolExecutor:
    """Per-request executor bound to one workspace."""

    def __init__(self, workspace_key: str) -> None:
        self.workspace_root = get_workspace_root(workspace_key)
        self.key = workspace_key

    async def run(self, tool: str, args: Dict[str, Any]) -> str:
        name = (tool or "").strip().lower()
        try:
            if name == "web_search":
                q = str(args.get("query", "")).strip()
                if not q or len(q) > 500:
                    return "[web_search] invalid query"
                ctx = await fetch_web_search(q, max_results=int(args.get("max_results", 5)))
                return ctx or "[web_search] no results"

            if name == "write_markdown_file":
                rel = str(args.get("path", "")).strip()
                content = str(args.get("content", ""))
                if not rel.lower().endswith(".md"):
                    return "[write_markdown_file] path must end with .md"
                path = resolve_safe_path(self.workspace_root, rel)
                path.parent.mkdir(parents=True, exist_ok=True)
                max_bytes = int(getattr(settings, "SANDBOX_MAX_FILE_BYTES", 2_000_000))
                raw = content.encode("utf-8")
                if len(raw) > max_bytes:
                    return f"[write_markdown_file] content exceeds {max_bytes} bytes"
                path.write_text(content, encoding="utf-8")
                return f"[write_markdown_file] wrote {len(raw)} bytes → {rel}"

            if name == "read_file":
                rel = str(args.get("path", "")).strip()
                path = resolve_safe_path(self.workspace_root, rel)
                if not path.is_file():
                    return f"[read_file] not found: {rel}"
                max_bytes = int(getattr(settings, "SANDBOX_MAX_FILE_BYTES", 2_000_000))
                data = path.read_bytes()
                if len(data) > max_bytes:
                    return f"[read_file] file too large ({len(data)} bytes)"
                return data.decode("utf-8", errors="replace")

            if name == "markdown_to_html_file":
                md_rel = str(args.get("markdown_path", "")).strip()
                html_rel = str(args.get("html_path", "")).strip()
                if not md_rel.lower().endswith(".md"):
                    return "[markdown_to_html_file] markdown_path must be .md"
                if not html_rel.lower().endswith(".html"):
                    return "[markdown_to_html_file] html_path must be .html"
                md_path = resolve_safe_path(self.workspace_root, md_rel)
                if not md_path.is_file():
                    return "[markdown_to_html_file] markdown file missing"
                raw_md = md_path.read_text(encoding="utf-8")
                if md_lib is None:
                    return "[markdown_to_html_file] markdown package not installed on server"
                html_body = md_lib.markdown(
                    raw_md,
                    extensions=["fenced_code", "tables", "nl2br"],
                )
                _tags = [
                    "p", "div", "span", "h1", "h2", "h3", "h4", "h5", "pre", "code",
                    "a", "ul", "ol", "li", "blockquote", "strong", "em", "hr", "br",
                    "table", "thead", "tbody", "tr", "th", "td", "img",
                ]
                safe = bleach.clean(
                    html_body,
                    tags=_tags,
                    attributes={
                        "a": ["href", "title", "rel"],
                        "img": ["src", "alt", "title"],
                        "td": ["colspan", "rowspan"],
                        "th": ["colspan", "rowspan"],
                    },
                )
                full = (
                    "<!DOCTYPE html><html><head><meta charset=\"utf-8\">"
                    "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
                    "<title>Converted</title></head><body>"
                    f"{safe}</body></html>"
                )
                out = resolve_safe_path(self.workspace_root, html_rel)
                out.parent.mkdir(parents=True, exist_ok=True)
                out.write_text(full, encoding="utf-8")
                return f"[markdown_to_html_file] wrote HTML → {html_rel}"

            if name == "list_workspace":
                max_entries = int(args.get("max_entries", 200))
                lines: List[str] = []
                count = 0
                for p in sorted(self.workspace_root.rglob("*")):
                    if count >= max_entries:
                        lines.append("… (truncated)")
                        break
                    if p.is_file():
                        rel = p.relative_to(self.workspace_root).as_posix()
                        lines.append(f"{rel}\t{p.stat().st_size}b")
                        count += 1
                return "\n".join(lines) if lines else "(empty workspace)"

            if name == "run_terminal":
                argv = args.get("argv")
                if not isinstance(argv, list) or len(argv) == 0:
                    return "[run_terminal] argv must be a non-empty array"
                exe = str(argv[0])
                base_exe = Path(exe).name
                if not _allowed_executable(base_exe):
                    return f"[run_terminal] executable not allowed: {base_exe}"
                timeout = float(getattr(settings, "SANDBOX_COMMAND_TIMEOUT_SECONDS", 45.0))
                cwd = self.workspace_root

                def _run() -> subprocess.CompletedProcess[str]:
                    # Resolve python → sys.executable for portability
                    cmd = list(argv)
                    if base_exe.lower() in ("python", "python3"):
                        cmd[0] = sys.executable
                    return subprocess.run(
                        cmd,
                        cwd=str(cwd),
                        capture_output=True,
                        text=True,
                        timeout=timeout,
                        shell=False,
                    )

                proc = await asyncio.get_event_loop().run_in_executor(None, _run)
                out = proc.stdout or ""
                err = proc.stderr or ""
                code = proc.returncode
                trim = 12000
                blob = f"exit={code}\n--- stdout ---\n{out[:trim]}"
                if err:
                    blob += f"\n--- stderr ---\n{err[:trim]}"
                return blob

            return f"[unknown tool] {tool}"

        except asyncio.TimeoutError:
            return "[tool] timeout"
        except subprocess.TimeoutExpired:
            return "[run_terminal] timeout"
        except ValueError as ve:
            return f"[tool error] {ve}"
        except Exception as e:
            logger.exception("tool failure %s %s", tool, args)
            return f"[tool error] {type(e).__name__}: {e}"
