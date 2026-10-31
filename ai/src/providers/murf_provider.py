"""
Murf Text-to-Speech (TTS) Provider Adapter.

Integrates with Murf Studio / Murf API (https://api.murf.ai/v1/speech/generate).
Adheres strictly to the BaseTTSProvider interface. Server-side only; never exposes
credentials to clients or frontend code.
"""

import time
from typing import Any, Dict, Optional
import httpx

from ai.src.core.config import get_settings
from ai.src.core.exceptions import (
    ProviderAuthenticationError,
    ProviderError,
    ProviderRateLimitError,
    ProviderTimeoutError,
)
from ai.src.providers.tts_base import BaseTTSProvider, TTSRequest, TTSResponse
from ai.src.utils.logging import get_logger

logger = get_logger("ai.providers.murf")


class MurfTTSProvider(BaseTTSProvider):
    """Murf API text-to-speech implementation."""

    API_ENDPOINT = "https://api.murf.ai/v1/speech/generate"

    def __init__(
        self,
        api_key: Optional[str] = None,
        voice_id: Optional[str] = None,
        timeout_seconds: Optional[float] = None,
    ):
        settings = get_settings()
        self.api_key = api_key or settings.murf_api_key
        self.voice_id = voice_id or settings.murf_voice_id
        self.timeout_seconds = timeout_seconds or settings.murf_timeout_seconds

    def is_available(self) -> bool:
        """Return True if Murf API key is present."""
        return bool(self.api_key and self.api_key.strip())

    def synthesize(self, request: TTSRequest) -> TTSResponse:
        """Synthesize text via Murf API."""
        if not self.is_available():
            raise ProviderAuthenticationError(
                "Murf API key is not configured. Set MURF_API_KEY in server environment."
            )

        headers = {
            "api-key": self.api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        payload: Dict[str, Any] = {
            "voiceId": request.voice_id or self.voice_id,
            "text": request.text,
            "rate": int(request.speaking_rate * 100),
            "format": request.audio_format.upper(),
        }

        start_time = time.perf_counter()
        try:
            with httpx.Client(timeout=self.timeout_seconds) as client:
                response = client.post(self.API_ENDPOINT, json=payload, headers=headers)
        except httpx.TimeoutException as exc:
            logger.error("Murf TTS API timed out after %s seconds", self.timeout_seconds)
            raise ProviderTimeoutError(f"Murf TTS API timed out after {self.timeout_seconds}s") from exc
        except httpx.RequestError as exc:
            logger.error("Network error communicating with Murf TTS API: %s", str(exc))
            raise ProviderError(f"Murf network error: {str(exc)}") from exc

        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

        if response.status_code == 429:
            raise ProviderRateLimitError("Murf API rate limit exceeded")
        elif response.status_code in (401, 403):
            raise ProviderAuthenticationError("Invalid or unauthorized Murf API key")
        elif response.is_error:
            raise ProviderError(
                f"Murf TTS returned HTTP {response.status_code}: {response.text}",
                details={"status_code": response.status_code, "body": response.text}
            )

        try:
            data = response.json()
            audio_url = data.get("audioFile")
            duration = float(data.get("audioLengthInSeconds", 0.0))

            # Fetch audio bytes if URL returned
            audio_bytes = b""
            if audio_url:
                with httpx.Client(timeout=self.timeout_seconds) as client:
                    dl_resp = client.get(audio_url)
                    if dl_resp.is_success:
                        audio_bytes = dl_resp.content

            return TTSResponse(
                audio_bytes=audio_bytes,
                audio_format=request.audio_format,
                duration_seconds=duration,
                latency_ms=latency_ms,
                is_simulated=False,
                raw_response=data,
            )
        except Exception as exc:
            raise ProviderError(f"Failed to process Murf TTS response: {str(exc)}") from exc

