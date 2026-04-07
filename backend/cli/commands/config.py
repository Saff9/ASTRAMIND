# backend/cli/commands/config.py
"""
Config command for ASTRAMIND CLI.
Manages configuration settings.
"""

import typer
import os
from pathlib import Path
from typing import Optional

# Create config sub-app
app = typer.Typer(help="Manage AstraMind configuration settings")

# Config file location
CONFIG_FILE = Path.home() / ".astramind" / "config.ini"


def _ensure_config_dir():
    """Ensure config directory exists."""
    config_dir = CONFIG_FILE.parent
    config_dir.mkdir(parents=True, exist_ok=True)


def _read_config():
    """Read config file."""
    if not CONFIG_FILE.exists():
        return {}
    config = {}
    try:
        with open(CONFIG_FILE, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    key, value = line.split('=', 1)
                    config[key.strip()] = value.strip()
    except Exception:
        pass
    return config


def _write_config(config: dict):
    """Write config file."""
    _ensure_config_dir()
    with open(CONFIG_FILE, 'w') as f:
        f.write("# AstraMind CLI Configuration\n")
        for key, value in config.items():
            f.write(f"{key}={value}\n")


@app.command("get")
def config_get(
    key: Optional[str] = typer.Argument(None, help="Configuration key to get"),
) -> None:
    """
    Get configuration value(s).

    If no key is provided, shows all configuration values.
    """
    config = _read_config()

    if key:
        if key in config:
            typer.echo(config[key])
        else:
            typer.echo(f"Configuration key '{key}' not found", err=True)
            raise typer.Exit(1)
    else:
        if config:
            typer.echo("Current configuration:")
            for k, v in config.items():
                typer.echo(f"  {k} = {v}")
        else:
            typer.echo("No configuration set")


@app.command("set")
def config_set(
    key: str = typer.Argument(..., help="Configuration key"),
    value: str = typer.Argument(..., help="Configuration value"),
) -> None:
    """
    Set a configuration value.
    """
    config = _read_config()
    config[key] = value
    _write_config(config)
    typer.echo(f"Set {key} = {value}")


# Export the app for main.py
config_app = app
