"""
Base LLM Provider Interface.

Defines vendor-neutral abstractions for Large Language Model providers.
Ensures provider swappability (Gemini, Mock, Local, etc.) without altering
business logic.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class LLMMessage(BaseModel):
    """Normalized chat message."""
    role: str = Field(..., description="Message author role: system, user, or assistant")
    content: str = Field(..., description="Raw text content of the message")


class LLMResponse(BaseModel):
    """Normalized response payload from an LLM provider."""
    content: str = Field(..., description="Generated text content")
    model: str = Field(..., description="Name/identifier of the model utilized")
    latency_ms: float = Field(default=0.0, description="Round-trip request latency in milliseconds")
    finish_reason: str = Field(default="stop", description="Reason for generation completion")
    is_simulated: bool = Field(default=False, description="Whether output came from a mock/simulation provider")
    raw_response: Optional[Dict[str, Any]] = Field(default=None, description="Raw provider metadata")


class BaseLLMProvider(ABC):
    """Abstract interface for LLM provider adapters."""

    @abstractmethod
    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_output_tokens: int = 1024,
        **kwargs: Any,
    ) -> LLMResponse:
        """Synchronously generate a completion for a prompt."""
        pass

    @abstractmethod
    def chat(
        self,
        messages: List[LLMMessage],
        temperature: float = 0.2,
        max_output_tokens: int = 1024,
        **kwargs: Any,
    ) -> LLMResponse:
        """Synchronously process a multi-turn conversation."""
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Check whether the provider has valid credentials and is operational."""
        pass

