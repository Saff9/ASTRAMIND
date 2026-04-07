# backend/cli/commands/health.py
"""
Health command for ASTRAMIND CLI.
Checks the health of the backend service.
"""

import typer
import httpx
import asyncio
from typing import Optional
import json


def health_command(
    host: str = typer.Option("http://localhost:8000", help="Backend host URL"),
    detailed: bool = typer.Option(False, help="Show detailed health information"),
) -> None:
    """
Check the health of the AstraMind backend.

Makes a request to the health endpoint to verify
service availability and basic functionality.
"""
    async def _health():
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{host}/health")
                response.raise_for_status()

                data = response.json()

                if detailed:
                    typer.echo("Health Check Details:")
                    typer.echo(json.dumps(data, indent=2))
                else:
                    status = data.get("status", "unknown")
                    service = data.get("service", "AstraMind")
                    typer.echo(f"✅ {service} is {status}")

        except httpx.HTTPError as e:
            typer.echo(f"❌ Health check failed: {e}", err=True)
            raise typer.Exit(1)
        except Exception as e:
            typer.echo(f"❌ Error: {e}", err=True)
            raise typer.Exit(1)

    asyncio.run(_health())
