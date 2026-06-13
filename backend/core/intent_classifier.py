import re
from enum import Enum

class ChatMode(str, Enum):
    CHAT = "CHAT"
    CODE = "CODE"
    AGENT = "AGENT"
    RESEARCH = "RESEARCH"
    MATH = "MATH"

def classify_intent(prompt: str) -> ChatMode:
    """
    Sub-millisecond heuristic intent classifier for routing user queries.
    Determines if query fits Chat, Code, Agent tools, Deep Research, or Math reasoning.
    """
    if not prompt or not isinstance(prompt, str):
        return ChatMode.CHAT
        
    prompt_lower = prompt.lower().strip()
    
    # 1. AGENT Triggers: action-heavy commands
    agent_keywords = [
        "clone", "git clone", "git pull", "git push",
        "run ", "run\n", "execute", "bash", "terminal", "install",
        "create file", "write file", "create a file",
        "build", "compile", "deploy", "scrape", "fetch", "download",
        "npm install", "pip install"
    ]
    if any(kw in prompt_lower for kw in agent_keywords):
        return ChatMode.AGENT
        
    # 2. CODE Triggers: code generation/debugging requests
    code_keywords = [
        "write a python", "write a javascript", "write code", "fix syntax", "debug",
        "refactor", "how to write a", "implement a function", "write class",
        "sql query", "html template"
    ]
    if "```" in prompt_lower or any(kw in prompt_lower for kw in code_keywords):
        return ChatMode.CODE
        
    # 3. RESEARCH Triggers: search requests, current events, latest details
    research_keywords = [
        "latest", "news", "current", "today", "yesterday", "now", "weather",
        "stock price", "current price", "happened in", "who is the current", "2024", "2025", "2026"
    ]
    if any(kw in prompt_lower for kw in research_keywords):
        return ChatMode.RESEARCH
        
    # 4. MATH Triggers: equation solving, calculations
    math_keywords = [
        "calculate", "equation", "formula", "integral", "derivative", "solve for",
        "prove that", "factorial", "fibonacci", "matrix multiplication", "math proof"
    ]
    has_math_expression = re.search(r'\b\d+\s*[\+\-\*/\^%=]\s*\d+\b', prompt_lower)
    if has_math_expression or any(kw in prompt_lower for kw in math_keywords):
        return ChatMode.MATH
        
    # 5. Fallback: CHAT
    return ChatMode.CHAT
