"""
AstraMind Agentic Orchestrator — ReAct Pattern with Live Event Streaming

Architecture:
- ReAct (Reason + Act) loop: Plan → Execute tools → Observe → Repeat → Answer
- Parallel tool execution for speed
- Rich tool suite: web search, code execution, file ops, bash, git clone, calculator, URL fetch
- Streaming events so the frontend can show live tool activity (like Claude artifacts)
- Graceful degradation when tools fail
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
from typing import Any, AsyncGenerator, Dict, List, Optional

from core.config import settings
from services.ai_router import AIRouter
from services.models import resolve_model
from services.sandbox_workspace import workspace_key_from_principal
from services.text_completion import collect_openai_style_stream
from services.tool_executor import ToolExecutor

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────────────────────
# TOOL SPECIFICATION (sent to LLM planner)
# ──────────────────────────────────────────────────────────────────────────────

TOOL_SPEC = """
Available tools (use EXACT names in lowercase):

1. web_search
   {"query": "<string>", "max_results": <number, default 5>}
   → Search the web for current information, news, facts, prices

2. fetch_url
   {"url": "<https://...>", "extract_text": true}
   → Fetch and read a specific web page

3. write_file
   {"path": "<relative path>", "content": "<file content>"}
   → Create or update any file in the workspace

4. read_file
   {"path": "<relative path>"}
   → Read a file from the workspace

5. list_dir
   {"path": "<relative path, default '.'>"}
   → List directory contents as a tree

6. run_code
   {"language": "python", "code": "<python code>"}
   → Execute Python code and return output

7. bash_run
   {"command": "<bash command string>"}
   → Run a bash command inside the workspace (git, npm, pip, ls, cat, etc.)

8. git_clone
   {"url": "<https://github.com/...>", "destination": "<optional folder name>"}
   → Clone a public GitHub/GitLab repository into the workspace

9. markdown_to_html
   {"markdown_path": "<.md>", "html_path": "<.html>"}
   → Convert a markdown file to an HTML file

10. list_workspace
    {"max_entries": <number, default 100>}
    → List all files in the workspace (flat list with sizes)

11. run_terminal
    {"argv": ["git", "status"]}
    → Run an allowlisted command with explicit argv array

12. calculate
    {"expression": "<math expression>"}
    → Evaluate a mathematical expression safely

13. call_acp_webhook
    {"url": "<https://...>", "payload": {<json data>}, "secret": "<optional hmac secret>"}
    → Call an outbound MCP/ACP tool webhook with HMAC-SHA256 signature

Tool selection rules:
- Use web_search for anything time-sensitive (news, prices, current events)
- Use bash_run for general terminal tasks (ls, cat, grep, npm install, pip install)
- Use git_clone to clone repos, then bash_run or read_file to explore them
- Use run_code for data analysis, calculations, algorithms
- Use write_file when user wants to create documents or code files
- Use fetch_url to read specific URLs mentioned by user
- Max 6 tool_calls per planning step
- NEVER use ".." in file paths
- NEVER use absolute paths (always relative to workspace)
"""


# ──────────────────────────────────────────────────────────────────────────────
# PLANNER PROMPT
# ──────────────────────────────────────────────────────────────────────────────

def _build_planner_prompt(
    user_goal: str,
    execution_log: str,
    history_hint: str,
    step: int,
    max_steps: int,
) -> str:
    return f"""You are AstraMind's internal reasoning agent. Use the ReAct pattern: Reason, then Act.

{TOOL_SPEC}

STEP {step + 1} of {max_steps}. Budget your tool calls wisely — don't repeat searches.

Respond with EXACTLY ONE JSON object (no prose before or after the JSON):

If you need to use tools:
{{"finish": false, "thought": "<brief reasoning about what to do and why>", "tool_calls": [{{"tool": "<name>", "args": {{...}}}}]}}

If you have enough information to answer:
{{"finish": true, "thought": "<brief summary of findings>", "answer_markdown": "<comprehensive answer in markdown format>"}}

--- Conversation context (last few turns) ---
{history_hint or "(none)"}

--- Tool execution log so far ---
{execution_log or "(none — first step)"}

--- User goal ---
{user_goal}

Think carefully. Use tools to gather REAL information. Produce a comprehensive, accurate answer."""


# ──────────────────────────────────────────────────────────────────────────────
# ENHANCED TOOL EXECUTOR (adds calculate, fetch_url, run_code)
# ──────────────────────────────────────────────────────────────────────────────

class AgentToolExecutor(ToolExecutor):
    """Extended tool executor with calculate, fetch_url, run_code, and ACP webhook."""

    async def run(self, tool: str, args: Dict[str, Any]) -> str:
        name = (tool or "").strip().lower()

        if name == "calculate":
            return await self._calculate(args)
        if name == "fetch_url":
            return await self._fetch_url(args)
        if name == "run_code":
            return await self._run_code(args)
        if name == "call_acp_webhook":
            return await self._call_acp_webhook(args)
        if name in ("stock_analyzer", "content_creator", "trip_planner", "edu_helper"):
            try:
                from core.agent_skills import RICH_BUILTIN_TOOLS
                tool_meta = RICH_BUILTIN_TOOLS.get(name)
                if tool_meta:
                    return tool_meta["handler"](args)
            except Exception as e:
                logger.error("Built-in tool %s failed: %s", name, e)
                return f"[{name}] error: {e}"

        # Delegate to base (web_search, write_file, read_file, bash_run, git_clone, etc.)
        return await super().run(tool, args)

    async def _calculate(self, args: Dict[str, Any]) -> str:
        expr = str(args.get("expression", "")).strip()
        if not expr or len(expr) > 500:
            return "[calculate] invalid or missing expression"
        try:
            import math
            allowed_names = {k: v for k, v in math.__dict__.items() if not k.startswith("_")}
            allowed_names.update({"abs": abs, "round": round, "min": min, "max": max, "sum": sum})
            result = eval(expr, {"__builtins__": {}}, allowed_names)  # noqa: S307
            return f"Result: {result}"
        except Exception as e:
            return f"[calculate] error: {e}"

    async def _fetch_url(self, args: Dict[str, Any]) -> str:
        url = str(args.get("url", "")).strip()
        if not url.startswith(("http://", "https://")):
            return "[fetch_url] URL must start with http:// or https://"
        try:
            import httpx
            async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
                resp = await client.get(url, headers={"User-Agent": "AstraMind-Agent/2.0"})
                resp.raise_for_status()
                ct = resp.headers.get("content-type", "")
                if "html" in ct:
                    text = re.sub(r"<[^>]+>", " ", resp.text)
                    text = re.sub(r"\s+", " ", text).strip()
                    return text[:8_000]
                return resp.text[:8_000]
        except Exception as e:
            return f"[fetch_url] failed: {e}"

    async def _run_code(self, args: Dict[str, Any]) -> str:
        code = str(args.get("code", "")).strip()
        if not code:
            return "[run_code] no code provided"
        language = str(args.get("language", "python")).lower()
        if language != "python":
            return f"[run_code] only Python is supported; got: {language}"

        import sys as _sys
        import tempfile
        import os

        with tempfile.NamedTemporaryFile(
            suffix=".py", mode="w", delete=False, encoding="utf-8", dir=str(self.workspace_root)
        ) as f:
            f.write(code)
            tmp_path = f.name

        try:
            import subprocess
            proc = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: subprocess.run(
                    [_sys.executable, tmp_path],
                    cwd=str(self.workspace_root),
                    capture_output=True, text=True, timeout=30.0, shell=False,
                ),
            )
            out = (proc.stdout or "").strip()[:8_000]
            err = (proc.stderr or "").strip()[:2_000]
            result = f"exit={proc.returncode}\n"
            if out:
                result += f"--- output ---\n{out}\n"
            if err:
                result += f"--- stderr ---\n{err}\n"
            return result.strip() or f"exit={proc.returncode} (no output)"
        except Exception as e:
            return f"[run_code] error: {e}"
        finally:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass

    async def _call_acp_webhook(self, args: Dict[str, Any]) -> str:
        url = str(args.get("url", "")).strip()
        payload = args.get("payload", {})
        secret = str(args.get("secret", "astramind_default_secret")).strip()
        if not url.startswith(("http://", "https://")):
            return "[call_acp_webhook] URL must start with http:// or https://"

        import httpx
        import hmac
        import hashlib

        payload_bytes = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        signature = hmac.new(secret.encode(), payload_bytes, hashlib.sha256).hexdigest()
        headers = {
            "Content-Type": "application/json",
            "X-AstraMind-Signature": f"sha256={signature}",
            "User-Agent": "AstraMind-Enterprise-Agent/2.0",
        }

        tor_proxy = getattr(settings, "TOR_PROXY_URL", None)
        enable_tor = getattr(settings, "ENABLE_TOR_ISOLATION", False)
        proxies = {"all://": tor_proxy} if (enable_tor and tor_proxy) else None

        try:
            async with httpx.AsyncClient(proxies=proxies, timeout=20.0, follow_redirects=True) as client:
                resp = await client.post(url, headers=headers, content=payload_bytes)
                resp.raise_for_status()
                return f"[call_acp_webhook] ✓ status={resp.status_code}\n{resp.text[:6_000]}"
        except Exception as e:
            logger.error("ACP webhook failed: %s", e)
            return f"[call_acp_webhook] failed: {e}"


# ──────────────────────────────────────────────────────────────────────────────
# JSON EXTRACTION
# ──────────────────────────────────────────────────────────────────────────────

def _extract_json_obj(text: str) -> Optional[Dict[str, Any]]:
    """Robustly extract a JSON object from LLM output."""
    t = (text or "").strip()
    if not t:
        return None

    # Try markdown code block
    m = re.search(r"```(?:json)?\s*([\s\S]*?)```", t)
    if m:
        try:
            obj = json.loads(m.group(1).strip())
            return obj if isinstance(obj, dict) else None
        except json.JSONDecodeError:
            pass

    # Try direct parse
    try:
        obj = json.loads(t)
        return obj if isinstance(obj, dict) else None
    except json.JSONDecodeError:
        pass

    # Extract first { ... } block
    i0 = t.find("{")
    i1 = t.rfind("}")
    if i0 >= 0 and i1 > i0:
        try:
            obj = json.loads(t[i0: i1 + 1])
            return obj if isinstance(obj, dict) else None
        except json.JSONDecodeError:
            pass

    return None


# ──────────────────────────────────────────────────────────────────────────────
# STREAMING AGENT ENTRY POINT
# ──────────────────────────────────────────────────────────────────────────────

async def run_agent_stream(
    *,
    router: AIRouter,
    user_goal: str,
    history: Optional[List[Dict[str, str]]],
    model_tier: str,
    preferred_provider: str,
    user_email: str,
    request_id: str,
) -> AsyncGenerator[str, None]:
    """
    ReAct agentic loop that yields structured SSE-ready JSON event strings.

    Event types yielded (as JSON strings):
    - {"type": "thinking", "content": "<thought text>", "step": <n>}
    - {"type": "tool_start", "tool": "<name>", "args": {...}, "step": <n>, "call_idx": <i>}
    - {"type": "tool_result", "tool": "<name>", "result": "<truncated output>", "step": <n>, "call_idx": <i>}
    - {"type": "agent_done", "context": "<markdown context for final AI call>"}
    - {"type": "error", "message": "<error message>"}
    """
    if not getattr(settings, "ENABLE_AGENT_TOOLS", True):
        yield json.dumps({"type": "agent_done", "context": ""})
        return

    max_steps = int(getattr(settings, "AGENT_MAX_STEPS", 6))
    planner_tier = getattr(settings, "AGENT_PLANNER_MODEL", None) or "balanced"
    ws_key = workspace_key_from_principal(user_email, request_id)
    executor = AgentToolExecutor(ws_key)

    log_parts: List[str] = []
    hist_hint = ""
    if history:
        tail = history[-6:]
        hist_hint = "\n".join(
            f'{m.get("role", "?")}: {(m.get("content") or "")[:600]}' for m in tail
        )

    for step in range(max_steps):
        planner_prompt = _build_planner_prompt(
            user_goal=user_goal,
            execution_log="\n\n".join(log_parts[-8:]),
            history_hint=hist_hint,
            step=step,
            max_steps=max_steps,
        )

        # Call LLM planner
        try:
            gen = router.stream_with_fallback(
                prompt=planner_prompt,
                model=planner_tier,
                preferred_provider=preferred_provider,
                messages=None,
            )
            raw = await collect_openai_style_stream(gen)
        except Exception as e:
            logger.warning("Agent planner LLM failed at step %d: %s", step, e)
            yield json.dumps({"type": "error", "message": f"Planner failed at step {step + 1}: {e}"})
            break

        decision = _extract_json_obj(raw)
        if not decision:
            logger.warning("Agent planner returned non-JSON at step %d: %s", step, raw[:300])
            if step < 2:
                # Self-correction retry
                log_parts.append(f"⚠️ Planner output malformed at step {step + 1}, retrying...")
                continue
            break

        thought = (decision.get("thought") or "").strip()
        if thought:
            yield json.dumps({"type": "thinking", "content": thought, "step": step + 1})
            log_parts.append(f"**Thought (step {step + 1}):** {thought}")

        # Check if agent is done
        if decision.get("finish"):
            draft = (decision.get("answer_markdown") or "").strip()
            # Reflection: if draft is too short, retry
            if len(draft) < 50 and step < 2:
                log_parts.append(f"⚖️ Draft too short ({len(draft)} chars), retrying...")
                continue
            if draft:
                log_parts.append(f"\n### 📝 Agent Draft Answer\n{draft}")
            break

        # Execute tool calls in parallel
        calls = decision.get("tool_calls") or []
        if not isinstance(calls, list) or len(calls) == 0:
            break

        valid_calls = [
            (i, str(c.get("tool", "")).strip(), c.get("args") or {})
            for i, c in enumerate(calls[:6])
            if isinstance(c, dict) and c.get("tool")
        ]

        if not valid_calls:
            break

        # Emit tool_start events
        for call_idx, tool_name, tool_args in valid_calls:
            yield json.dumps({
                "type": "tool_start",
                "tool": tool_name,
                "args": tool_args,
                "step": step + 1,
                "call_idx": call_idx,
            })

        # Execute all tools in parallel
        async def _run_one(call_idx: int, tool: str, args: Dict) -> tuple:
            try:
                result = await executor.run(tool, args)
                return call_idx, tool, result, None
            except Exception as e:
                return call_idx, tool, None, str(e)

        results = await asyncio.gather(
            *[_run_one(ci, tn, ta) for ci, tn, ta in valid_calls],
            return_exceptions=False,
        )

        for call_idx, tool_name, result, error in results:
            if error:
                result = f"[exception] {error}"

            # Emit tool_result event (truncate for SSE size)
            yield json.dumps({
                "type": "tool_result",
                "tool": tool_name,
                "result": (result or "")[:4_000],
                "step": step + 1,
                "call_idx": call_idx,
            })

            # Add to execution log for context
            log_parts.append(
                f"\n**🔧 Tool: `{tool_name}`**\n"
                f"```\n{str(result or '')[:6_000]}\n```"
            )

    # Build context block (strip internal thoughts for cleaner context)
    body_lines = [
        p for p in log_parts
        if p.strip() and not p.startswith("**Thought") and not p.startswith("⚠️") and not p.startswith("⚖️")
    ]
    context = "\n\n".join(body_lines)

    yield json.dumps({"type": "agent_done", "context": context})


# ──────────────────────────────────────────────────────────────────────────────
# LEGACY BLOCKING ENTRY POINT (kept for backward compatibility)
# ──────────────────────────────────────────────────────────────────────────────

async def run_agent_phase(
    *,
    router: AIRouter,
    user_goal: str,
    history: Optional[List[Dict[str, str]]],
    model_tier: str,
    preferred_provider: str,
    user_email: str,
    request_id: str,
) -> str:
    """
    Backward-compatible wrapper that collects the streaming agent events
    and returns a single markdown context block.

    Used by the legacy /api/v1/chat endpoint (non-streaming agent path).
    """
    context = ""
    async for event_str in run_agent_stream(
        router=router,
        user_goal=user_goal,
        history=history,
        model_tier=model_tier,
        preferred_provider=preferred_provider,
        user_email=user_email,
        request_id=request_id,
    ):
        try:
            event = json.loads(event_str)
            if event.get("type") == "agent_done":
                context = event.get("context", "")
                break
        except Exception:
            pass

    if not context.strip():
        return ""

    return (
        "### 🤖 AstraMind Agent Workspace\n"
        "_The following research and tool execution steps were performed:_\n\n"
        f"{context}\n\n"
        "---\n"
        "_Use the above context to give a comprehensive, accurate final answer directly to the user._"
    )
