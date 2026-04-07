# backend/cli/commands/chat.py
"""
Chat command for ASTRAMIND CLI.
Sends a chat message to the backend and displays the response.
"""

import typer
import httpx
import asyncio
from typing import Optional
import json


def chat_command(
    prompt: str = typer.Argument(..., help="The message to send to the AI"),
    host: str = typer.Option("http://localhost:8000", help="Backend host URL"),
    model: str = typer.Option("fast", help="AI model to use (fast, balanced, smart)"),
    token: Optional[str] = typer.Option(None, help="JWT authentication token"),
    stream: bool = typer.Option(True, help="Stream the response"),
) -> None:
    """
Send a chat message to the AstraMind backend.

This command makes an HTTP request to the chat endpoint,
passing the prompt and optional parameters.
Requires authentication token.
"""
    async def _chat():
        if not token:
            typer.echo("Error: Authentication token required (--token)", err=True)
            raise typer.Exit(1)

        try:
            payload = {
                "prompt": prompt,
                "model": model,
                "stream": stream
            }

            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}"
            }

            async with httpx.AsyncClient(timeout=300.0) as client:
                async with client.stream(
                    "POST",
                    f"{host}/api/v1/chat",
                    json=payload,
                    headers=headers
                ) as response:
                    response.raise_for_status()

                    if stream:
                        async for line in response.aiter_lines():
                            if line.strip():
                                print(line, end="", flush=True)
                        print()  # New line after streaming
                    else:
                        data = await response.aread()
                        print(data.decode())

        except httpx.HTTPError as e:
            typer.echo(f"HTTP Error: {e}", err=True)
            raise typer.Exit(1)
        except Exception as e:
            typer.echo(f"Error: {e}", err=True)
            raise typer.Exit(1)

    asyncio.run(_chat())
