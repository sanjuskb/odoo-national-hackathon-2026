"""
Murf Text-to-Speech (TTS) Provider Adapter.

Integrates with Murf Studio / Murf API (https://api.murf.ai/v1/speech/generate).
Adheres strictly to the BaseTTSProvider interface. Server-side only; never exposes
credentials to clients or frontend code.
"""

import base64
import time
from typing import Any, Dict, Optional
import httpx

from ai.src.core.config import get_settings
from ai.src.core.exceptions import (
    ProviderAuthenticationError,
    ProviderError,
    ProviderRateLimitError,
    ProviderTimeoutError,
    ValidationError,
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
        self.api_key = api_key if api_key is not None else settings.murf_api_key
        self.voice_id = voice_id if voice_id is not None else settings.murf_voice_id
        self.timeout_seconds = timeout_seconds if timeout_seconds is not None else settings.murf_timeout_seconds

    def is_available(self) -> bool:
        """Return True if Murf API key is present."""
        return bool(self.api_key and self.api_key.strip())

    def synthesize(self, request: TTSRequest) -> TTSResponse:
        """Synthesize text via Murf API."""
        if not self.is_available():
            raise ProviderAuthenticationError(
                "Murf API key is not configured. Set MURF_API_KEY in server environment."
            )

        if not request.text or not request.text.strip():
            raise ValidationError("TTS request text cannot be empty or whitespace only")

        headers = {
            "api-key": self.api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        # Murf rate modifier: -50 to +50 percentage change from base rate (0 = normal)
        rate_modifier = int(max(-50, min(50, (request.speaking_rate - 1.0) * 100)))

        payload: Dict[str, Any] = {
            "voiceId": request.voice_id or self.voice_id,
            "text": request.text.strip(),
            "rate": rate_modifier,
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
            encoded_audio = data.get("encodedAudio")
            duration = float(data.get("audioLengthInSeconds", 0.0))

            audio_bytes = b""
            if encoded_audio:
                try:
                    audio_bytes = base64.b64decode(encoded_audio)
                except Exception as b64_exc:
                    logger.warning("Failed to decode base64 encodedAudio: %s", str(b64_exc))

            if not audio_bytes and audio_url:
                try:
                    with httpx.Client(timeout=self.timeout_seconds) as client:
                        dl_resp = client.get(audio_url)
                        if dl_resp.is_success:
                            audio_bytes = dl_resp.content
                except Exception as dl_exc:
                    logger.warning("Failed to download audioFile from %s: %s", audio_url, str(dl_exc))

            if not audio_bytes:
                raise ProviderError(
                    "Murf response did not contain valid audio data (neither audioFile nor encodedAudio succeeded)",
                    details={"raw": data}
                )

            return TTSResponse(
                audio_bytes=audio_bytes,
                audio_format=request.audio_format,
                duration_seconds=duration,
                latency_ms=latency_ms,
                is_simulated=False,
                raw_response=data,
            )
        except ProviderError:
            raise
        except Exception as exc:
            raise ProviderError(f"Failed to process Murf TTS response: {str(exc)}") from exc
