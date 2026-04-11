# backend/core/personality_config.py
"""
Personality Configuration Loader
Loads personality settings from YAML/JSON config files.
"""

import os
import logging
from pathlib import Path
from typing import Dict, Any, Optional
import json
import yaml

logger = logging.getLogger(__name__)

# Default configuration path
DEFAULT_CONFIG_PATH = Path(__file__).parent.parent / "PERSONALITY_SKILLS.md"


class PersonalityConfig:
    """Personality configuration container."""

    def __init__(self, config: Dict[str, Any]):
        self._config = config
        self._load_defaults()
    
    def _load_defaults(self):
        """Set default values for any missing config."""
        defaults = {
            "personality": {
                "energy_level": 0.8,
                "sarcasm_level": 0.6,
                "meme_level": 0.7,
                "emoji_usage": 0.9,
                "slang_frequency": 0.8,
                "formality_level": 0.3,
                "empathy_level": 0.8,
                "humor_level": 0.7,
            },
            "styles": {
                "default": "casual",
            },
            "rules": {
                "response": {
                    "max_length": 2000,
                    "format_markdown": True,
                },
                "safety": {
                    "block_prompt_injection": True,
                    "block_harmful_content": True,
                },
                "performance": {
                    "stream_enabled": True,
                    "timeout_seconds": 30,
                }
            }
        }
        
        for section, values in defaults.items():
            if section not in self._config:
                self._config[section] = values
            elif isinstance(values, dict):
                for key, val in values.items():
                    if key not in self._config[section]:
                        self._config[section][key] = val

    @property
    def personality(self) -> Dict[str, float]:
        """Get personality traits."""
        return self._config.get("personality", {})

    @property
    def slang(self) -> Dict[str, list]:
        """Get slang database."""
        return self._config.get("slang", {})

    @property
    def emojis(self) -> Dict[str, list]:
        """Get emoji mappings."""
        return self._config.get("emojis", {})

    @property
    def templates(self) -> Dict[str, list]:
        """Get response templates."""
        return self._config.get("templates", {})

    @property
    def skills(self) -> Dict[str, Any]:
        """Get skills config."""
        return self._config.get("skills", {})

    @property
    def rules(self) -> Dict[str, Any]:
        """Get behavior rules."""
        return self._config.get("rules", {})

    @property
    def models(self) -> Dict[str, Any]:
        """Get model preferences."""
        return self._config.get("models", {})

    @property
    def default_style(self) -> str:
        """Get default conversation style."""
        return self._config.get("styles", {}).get("default", "casual")

    def get_slang(self, category: str) -> list:
        """Get slang for a category."""
        return self.slang.get(category, [])

    def get_emojis(self, category: str) -> list:
        """Get emojis for a category."""
        return self.emojis.get(category, [])

    def get_template(self, template_type: str) -> list:
        """Get templates for a type."""
        return self.templates.get(template_type, [])

    def get_skill(self, skill_name: str) -> Dict[str, Any]:
        """Get skill configuration."""
        return self.skills.get(skill_name, {})

    def is_skill_enabled(self, skill_name: str) -> bool:
        """Check if a skill is enabled."""
        skills_config = self.skills.get("enabled_skills", {})
        return skills_config.get(skill_name, {}).get("enabled", True)

    def to_dict(self) -> Dict[str, Any]:
        """Return full config as dict."""
        return self._config.copy()


def load_personality_config(config_path: Optional[str] = None) -> PersonalityConfig:
    """
    Load personality configuration from file or environment.
    
    Priority:
    1. config_path parameter
    2. PERSONALITY_CONFIG_PATH env var
    3. PERSONALITY_PROFILE env var (loads from config/profiles/)
    4. Check for PERSONALITY.md and SKILLS_CONFIG.md in root
    
    Args:
        config_path: Path to config file. If None, uses env var or default.
        
    Returns:
        PersonalityConfig instance
    """
    # Try environment variable first
    if config_path is None:
        config_path = os.environ.get("PERSONALITY_CONFIG_PATH")
    
    # Check for profile-based config
    profile = os.environ.get("PERSONALITY_PROFILE")
    profile_path = None
    if profile:
        profiles_dir = Path(__file__).parent.parent / "config" / "profiles"
        profile_candidate = profiles_dir / f"{profile}.yaml"
        if profile_candidate.exists():
            profile_path = str(profile_candidate)
    
    use_path = config_path or profile_path
    if use_path and Path(use_path).exists():
        path = Path(use_path)
        logger.info(f"Loading personality config from: {path}")
        
        try:
            if path.suffix == ".yaml" or path.suffix == ".yml":
                with open(path, "r", encoding="utf-8") as f:
                    config_data = yaml.safe_load(f)
            elif path.suffix == ".json":
                with open(path, "r", encoding="utf-8") as f:
                    config_data = json.load(f)
            elif path.suffix == ".md":
                # Parse markdown - extract YAML/JSON code blocks
                config_data = _parse_markdown_config(path)
            else:
                logger.warning(f"Unknown config format: {path.suffix}")
                config_data = {}
                
            return PersonalityConfig(config_data or {})
            
        except Exception as e:
            logger.error(f"Failed to load config from {path}: {e}")
    
    # Try to find personality.md or skills_config.md
    root_dir = Path(__file__).parent.parent
    
    personality_md = root_dir / "PERSONALITY.md"
    skills_md = root_dir / "SKILLS_CONFIG.md"
    
    if personality_md.exists() or skills_md.exists():
        logger.info("Found personality markdown files, loading config...")
        config_data = _parse_markdown_personality(str(root_dir))
        return PersonalityConfig(config_data)
    
    logger.info("Using default personality configuration")
    return PersonalityConfig({})


def _parse_markdown_config(path: Path) -> Dict[str, Any]:
    """Extract configuration from markdown file."""
    try:
        import re
        
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        
        # Extract YAML code blocks
        yaml_blocks = re.findall(r"```yaml\n(.*?)```", content, re.DOTALL)
        
        config = {}
        for block in yaml_blocks:
            try:
                block_data = yaml.safe_load(block)
                if block_data:
                    config.update(block_data)
            except Exception:
                pass
        
        return config
        
    except Exception as e:
        logger.error(f"Error parsing markdown config: {e}")
        return {}


def _parse_markdown_personality(root_dir: str) -> Dict[str, Any]:
    """Parse PERSONALITY.md and SKILLS_CONFIG.md for configuration."""
    try:
        import re
        from pathlib import Path
        
        root = Path(root_dir)
        config = {"personality": {}, "skills": {}, "fun": {}, "limits": {}, "restrictions": {}}
        
        # Parse SKILLS_CONFIG.md for skill settings
        skills_path = root / "SKILLS_CONFIG.md"
        if skills_path.exists():
            with open(skills_path, "r", encoding="utf-8") as f:
                content = f.read()
            
            # Extract YAML code blocks
            yaml_blocks = re.findall(r"```yaml\n(.*?)```", content, re.DOTALL)
            for block in yaml_blocks:
                try:
                    block_data = yaml.safe_load(block)
                    if block_data:
                        # Map to config sections
                        if "skills" in block_data:
                            config["skills"] = block_data["skills"]
                        if "code" in block_data:
                            config["code"] = block_data["code"]
                        if "web_search" in block_data:
                            config["web_search"] = block_data["web_search"]
                        if "writing" in block_data:
                            config["writing"] = block_data["writing"]
                        if "analysis" in block_data:
                            config["analysis"] = block_data["analysis"]
                        if "creative" in block_data:
                            config["creative"] = block_data["creative"]
                        if "fun" in block_data:
                            config["fun"] = block_data["fun"]
                        if "limits" in block_data:
                            config["limits"] = block_data["limits"]
                        if "restrictions" in block_data:
                            config["restrictions"] = block_data["restrictions"]
                        config.update(block_data)
                except Exception:
                    pass
        
        # Parse PERSONALITY.md for traits (from examples)
        personality_path = root / "PERSONALITY.md"
        if personality_path.exists():
            with open(personality_path, "r", encoding="utf-8") as f:
                content = f.read()
            
            # Extract tone keywords and set defaults
            if "casual" in content.lower():
                config["personality"]["formality_level"] = 0.3
            if "professional" in content.lower():
                config["personality"]["formality_level"] = 0.7
            if "emoji" in content.lower():
                config["personality"]["emoji_usage"] = 0.8
            if "slang" in content.lower() or "bet" in content.lower():
                config["personality"]["slang_frequency"] = 0.7
            if "helpful" in content.lower() or "eager" in content.lower():
                config["personality"]["empathy_level"] = 0.8
            if "witty" in content.lower() or "humor" in content.lower():
                config["personality"]["humor_level"] = 0.7
        
        return config
        
    except Exception as e:
        logger.error(f"Error parsing markdown personality: {e}")
        return {}


# Global config instance
_personality_config: Optional[PersonalityConfig] = None


def get_personality_config() -> PersonalityConfig:
    """Get the global personality configuration."""
    global _personality_config
    if _personality_config is None:
        _personality_config = load_personality_config()
    return _personality_config


def reload_personality_config(config_path: Optional[str] = None) -> PersonalityConfig:
    """Reload personality configuration."""
    global _personality_config
    _personality_config = load_personality_config(config_path)
    logger.info("Personality configuration reloaded")
    return _personality_config


__all__ = [
    "PersonalityConfig",
    "load_personality_config", 
    "get_personality_config",
    "reload_personality_config",
]