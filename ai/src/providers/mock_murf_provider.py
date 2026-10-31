"""
Mock Murf Text-to-Speech (TTS) Provider.

Simulates Murf audio generation deterministically without external network calls
or API keys. Calculates realistic simulated audio durations based on word count.
Supports simulating timeouts and error states for robust integration testing.
"""

from typing import Optional
from ai.src.core.exceptions import (
    ProviderAuthenticationError,
    ProviderTimeoutError,
)
from ai.src.providers.tts_base import BaseTTSProvider, TTSRequest, TTSResponse
from ai.src.utils.logging import get_logger

logger = get_logger("ai.providers.mock_murf")


class MockMurfTTSProvider(BaseTTSProvider):
    """Mock text-to-speech adapter for testing and offline local execution."""

    def __init__(
        self,
        simulate_auth_error: bool = False,
        simulate_timeout: bool = False,
        latency_ms: float = 12.0,
    ):
        self.simulate_auth_error = simulate_auth_error
        self.simulate_timeout = simulate_timeout
        self.latency_ms = latency_ms
        self.invocation_count = 0

    def is_available(self) -> bool:
        return not self.simulate_auth_error

    def synthesize(self, request: TTSRequest) -> TTSResponse:
        self.invocation_count += 1

        if self.simulate_auth_error:
            raise ProviderAuthenticationError("Simulated missing Murf API key")

        if self.simulate_timeout:
            raise ProviderTimeoutError("Simulated Murf TTS synthesis timeout")

        # Estimate duration: average speech is ~150 words per minute (2.5 words/second)
        word_count = max(1, len(request.text.split()))
        estimated_duration = round(word_count / (2.5 * request.speaking_rate), 2)

        # Generate lightweight synthetic audio bytes (valid mock payload)
        synthetic_audio = f"[SIMULATED_AUDIO: format={request.audio_format} voice={request.voice_id} words={word_count}]".encode("utf-8")

        return TTSResponse(
            audio_bytes=synthetic_audio,
            audio_format=request.audio_format,
            duration_seconds=estimated_duration,
            latency_ms=self.latency_ms,
            is_simulated=True,
            raw_response={"word_count": word_count, "mock_provider": True},
        )

