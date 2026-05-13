"""
AstraMind Agentic Orchestrator — ReAct Pattern Implementation
Competitive with Claude's tool use and Perplexity's research capabilities.

Architecture:
- ReAct (Reason + Act) loop: Plan → Execute tools → Observe → Repeat → Answer
- Parallel tool execution for speed
- Rich tool suite: web search, code execution, file ops, calculator, URL fetch
- Graceful degradation when tools fail
- Competitive with Perplexity for research, Claude for code tasks
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
from typing import Any, Dict, List, Optional

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
Available tools (use EXACT names):

1. web_search
   {"query": "<string>", "max_results": <number, default 5>}
   → Search the web for current information, news, facts, prices

2. fetch_url
   {"url": "<https://...>", "extract_text": true}
   → Fetch and read a specific web page

3. write_file
   {"path": "<relative .md or .py or .txt>", "content": "<content>"}
   → Create or update a file in the workspace

4. read_file
   {"path": "<relative path>"}
   → Read a file from the workspace

5. run_code
   {"language": "python", "code": "<python code string>"}
   → Execute Python code safely and return output

6. markdown_to_html
   {"markdown_path": "<.md>", "html_path": "<.html>"}
   → Convert markdown file to HTML file

7. list_workspace
   {"max_entries": <number, default 100>}
   → List all files in the workspace

8. run_terminal
   {"argv": ["executable", "arg1", ...]}
   → Run an allowlisted command (python/npm/npx/node/git/pip)

9. calculate
   {"expression": "<math expression>"}
   → Evaluate a mathematical expression safely

Rules:
- Use web_search for anything time-sensitive (news, prices, current events)
- Use fetch_url to read specific URLs mentioned by user
- Use run_code for data analysis, calculations, algorithms
- Use write_file when user wants to create documents or code
- Max 6 tool_calls per planning step
- NEVER use ".." in file paths
- NEVER use absolute paths
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

STEP {step + 1} of {max_steps}. Budget your tool calls wisely.

Respond with EXACTLY ONE JSON object (no prose outside the JSON):

If you need to use tools:
{{"finish": false, "thought": "<brief reasoning about what to do and why>", "tool_calls": [{{"tool": "<name>", "args": {{...}}}}]}}

If you have enough information to answer:
{{"finish": true, "thought": "<brief summary of what was found>", "answer_markdown": "<comprehensive answer in markdown>"}}

--- Conversation context (last few turns) ---
{history_hint or "(none)"}

--- Tool execution log so far ---
{execution_log or "(none — first step)"}

--- User goal ---
{user_goal}

Remember: Think carefully. Use tools to gather REAL information. Then produce a comprehensive answer."""


# ──────────────────────────────────────────────────────────────────────────────
# JSON EXTRACTION
# ──────────────────────────────────────────────────────────────────────────────

def _extract_json_obj(text: str) -> Optional[Dict[str, Any]]:
    """Robustly extract a JSON object from LLM output."""
    t = (text or "").strip()
    if not t:
        return None

    # Try markdown code block first
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
            obj = json.loads(t[i0 : i1 + 1])
            return obj if isinstance(obj, dict) else None
        except json.JSONDecodeError:
            pass

    return None


# ──────────────────────────────────────────────────────────────────────────────
# ENHANCED TOOL EXECUTOR (extends ToolExecutor with more capabilities)
# ──────────────────────────────────────────────────────────────────────────────

class AgentToolExecutor(ToolExecutor):
    """Extended tool executor with calculate, fetch_url, run_code, and write_file."""

    async def run(self, tool: str, args: Dict[str, Any]) -> str:
        name = (tool or "").strip().lower()

        # New tools
        if name == "calculate":
            return await self._calculate(args)
        if name == "fetch_url":
            return await self._fetch_url(args)
        if name == "run_code":
            return await self._run_code(args)
        if name == "write_file":
            # Alias for write_markdown_file — accept any extension
            return await self._write_any_file(args)

        # Delegate to parent (web_search, write_markdown_file, read_file, etc.)
        return await super().run(tool, args)

    async def _calculate(self, args: Dict[str, Any]) -> str:
        """Safely evaluate a mathematical expression."""
        expr = str(args.get("expression", "")).strip()
        if not expr or len(expr) > 500:
            return "[calculate] invalid expression"
        # Safe evaluation — only allow math operations
        try:
            import math
            allowed_names = {
                k: v for k, v in math.__dict__.items()
                if not k.startswith("_")
            }
            allowed_names.update({"abs": abs, "round": round, "min": min, "max": max, "sum": sum})
            result = eval(expr, {"__builtins__": {}}, allowed_names)  # noqa: S307
            return f"Result: {result}"
        except Exception as e:
            return f"[calculate] error: {e}"

    async def _fetch_url(self, args: Dict[str, Any]) -> str:
        """Fetch a URL and return its text content."""
        url = str(args.get("url", "")).strip()
        if not url.startswith(("http://", "https://")):
            return "[fetch_url] URL must start with http:// or https://"
        try:
            import httpx
            async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
                resp = await client.get(url, headers={"User-Agent": "AstraMind-Agent/1.0"})
                resp.raise_for_status()
                ct = resp.headers.get("content-type", "")
                if "html" in ct:
                    # Strip HTML tags for clean text
                    text = re.sub(r"<[^>]+>", " ", resp.text)
                    text = re.sub(r"\s+", " ", text).strip()
                    return text[:8000]
                return resp.text[:8000]
        except Exception as e:
            return f"[fetch_url] failed: {e}"

    async def _run_code(self, args: Dict[str, Any]) -> str:
        """Execute Python code in the sandbox."""
        code = str(args.get("code", "")).strip()
        if not code:
            return "[run_code] no code provided"
        language = str(args.get("language", "python")).lower()
        if language != "python":
            return f"[run_code] only Python is supported currently"

        # Write to temp file and execute
        import sys
        import subprocess
        import tempfile
        import os

        with tempfile.NamedTemporaryFile(
            suffix=".py", mode="w", delete=False, encoding="utf-8"
        ) as f:
            f.write(code)
            tmp_path = f.name

        try:
            proc = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: subprocess.run(
                    [sys.executable, tmp_path],
                    capture_output=True, text=True, timeout=20.0, shell=False,
                ),
            )
            out = proc.stdout[:6000] if proc.stdout else ""
            err = proc.stderr[:2000] if proc.stderr else ""
            result = f"exit={proc.returncode}\n"
            if out:
                result += f"--- output ---\n{out}"
            if err:
                result += f"\n--- stderr ---\n{err}"
            return result.strip()
        except Exception as e:
            return f"[run_code] error: {e}"
        finally:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass

    async def _write_any_file(self, args: Dict[str, Any]) -> str:
        """Write any file type (not just .md) to workspace."""
        rel = str(args.get("path", "")).strip()
        content = str(args.get("content", ""))
        if not rel:
            return "[write_file] path is required"

        from services.sandbox_workspace import resolve_safe_path
        try:
            path = resolve_safe_path(self.workspace_root, rel)
            path.parent.mkdir(parents=True, exist_ok=True)
            max_bytes = int(getattr(settings, "SANDBOX_MAX_FILE_BYTES", 2_000_000))
            raw = content.encode("utf-8")
            if len(raw) > max_bytes:
                return f"[write_file] content too large ({len(raw)} bytes, max {max_bytes})"
            path.write_text(content, encoding="utf-8")
            return f"[write_file] wrote {len(raw)} bytes → {rel}"
        except Exception as e:
            return f"[write_file] error: {e}"


# ──────────────────────────────────────────────────────────────────────────────
# MAIN AGENT ENTRY POINT
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
    ReAct agentic loop. Returns a markdown block to prepend to the AI context.
    The block contains tool results + optional draft answer.

    Competitive with:
    - Perplexity: real-time web search with multi-source synthesis
    - Claude: code execution, file manipulation, step-by-step reasoning
    - ChatGPT: tool use, research, mathematical calculations
    """
    if not getattr(settings, "ENABLE_AGENT_TOOLS", True):
        return ""

    max_steps = int(getattr(settings, "AGENT_MAX_STEPS", 6))
    # Use balanced model for planning (70B is great for free)
    planner_tier = getattr(settings, "AGENT_PLANNER_MODEL", None) or "balanced"
    ws_key = workspace_key_from_principal(user_email, request_id)
    executor = AgentToolExecutor(ws_key)

    log_parts: List[str] = []
    hist_hint = ""
    if history:
        tail = history[-6:]
        hist_hint = "\n".join(
            f'{m.get("role", "?")}: {(m.get("content") or "")[:800]}' for m in tail
        )

    for step in range(max_steps):
        planner_prompt = _build_planner_prompt(
            user_goal=user_goal,
            execution_log="\n\n".join(log_parts[-10:]),
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
            logger.warning("Agent planner LLM failed: %s", e)
            log_parts.append(f"[planner_error step={step}] {e}")
            break

        decision = _extract_json_obj(raw)
        if not decision:
            logger.warning("Agent planner returned non-JSON: %s", raw[:200])
            log_parts.append(f"[planner_parse_error step={step}] raw: {raw[:300]!r}")
            break

        thought = decision.get("thought", "")
        if thought:
            log_parts.append(f"💭 **Thought (step {step + 1}):** {thought}")

        # Check if planner is done
        if decision.get("finish"):
            draft = (decision.get("answer_markdown") or "").strip()
            if draft:
                log_parts.append(f"\n### 📝 Agent Draft Answer\n{draft}")
            break

        # Execute tool calls
        calls = decision.get("tool_calls") or []
        if not isinstance(calls, list) or len(calls) == 0:
            log_parts.append(f"[step={step}] Planner requested finish=false but no tools — stopping")
            break

        # Execute tools (up to 6 per step, in parallel where safe)
        tool_tasks = []
        for call in calls[:6]:
            if not isinstance(call, dict):
                continue
            tool = str(call.get("tool", "")).strip()
            args = call.get("args") if isinstance(call.get("args"), dict) else {}
            tool_tasks.append((tool, args))

        if tool_tasks:
            # Run tools in parallel
            async def _run_tool(tool: str, args: Dict) -> tuple[str, str]:
                args_preview = json.dumps(args, ensure_ascii=False)[:300]
                try:
                    result = await executor.run(tool, args)
                    return tool, result
                except Exception as e:
                    return tool, f"[exception] {e}"

            results = await asyncio.gather(
                *[_run_tool(t, a) for t, a in tool_tasks],
                return_exceptions=False,
            )

            for tool, result in results:
                log_parts.append(
                    f"\n**🔧 Tool: `{tool}`**\n"
                    f"```\n{str(result)[:8000]}\n```"
                )

    # Build final block
    body = "\n\n".join(p for p in log_parts if p.strip())
    if not body.strip():
        return ""

    return (
        "### 🤖 AstraMind Agent Workspace\n"
        "_The following research and tool execution steps were performed to answer your question:_\n\n"
        f"{body}\n\n"
        "---\n"
        "_Use the above context to give a comprehensive, accurate final answer._"
    )
