# backend/core/content_filter.py
"""
Advanced content filtering for ASTRAMIND safety.
Prevents harmful, illegal, or inappropriate content.
"""

import re
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class ContentRisk(Enum):
    """Risk levels for content filtering."""
    SAFE = "safe"
    LOW_RISK = "low_risk"
    HIGH_RISK = "high_risk"
    BLOCKED = "blocked"


@dataclass
class FilterResult:
    """Result of content filtering."""
    risk_level: ContentRisk
    blocked: bool
    reasons: List[str]
    sanitized_content: Optional[str] = None
    confidence: float = 1.0


class ContentFilter:
    """
    Multi-layer content filtering system.
    ASTRAMIND-safe with comprehensive protection.
    """

    def __init__(self):
        # High-risk patterns that should always be blocked
        self.blocked_patterns = [
            # Harmful activities
            r'\b(hack|exploit|breach|crack)\b.*\b(system|account|password|database)\b',
            r'\b(create|make|build)\b.*\b(bomb|weapon|explosive|drug)\b',
            r'\b(how to|tutorial|guide)\b.*\b(kill|murder|harm|suicide)\b',

            # Illegal content
            r'\b(child|kid|minor)\b.*\b(porn|sex|abuse|exploit)\b',
            r'\b(dark web|deep web|tor)\b.*\b(access|buy|sell)\b',
            r'\b(illegal|pirate|stolen)\b.*\b(software|content|data)\b',

            # Personal information harvesting
            r'\b(steal|harvest|collect)\b.*\b(email|phone|address|ssn|credit card)\b',

            # Malware/viruses
            r'\b(create|write|develop)\b.*\b(virus|malware|ransomware|trojan)\b',
        ]

        # Medium-risk patterns (may be educational but risky)
        self.warn_patterns = [
            r'\b(password|credential)\b.*\b(crack|hack|guess)\b',
            r'\b(bypass|circumvent)\b.*\b(security|firewall|encryption)\b',
            r'\b(anonymous|vpn|proxy)\b.*\b(illegal|crime)\b',
        ]

        # Content that should be sanitized or modified
        self.sanitize_patterns = [
            # Remove or replace potentially harmful URLs
            r'https?://[^\s]+',
            # Remove email addresses
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
        ]

    def filter_content(self, content: str) -> FilterResult:
        """
        Comprehensive content filtering with multiple security layers.
        ASTRAMIND-friendly but with robust safety protections.

        Args:
            content: User input to filter

        Returns:
            FilterResult with risk assessment and actions
        """
        if not content or not isinstance(content, str):
            return FilterResult(
                risk_level=ContentRisk.SAFE,
                blocked=False,
                reasons=["Invalid input"],
                sanitized_content=""
            )

        content_lower = content.lower()
        reasons = []
        risk_level = ContentRisk.SAFE

        # Check for blocked content first
        for pattern in self.blocked_patterns:
            try:
                if re.search(pattern, content_lower, re.IGNORECASE):
                    reasons.append(f"Blocked: harmful content detected")
                    risk_level = ContentRisk.BLOCKED
                    logger.warning(f"Blocked content detected: {reasons[0]}")
                    break
            except re.error as e:
                logger.error(f"Regex error in blocked pattern: {e}")
                continue

        if risk_level != ContentRisk.BLOCKED:
            # Check for warning patterns
            warning_count = 0
            for pattern in self.warn_patterns:
                try:
                    if re.search(pattern, content_lower, re.IGNORECASE):
                        warning_count += 1
                        reasons.append(f"Warning: potentially risky content")
                        if warning_count >= 3:
                            risk_level = ContentRisk.HIGH_RISK
                            break
                except re.error as e:
                    logger.error(f"Regex error in warning pattern: {e}")
                    continue
            
            if warning_count == 1:
                risk_level = ContentRisk.LOW_RISK
            elif warning_count == 2:
                risk_level = ContentRisk.HIGH_RISK

        # Sanitize content if needed
        sanitized = self._sanitize_content(content)

        # Determine final risk and blocking decision
        blocked = risk_level == ContentRisk.BLOCKED
        confidence = 0.95 if reasons else 1.0

        if reasons:
            logger.warning(f"Content filter triggered: {reasons[:2]}...")  # Log first 2 reasons

        return FilterResult(
            risk_level=risk_level,
            blocked=blocked,
            reasons=reasons,
            sanitized_content=sanitized if sanitized != content else None,
            confidence=confidence,
        )

    def _sanitize_content(self, content: str) -> str:
        """Sanitize content by removing or replacing risky elements."""
        sanitized = content

        for pattern in self.sanitize_patterns:
            # Replace URLs with [LINK REMOVED]
            if 'http' in pattern:
                sanitized = re.sub(pattern, '[LINK REMOVED FOR SAFETY]', sanitized)
            # Replace emails with [EMAIL REMOVED]
            elif '@' in pattern:
                sanitized = re.sub(pattern, '[EMAIL REMOVED FOR SAFETY]', sanitized)

        return sanitized

    def is_ASTRAMIND_safe(self, content: str) -> bool:
        """
        Quick check if content meets ASTRAMIND safety standards.
        Returns True if safe, False if potentially harmful.
        """
        result = self.filter_content(content)
        return not result.blocked and result.risk_level in [ContentRisk.SAFE, ContentRisk.LOW_RISK]


# Global instance
content_filter = ContentFilter()
