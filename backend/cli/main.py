# backend/cli/main.py
"""
AstraMind CLI - Command-line interface for AstraMind platform.
Production-grade CLI for managing and interacting with the AI backend.
"""

import typer
from typing import Optional
import sys
import os

# Add backend to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from .commands.chat import chat_command
from .commands.serve import serve_command
from .commands.status import status_command
from .commands.health import health_command
from .commands.config import config_app

# Create main Typer app
app = typer.Typer(
    name="astramind",
    help="AstraMind - Multi-provider AI orchestration platform CLI",
    add_completion=False,
)

# Add subcommands
app.add_typer(config_app, name="config", help="Manage configuration settings")
app.command("chat")(chat_command)
app.command("serve")(serve_command)
app.command("status")(status_command)
app.command("health")(health_command)


if __name__ == "__main__":
    app()
