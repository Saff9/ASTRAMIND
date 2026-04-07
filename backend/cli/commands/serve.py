# backend/cli/commands/serve.py
"""
Serve command for ASTRAMIND CLI.
Starts the FastAPI backend server.
"""

import typer
import uvicorn
import os
import sys


def serve_command(
    host: str = typer.Option("0.0.0.0", help="Host to bind the server to"),
    port: int = typer.Option(8000, help="Port to bind the server to"),
    reload: bool = typer.Option(False, help="Enable auto-reload for development"),
    workers: int = typer.Option(1, help="Number of worker processes"),
) -> None:
    """
Start the AstraMind backend server.

Launches the FastAPI application using uvicorn,
with configurable host, port, and reload options.
"""
    try:
        # Set environment variable for workers if > 1
        if workers > 1:
            os.environ["WEB_CONCURRENCY"] = str(workers)

        typer.echo(f"Starting AstraMind backend on {host}:{port}")

        uvicorn.run(
            "main:app",
            host=host,
            port=port,
            reload=reload,
            log_level="info",
            access_log=True,
        )
    except KeyboardInterrupt:
        typer.echo("Server stopped by user")
    except Exception as e:
        typer.echo(f"Failed to start server: {e}", err=True)
        raise typer.Exit(1)
