"""Execute sandboxed agent tools — web search, file ops, code execution, bash, git clone."""

from __future__ import annotations

import asyncio
import logging
import os
import re
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

# ---------------------------------------------------------------------------
# Allowed executables for run_terminal (safe allowlist)
# ---------------------------------------------------------------------------
_DEFAULT_ALLOWED = {
    "python", "python3", "py",
    "pip", "pip3",
    "npm", "npx", "node",
    "git",
    "dotnet",
    "rustc", "cargo",
    "bash", "sh",
    "curl",
    "wget",
}


def _allowed_executable(name: str) -> bool:
    allow = getattr(settings, "SANDBOX_ALLOWED_BINARIES", "") or ""
    configured = {x.strip().lower() for x in allow.split(",") if x.strip()}
    allowed = configured if configured else _DEFAULT_ALLOWED
    return name.lower() in allowed


# ---------------------------------------------------------------------------
# Base ToolExecutor
# ---------------------------------------------------------------------------

class ToolExecutor:
    """Per-request executor bound to one user workspace directory."""

    def __init__(self, workspace_key: str) -> None:
        self.workspace_root = get_workspace_root(workspace_key)
        self.key = workspace_key

    async def run(self, tool: str, args: Dict[str, Any]) -> str:
        name = (tool or "").strip().lower()
        if name in ("write_file", "write_markdown_file", "create_file", "git_clone", "run_terminal", "bash_run", "run_code"):
            from services.sandbox_workspace import get_dir_size
            max_mb = 500
            if get_dir_size(self.workspace_root) > max_mb * 1024 * 1024:
                return f"[{tool} error] workspace size limit of {max_mb}MB exceeded"

        try:
            if name == "web_search":
                return await self._web_search(args)
            if name == "write_file":
                return await self._write_file(args)
            if name == "write_markdown_file":
                # Legacy alias
                args.setdefault("path", args.get("path", "output.md"))
                return await self._write_file(args)
            if name == "read_file":
                return await self._read_file(args)
            if name == "create_file":
                return await self._write_file(args)
            if name == "list_dir":
                return await self._list_dir(args)
            if name == "list_workspace":
                return await self._list_workspace(args)
            if name == "markdown_to_html_file":
                return await self._markdown_to_html(args)
            if name == "markdown_to_html":
                return await self._markdown_to_html(args)
            if name == "run_terminal":
                return await self._run_terminal(args)
            if name == "bash_run":
                return await self._bash_run(args)
            if name == "git_clone":
                return await self._git_clone(args)
            return f"[unknown tool] {tool}"
        except asyncio.TimeoutError:
            return "That command took too long. Try a shorter operation."
        except subprocess.TimeoutExpired:
            return "That command took too long. Try a shorter operation."
        except ValueError as ve:
            return f"[{tool} error] {ve}"
        except Exception as e:
            logger.exception("Tool failure %s %s", tool, args)
            return f"[{tool} error] {type(e).__name__}: {e}"

    # -----------------------------------------------------------------------
    # Individual tool implementations
    # -----------------------------------------------------------------------

    async def _web_search(self, args: Dict[str, Any]) -> str:
        q = str(args.get("query", "")).strip()
        if not q or len(q) > 500:
            return "[web_search] invalid or missing query"
        max_results = int(args.get("max_results", 5))
        ctx = await fetch_web_search(q, max_results=max_results)
        return ctx or "[web_search] no results found"

    async def _write_file(self, args: Dict[str, Any]) -> str:
        rel = str(args.get("path", "")).strip()
        content = str(args.get("content", ""))
        if not rel:
            return "[write_file] 'path' is required"
        # Security: reject path traversal
        if ".." in rel or rel.startswith("/") or rel.startswith("\\"):
            return "[write_file] invalid path — no traversal allowed"
        try:
            path = resolve_safe_path(self.workspace_root, rel)
            path.parent.mkdir(parents=True, exist_ok=True)
            max_bytes = int(getattr(settings, "SANDBOX_MAX_FILE_BYTES", 2_000_000))
            raw = content.encode("utf-8")
            if len(raw) > max_bytes:
                return f"[write_file] content too large ({len(raw):,} bytes, max {max_bytes:,})"
            path.write_text(content, encoding="utf-8")
            return f"[write_file] ✓ wrote {len(raw):,} bytes → {rel}"
        except Exception as e:
            return f"[write_file] error: {e}"

    async def _read_file(self, args: Dict[str, Any]) -> str:
        rel = str(args.get("path", "")).strip()
        if not rel:
            return "[read_file] 'path' is required"
        path = resolve_safe_path(self.workspace_root, rel)
        if not path.exists():
            return f"[read_file] not found: {rel}"
        if path.is_dir():
            return f"[read_file] '{rel}' is a directory, not a file"
        max_bytes = int(getattr(settings, "SANDBOX_MAX_FILE_BYTES", 2_000_000))
        data = path.read_bytes()
        if len(data) > max_bytes:
            return f"[read_file] file too large ({len(data):,} bytes)"
        return data.decode("utf-8", errors="replace")

    async def _list_dir(self, args: Dict[str, Any]) -> str:
        """List directory contents (tree view)."""
        rel = str(args.get("path", ".")).strip() or "."
        if ".." in rel:
            return "[list_dir] path traversal not allowed"
        try:
            if rel == ".":
                target = self.workspace_root
            else:
                target = resolve_safe_path(self.workspace_root, rel)
            if not target.exists():
                return f"[list_dir] path not found: {rel}"
            if not target.is_dir():
                return f"[list_dir] not a directory: {rel}"
            lines: List[str] = []
            self._build_tree(target, target, lines, prefix="", max_entries=200)
            return "\n".join(lines) if lines else "(empty directory)"
        except Exception as e:
            return f"[list_dir] error: {e}"

    def _build_tree(
        self,
        root: Path,
        current: Path,
        lines: List[str],
        prefix: str,
        max_entries: int,
        count: List[int] = None,
    ) -> None:
        if count is None:
            count = [0]
        entries = sorted(current.iterdir(), key=lambda p: (p.is_file(), p.name))
        for i, entry in enumerate(entries):
            if count[0] >= max_entries:
                lines.append(f"{prefix}… (truncated)")
                return
            connector = "└── " if i == len(entries) - 1 else "├── "
            icon = "📄 " if entry.is_file() else "📁 "
            size = f" ({entry.stat().st_size:,}b)" if entry.is_file() else ""
            lines.append(f"{prefix}{connector}{icon}{entry.name}{size}")
            count[0] += 1
            if entry.is_dir() and count[0] < max_entries:
                extension = "    " if i == len(entries) - 1 else "│   "
                self._build_tree(root, entry, lines, prefix + extension, max_entries, count)

    async def _list_workspace(self, args: Dict[str, Any]) -> str:
        """Flat list of all workspace files."""
        max_entries = int(args.get("max_entries", 200))
        lines: List[str] = []
        count = 0
        for p in sorted(self.workspace_root.rglob("*")):
            if count >= max_entries:
                lines.append("… (truncated)")
                break
            if p.is_file():
                rel = p.relative_to(self.workspace_root).as_posix()
                lines.append(f"{rel}\t{p.stat().st_size:,}b")
                count += 1
        return "\n".join(lines) if lines else "(empty workspace)"

    async def _markdown_to_html(self, args: Dict[str, Any]) -> str:
        md_rel = str(args.get("markdown_path", "")).strip()
        html_rel = str(args.get("html_path", "output.html")).strip()
        if not md_rel:
            return "[markdown_to_html] 'markdown_path' is required"
        if not md_rel.lower().endswith(".md"):
            return "[markdown_to_html] markdown_path must end with .md"
        md_path = resolve_safe_path(self.workspace_root, md_rel)
        if not md_path.is_file():
            return f"[markdown_to_html] file not found: {md_rel}"
        if md_lib is None:
            return "[markdown_to_html] markdown package not installed on server"
        raw_md = md_path.read_text(encoding="utf-8")
        html_body = md_lib.markdown(raw_md, extensions=["fenced_code", "tables", "nl2br"])
        _allowed_tags = [
            "p", "div", "span", "h1", "h2", "h3", "h4", "h5", "pre", "code",
            "a", "ul", "ol", "li", "blockquote", "strong", "em", "hr", "br",
            "table", "thead", "tbody", "tr", "th", "td", "img",
        ]
        safe = bleach.clean(
            html_body,
            tags=_allowed_tags,
            attributes={
                "a": ["href", "title", "rel"],
                "img": ["src", "alt", "title"],
                "td": ["colspan", "rowspan"],
                "th": ["colspan", "rowspan"],
            },
        )
        full = (
            '<!DOCTYPE html><html><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1">'
            "<title>Converted</title></head><body>"
            f"{safe}</body></html>"
        )
        out = resolve_safe_path(self.workspace_root, html_rel)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(full, encoding="utf-8")
        return f"[markdown_to_html] ✓ wrote HTML → {html_rel}"

    async def _run_terminal(self, args: Dict[str, Any]) -> str:
        """Run an allowlisted command."""
        argv = args.get("argv")
        if not isinstance(argv, list) or len(argv) == 0:
            return "[run_terminal] 'argv' must be a non-empty array"
        exe = str(argv[0])
        base_exe = Path(exe).name
        if not _allowed_executable(base_exe):
            return f"[run_terminal] executable not allowed: {base_exe}"
        return await self._exec_subprocess(argv, cwd=self.workspace_root)

    async def _bash_run(self, args: Dict[str, Any]) -> str:
        """
        Run a bash/sh command string inside the user workspace sandbox.
        Dangerous operations (sudo, rm -rf /, etc.) are blocked.
        """
        command = str(args.get("command", "")).strip()
        if not command:
            return "[bash_run] 'command' is required"

        # Block dangerous patterns
        danger_patterns = [
            r"\bsudo\b", r"\bsu\b", r"\brm\s+-rf\s+/", r"\bchmod\b\s+777",
            r"\b(wget|curl)\s+.*\|\s*(bash|sh|python)", r";\s*rm\s+-rf",
            r"\bmkfs\b", r"\bdd\b\s+if=", r"\b/etc/passwd\b", r"\b/etc/shadow\b",
            r"\biptables\b", r"\bnmap\b", r"\bnetcat\b\s+-e",
        ]
        for pattern in danger_patterns:
            if re.search(pattern, command, re.IGNORECASE):
                return f"[bash_run] blocked: dangerous command pattern detected"

        argv = ["bash", "-c", command] if sys.platform != "win32" else ["cmd.exe", "/c", command]
        return await self._exec_subprocess(argv, cwd=self.workspace_root)

    async def _git_clone(self, args: Dict[str, Any]) -> str:
        """
        Clone a public GitHub/GitLab repository into the workspace sandbox.
        Only HTTPS URLs allowed; depth=1 for efficiency.
        """
        url = str(args.get("url", "")).strip()
        dest = str(args.get("destination", "")).strip() or ""

        # Validate URL
        if not url.startswith(("https://", "http://")):
            return "[git_clone] only HTTPS URLs are allowed"
        # Allow only major git hosts
        allowed_hosts = ("github.com", "gitlab.com", "bitbucket.org", "codeberg.org", "git.sr.ht")
        from urllib.parse import urlparse
        parsed_url = urlparse(url)
        if not any(parsed_url.netloc.endswith(h) for h in allowed_hosts):
            return f"[git_clone] host not allowed: {parsed_url.netloc}"

        # Sanitize destination dir name
        if dest:
            dest = re.sub(r"[^a-zA-Z0-9._-]", "_", dest)
            if ".." in dest:
                return "[git_clone] invalid destination path"

        # Build command
        argv = ["git", "clone", "--depth", "1", "--single-branch", url]
        if dest:
            argv.append(dest)

        result = await self._exec_subprocess(argv, cwd=self.workspace_root, timeout=120.0)
        return result

    async def _exec_subprocess(
        self,
        argv: List[str],
        *,
        cwd: Path,
        timeout: float = None,
    ) -> str:
        """Common subprocess runner with output capture and safety limits."""
        if timeout is None:
            timeout = float(getattr(settings, "SANDBOX_COMMAND_TIMEOUT_SECONDS", 60.0))

        # Resolve python → sys.executable
        base_exe = Path(argv[0]).name.lower()
        cmd = list(argv)
        if base_exe in ("python", "python3", "py"):
            cmd[0] = sys.executable

        # Safe environment — no inheriting sensitive env vars
        safe_env = {
            "PATH": os.environ.get("PATH", "/usr/bin:/bin"),
            "HOME": str(cwd),
            "TMPDIR": str(cwd),
            "TEMP": str(cwd),
            "TMP": str(cwd),
            "LANG": "en_US.UTF-8",
            "PYTHONDONTWRITEBYTECODE": "1",
        }

        def _run() -> subprocess.CompletedProcess:
            return subprocess.run(
                cmd,
                cwd=str(cwd),
                capture_output=True,
                text=True,
                timeout=timeout,
                shell=False,
                env=safe_env,
            )

        try:
            proc = await asyncio.get_event_loop().run_in_executor(None, _run)
            out = (proc.stdout or "").strip()
            err = (proc.stderr or "").strip()
            trim = 10_000
            result = f"exit={proc.returncode}\n"
            if out:
                result += f"--- stdout ---\n{out[:trim]}\n"
            if err:
                result += f"--- stderr ---\n{err[:trim]}\n"
            return result.strip() or f"exit={proc.returncode} (no output)"
        except subprocess.TimeoutExpired:
            return "That command took too long. Try a shorter operation."
        except FileNotFoundError:
            return f"[error] executable not found: {cmd[0]}"
