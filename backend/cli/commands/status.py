# backend/cli/commands/status.py
"""
Status command for ASTRAMIND CLI.
Checks the status of AI providers.
"""

import typer
import httpx
import asyncio
from typing import Optional
import json


def status_command(
    host: str = typer.Option("http://localhost:8000", help="Backend host URL"),
    token: Optional[str] = typer.Option(None, help="JWT authentication token"),
    detailed: bool = typer.Option(False, help="Show detailed status information"),
) -> None:
    """
    Check the status of AI providers.

    Makes a request to the status endpoint to see which
    providers are configured and available.
    """
    async def _status():
        try:
            headers = {"Content-Type": "application/json"}
            if token:
                headers["Authorization"] = f"Bearer {token}"

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{host}/api/v1/status",
                    headers=headers
                )
                response.raise_for_status()

                data = response.json()

                if detailed:
                    typer.echo("AI Provider Status:")
                    typer.echo(json.dumps(data, indent=2))
                else:
                    typer.echo("AstraMind Status:")
                    for provider, status in data.get("providers", {}).items():
                        status_icon = "✅" if status.get("available") else "❌"
                        typer.echo(f"  {status_icon} {provider}")

        except httpx.HTTPError as e:
            typer.echo(f"HTTP Error: {e}", err=True)
            raise typer.Exit(1)
        except Exception as e:
            typer.echo(f"Error: {e}", err=True)
            raise typer.Exit(1)

    asyncio.run(_status())
