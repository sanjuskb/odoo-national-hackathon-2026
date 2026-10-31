"""
Tests for Murf Text-to-Speech (TTS) Provider and Mock Adapter.

Verifies:
- Mock TTS synthesis and word duration estimation
- Missing API key detection
- Timeout simulation
- Live provider request construction with mocked network responses
- HTTP 401/403 authentication failures
- HTTP 429 rate limiting
- Empty text validation
- Audio payload decoding (base64 and audioFile URL)
"""

import base64
from unittest.mock import MagicMock, patch
import httpx
import pytest

from ai.src.core.exceptions import (
    ProviderAuthenticationError,
    ProviderError,
    ProviderRateLimitError,
    ProviderTimeoutError,
    ValidationError,
)
from ai.src.providers.mock_murf_provider import MockMurfTTSProvider
from ai.src.providers.murf_provider import MurfTTSProvider
from ai.src.providers.tts_base import TTSRequest


def test_mock_murf_synthesis():
    """Verify mock Murf synthesizes audio bytes and estimates realistic duration."""
    provider = MockMurfTTSProvider()
    assert provider.is_available() is True

    req = TTSRequest(text="Welcome to Brightloop. Your subscription is now active.")
    res = provider.synthesize(req)

    assert res.is_simulated is True
    assert len(res.audio_bytes) > 0
    assert res.duration_seconds > 0.0
    assert res.audio_format == "mp3"


def test_murf_missing_api_key():
    """Verify live Murf provider raises error when credentials missing."""
    provider = MurfTTSProvider(api_key=None)
    provider.api_key = ""
    assert provider.is_available() is False

    with pytest.raises(ProviderAuthenticationError):
        provider.synthesize(TTSRequest(text="Test audio"))


def test_mock_murf_timeout_simulation():
    """Verify mock Murf simulates timeout exception."""
    provider = MockMurfTTSProvider(simulate_timeout=True)

    with pytest.raises(ProviderTimeoutError):
        provider.synthesize(TTSRequest(text="Test audio"))


def test_murf_empty_text_validation():
    """Verify live Murf provider rejects empty or whitespace-only text."""
    provider = MurfTTSProvider(api_key="test-murf-key")
    with pytest.raises(ValidationError):
        provider.synthesize(TTSRequest(text="   "))


def test_murf_http_success_encoded_audio():
    """Verify Murf decodes base64 encodedAudio when returned in payload."""
    provider = MurfTTSProvider(api_key="test-murf-key", voice_id="en-US-marcus")

    raw_audio = b"ID3_MOCK_MP3_AUDIO_STREAM_BYTES"
    b64_audio = base64.b64encode(raw_audio).decode("ascii")

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.is_error = False
    mock_resp.json.return_value = {
        "encodedAudio": b64_audio,
        "audioLengthInSeconds": 15.5,
        "consumedCharacterCount": 42,
    }

    with patch("httpx.Client.post", return_value=mock_resp):
        res = provider.synthesize(TTSRequest(text="Hello from Brightloop subscription services!"))

    assert res.is_simulated is False
    assert res.audio_bytes == raw_audio
    assert res.duration_seconds == 15.5


def test_murf_http_success_audio_url_download():
    """Verify Murf downloads audio bytes when audioFile URL is returned."""
    provider = MurfTTSProvider(api_key="test-murf-key")

    post_resp = MagicMock()
    post_resp.status_code = 200
    post_resp.is_error = False
    post_resp.json.return_value = {
        "audioFile": "https://cdn.murf.ai/storage/audio/sample.mp3",
        "audioLengthInSeconds": 8.0,
    }

    get_resp = MagicMock()
    get_resp.status_code = 200
    get_resp.is_success = True
    get_resp.content = b"DOWNLOADED_MP3_STREAM"

    with patch("httpx.Client.post", return_value=post_resp):
        with patch("httpx.Client.get", return_value=get_resp):
            res = provider.synthesize(TTSRequest(text="Your payment has been received."))

    assert res.audio_bytes == b"DOWNLOADED_MP3_STREAM"
    assert res.duration_seconds == 8.0


def test_murf_auth_failure_401():
    """Verify Murf maps HTTP 401 to ProviderAuthenticationError."""
    provider = MurfTTSProvider(api_key="invalid-key")

    mock_resp = MagicMock()
    mock_resp.status_code = 401
    mock_resp.is_error = True
    mock_resp.text = "Unauthorized: Invalid API key"

    with patch("httpx.Client.post", return_value=mock_resp):
        with pytest.raises(ProviderAuthenticationError):
            provider.synthesize(TTSRequest(text="Test auth error"))


def test_murf_rate_limit_429():
    """Verify Murf maps HTTP 429 to ProviderRateLimitError."""
    provider = MurfTTSProvider(api_key="test-key")

    mock_resp = MagicMock()
    mock_resp.status_code = 429
    mock_resp.is_error = True

    with patch("httpx.Client.post", return_value=mock_resp):
        with pytest.raises(ProviderRateLimitError):
            provider.synthesize(TTSRequest(text="Test rate limit"))


def test_murf_timeout_error():
    """Verify Murf maps httpx timeout to ProviderTimeoutError."""
    provider = MurfTTSProvider(api_key="test-key")

    with patch("httpx.Client.post", side_effect=httpx.TimeoutException("Network timed out")):
        with pytest.raises(ProviderTimeoutError):
            provider.synthesize(TTSRequest(text="Test timeout"))
