# backend/app/providers/base.py

from abc import ABC, abstractmethod
from typing import AsyncIterator, List, Dict, Optional


class AIProvider(ABC):
    """
    Abstract base class for all AI providers.
    Ensures consistent interface.
    """

    name: str

    @abstractmethod
    async def stream(
        self,
        prompt: str,
        model: str,
        api_key: str,
        messages: Optional[List[Dict[str, str]]] = None,
    ) -> AsyncIterator[str]:
        """
        Streams response chunks.
        Optional `messages` is prior user/assistant turns (current `prompt` is the latest user input).
        """
        raise NotImplementedError
