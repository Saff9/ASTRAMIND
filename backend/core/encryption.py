"""
API Key Encryption Vault
Handles securely decrypting API keys at runtime if they are encrypted.
"""

from cryptography.fernet import Fernet
import os
import logging

logger = logging.getLogger(__name__)

class KeyVault:
    def __init__(self):
        self.master_key = os.getenv("MASTER_ENCRYPTION_KEY")
        if self.master_key:
            try:
                self.cipher = Fernet(self.master_key.encode())
            except ValueError as e:
                logger.error(f"Invalid MASTER_ENCRYPTION_KEY format: {e}")
                self.cipher = None
        else:
            self.cipher = None

    def decrypt(self, value: str) -> str:
        """
        Decrypts the value if it appears to be a valid Fernet token.
        Otherwise, safely returns the original plaintext value.
        """
        if not value:
            return value
            
        if self.cipher and value.startswith("gAAAAAB"):
            try:
                return self.cipher.decrypt(value.encode()).decode()
            except Exception as e:
                logger.error(f"Failed to decrypt an API key: {e}")
                pass
                
        return value

# Singleton for config imports
vault = KeyVault()
