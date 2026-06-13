import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import ConversationMessage, UserAgentMemory

logger = logging.getLogger(__name__)

async def save_message(db: AsyncSession, user_email: str, role: str, content: str) -> None:
    """Save a conversation message turn to SQLite."""
    if not db or not user_email:
        return
    try:
        msg = ConversationMessage(
            user_email=user_email,
            role=role,
            content=content,
            created_at=datetime.now(timezone.utc)
        )
        db.add(msg)
        await db.commit()
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to save message to SQLite: {e}", exc_info=True)

async def get_conversation_history(db: AsyncSession, user_email: str, limit: int = 50) -> List[Dict[str, str]]:
    """Retrieve conversation history from SQLite (ordered by oldest first for injection)."""
    if not db or not user_email:
        return []
    try:
        stmt = (
            select(ConversationMessage)
            .where(ConversationMessage.user_email == user_email)
            .order_by(ConversationMessage.id.desc())
            .limit(limit)
        )
        result = await db.execute(stmt)
        messages = result.scalars().all()
        # Return in oldest-first order
        return [{"role": m.role, "content": m.content} for m in reversed(messages)]
    except Exception as e:
        logger.error(f"Failed to load conversation history from SQLite: {e}", exc_info=True)
        return []

async def get_agent_memory(db: AsyncSession, user_email: str) -> Dict[str, Any]:
    """Retrieve agent-specific workspace memory (cloned repos, created files, last output, summary)."""
    if not db or not user_email:
        return {
            "cloned_repos": [],
            "created_files": [],
            "last_run_output": "",
            "session_summary": ""
        }
    try:
        stmt = select(UserAgentMemory).where(UserAgentMemory.user_email == user_email)
        result = await db.execute(stmt)
        memory = result.scalar_one_or_none()
        if not memory:
            return {
                "cloned_repos": [],
                "created_files": [],
                "last_run_output": "",
                "session_summary": ""
            }
        
        try:
            cloned = json.loads(memory.cloned_repos)
        except Exception:
            cloned = []
        try:
            created = json.loads(memory.created_files)
        except Exception:
            created = []

        return {
            "cloned_repos": cloned,
            "created_files": created,
            "last_run_output": memory.last_run_output,
            "session_summary": memory.session_summary
        }
    except Exception as e:
        logger.error(f"Failed to load agent memory: {e}", exc_info=True)
        return {
            "cloned_repos": [],
            "created_files": [],
            "last_run_output": "",
            "session_summary": ""
        }

async def save_agent_memory(
    db: AsyncSession,
    user_email: str,
    cloned_repos: List[str],
    created_files: List[str],
    last_run_output: str,
    session_summary: str
) -> None:
    """Save or update agent-specific memory in SQLite."""
    if not db or not user_email:
        return
    try:
        stmt = select(UserAgentMemory).where(UserAgentMemory.user_email == user_email)
        result = await db.execute(stmt)
        memory = result.scalar_one_or_none()

        if not memory:
            memory = UserAgentMemory(
                user_email=user_email,
                cloned_repos=json.dumps(cloned_repos),
                created_files=json.dumps(created_files),
                last_run_output=last_run_output,
                session_summary=session_summary,
                updated_at=datetime.now(timezone.utc)
            )
            db.add(memory)
        else:
            memory.cloned_repos = json.dumps(cloned_repos)
            memory.created_files = json.dumps(created_files)
            memory.last_run_output = last_run_output
            if session_summary:
                memory.session_summary = session_summary
            memory.updated_at = datetime.now(timezone.utc)

        await db.commit()
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to save agent memory: {e}", exc_info=True)

async def summarize_if_needed(db: AsyncSession, user_email: str, ai_router: Any) -> None:
    """If user conversation is long (>20 turns), compile a summary of the session and store it."""
    if not db or not user_email or not ai_router:
        return
    try:
        # Check total message count
        stmt = select(ConversationMessage).where(ConversationMessage.user_email == user_email)
        result = await db.execute(stmt)
        messages = result.scalars().all()
        
        if len(messages) <= 20:
            return
            
        logger.info(f"Summarizing conversation for {user_email} (total messages: {len(messages)})")
        
        # Compile all turns into a string for the summarizer
        context_str = "\n".join(f"{m.role}: {m.content}" for m in messages)
        prompt = (
            "Summarize the main focus, project details, created files, cloned repositories, and decisions made in this "
            "development session. Keep it concise (max 3 sentences). Do not use placeholders or preamble:\n\n"
            f"{context_str}"
        )
        
        summary = ""
        try:
            # Call AI router using a fast/cheap fallback model or Groq
            async for chunk in ai_router.stream_with_fallback(
                prompt=prompt,
                model="fast",
                messages=None,
            ):
                summary += chunk
        except Exception as ai_err:
            logger.error(f"AI summarization call failed: {ai_err}")
            return
            
        summary = summary.strip()
        if summary:
            # Update UserAgentMemory
            stmt_mem = select(UserAgentMemory).where(UserAgentMemory.user_email == user_email)
            res_mem = await db.execute(stmt_mem)
            memory = res_mem.scalar_one_or_none()
            
            if not memory:
                memory = UserAgentMemory(
                    user_email=user_email,
                    session_summary=summary,
                    updated_at=datetime.now(timezone.utc)
                )
                db.add(memory)
            else:
                memory.session_summary = summary
                memory.updated_at = datetime.now(timezone.utc)
            
            # Keep only the last 10 messages in history to prune SQLite size
            keep_ids = [m.id for m in messages[-10:]]
            if keep_ids:
                del_stmt = delete(ConversationMessage).where(
                    ConversationMessage.user_email == user_email,
                    ConversationMessage.id.not_in(keep_ids)
                )
                await db.execute(del_stmt)
                
            await db.commit()
            logger.info(f"Successfully pruned & summarized history for {user_email}")
            
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in conversation summarization logic: {e}", exc_info=True)


async def update_workspace_state(db: AsyncSession, user_email: str, workspace_root: Path) -> None:
    """Scan the workspace directory and update cloned_repos and created_files in SQLite."""
    if not db or not user_email or not workspace_root.exists():
        return
    
    cloned_repos = []
    created_files = []

    try:
        # Scan top level for directories and files
        for item in workspace_root.iterdir():
            if item.name in ("notes", "build", "__pycache__", ".git"):
                continue
            if item.is_dir():
                # If there's a .git directory inside, it's a cloned repo
                if (item / ".git").exists():
                    cloned_repos.append(item.name)
                else:
                    # Treat other directories as folders / created structures
                    created_files.append(f"{item.name}/")
            elif item.is_file():
                created_files.append(item.name)
        
        # Now update in database
        stmt = select(UserAgentMemory).where(UserAgentMemory.user_email == user_email)
        result = await db.execute(stmt)
        memory = result.scalar_one_or_none()

        if not memory:
            memory = UserAgentMemory(
                user_email=user_email,
                cloned_repos=json.dumps(cloned_repos),
                created_files=json.dumps(created_files),
                updated_at=datetime.now(timezone.utc)
            )
            db.add(memory)
        else:
            memory.cloned_repos = json.dumps(cloned_repos)
            memory.created_files = json.dumps(created_files)
            memory.updated_at = datetime.now(timezone.utc)

        await db.commit()
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to update workspace state: {e}", exc_info=True)
