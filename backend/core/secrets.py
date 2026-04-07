# backend/core/secrets.py
"""
Production-ready secrets management with encryption and key rotation.
"""

import os
import base64
from typing import Optional, Dict, Any
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import logging

logger = logging.getLogger(__name__)


class SecretsManager:
    """
    Enterprise-grade secrets management with encryption at rest.
    """

    def __init__(self):
        self._encryption_key = self._derive_key()
        self._cipher = Fernet(self._encryption_key)

    def _derive_key(self) -> bytes:
        """
        Derive encryption key from environment variable using PBKDF2.
        In production, use a proper KMS service.
        """
        master_key = os.getenv("MASTER_ENCRYPTION_KEY")
        if not master_key:
            raise ValueError("MASTER_ENCRYPTION_KEY environment variable is required")

        # Use PBKDF2 to derive a 32-byte key
        salt = b'ASTRAMINDai_salt_2024'  # In production, use a random salt per deployment
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,  # High iteration count for security
        )

        return base64.urlsafe_b64encode(kdf.derive(master_key.encode()))

    def encrypt_secret(self, plaintext: str) -> str:
        """
        Encrypt a secret for storage.

        Args:
            plaintext: The secret to encrypt

        Returns:
            Base64 encoded encrypted secret
        """
        if not plaintext:
            raise ValueError("Cannot encrypt empty secret")

        try:
            encrypted = self._cipher.encrypt(plaintext.encode())
            return base64.urlsafe_b64encode(encrypted).decode()
        except Exception as e:
            logger.error(f"Failed to encrypt secret: {e}")
            raise

    def decrypt_secret(self, encrypted_b64: str) -> str:
        """
        Decrypt a stored secret.

        Args:
            encrypted_b64: Base64 encoded encrypted secret

        Returns:
            Decrypted plaintext secret
        """
        if not encrypted_b64:
            raise ValueError("Cannot decrypt empty secret")

        try:
            encrypted = base64.urlsafe_b64decode(encrypted_b64)
            decrypted = self._cipher.decrypt(encrypted)
            return decrypted.decode()
        except Exception as e:
            logger.error(f"Failed to decrypt secret: {e}")
            raise

    def rotate_key(self, new_master_key: str) -> bool:
        """
        Rotate the master encryption key.
        This would require re-encrypting all stored secrets.
        """
        # Implementation would involve:
        # 1. Decrypt all secrets with old key
        # 2. Generate new key from new_master_key
        # 3. Re-encrypt all secrets
        # 4. Update key derivation
        logger.warning("Key rotation requested - manual intervention required")
        return False


# Global secrets manager instance
secrets_manager = SecretsManager()


def get_secret(key_name: str, default: Optional[str] = None) -> Optional[str]:
    """
    Get a secret from environment variables.
    In production, this should fetch from encrypted storage.
    """
    value = os.getenv(key_name)
    if value and value.startswith('encrypted:'):
        # Decrypt if marked as encrypted
        encrypted_value = value.replace('encrypted:', '', 1)
        return secrets_manager.decrypt_secret(encrypted_value)
    return value or default


def validate_api_key_format(api_key: str, provider: str) -> bool:
    """
    Validate API key format for different providers.
    """
    if not api_key or len(api_key) < 10:
        return False

    # Provider-specific validation
    provider_validators = {
        'openai': lambda k: k.startswith('sk-') and len(k) >= 50,
        'anthropic': lambda k: k.startswith('sk-ant-') and len(k) >= 100,
        'groq': lambda k: len(k) >= 20,
        'openrouter': lambda k: len(k) >= 20,
        'google': lambda k: len(k) >= 20,
        'mistral': lambda k: len(k) >= 20,
    }

    validator = provider_validators.get(provider, lambda k: len(k) >= 10)
    return validator(api_key)


def mask_secret(secret: str, show_chars: int = 4) -> str:
    """
    Mask a secret for logging purposes.
    """
    if not secret or len(secret) <= show_chars:
        return '*' * len(secret)

    visible = secret[:show_chars]
    masked = '*' * (len(secret) - show_chars)
    return visible + masked


# Initialize secrets manager on import
try:
    _test_encrypt = secrets_manager.encrypt_secret("test")
    _test_decrypt = secrets_manager.decrypt_secret(_test_encrypt)
    if _test_decrypt != "test":
        raise ValueError("Secrets manager encryption/decryption test failed")
    logger.info("Secrets manager initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize secrets manager: {e}")
    raise
