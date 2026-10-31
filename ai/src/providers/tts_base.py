"""
Base Text-to-Speech (TTS) Provider Interface.

Defines vendor-neutral abstractions for speech synthesis engines (Murf, Mock, etc.).
Allows Brightloop voice workflows to synthesize greetings, plan overviews, and assistance
dialogue without vendor lock-in.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class TTSRequest(BaseModel):
    """Specification for text-to-speech audio synthesis."""
    text: str = Field(..., description="Text content to synthesize into speech")
    voice_id: str = Field(default="en-US-marcus", description="Provider voice identifier")
    language_code: str = Field(default="en-US", description="Language code")
    speaking_rate: float = Field(default=1.0, ge=0.5, le=2.0, description="Speech playback rate")
    audio_format: str = Field(default="mp3", description="Desired audio format: mp3, wav, etc.")


class TTSResponse(BaseModel):
    """Synthesized speech audio payload and metadata."""
    audio_bytes: bytes = Field(..., description="Raw synthesized audio bytes (or simulated buffer)")
    audio_format: str = Field(default="mp3", description="Audio container format")
    duration_seconds: float = Field(default=0.0, description="Estimated or actual audio duration in seconds")
    latency_ms: float = Field(default=0.0, description="Synthesis request round-trip latency in milliseconds")
    is_simulated: bool = Field(default=False, description="Whether audio was generated via mock provider")
    raw_response: Optional[Dict[str, Any]] = Field(default=None, description="Provider metadata")


class BaseTTSProvider(ABC):
    """Abstract interface for TTS provider adapters."""

    @abstractmethod
    def synthesize(self, request: TTSRequest) -> TTSResponse:
        """Synthesize text into speech audio."""
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Check whether provider credentials and service are operational."""
        pass

