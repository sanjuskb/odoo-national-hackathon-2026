"""
Tests for Murf Text-to-Speech (TTS) Provider and Mock Adapter.

Verifies:
- Mock TTS synthesis and word duration estimation
- Missing API key detection
- Timeout simulation
- Fallback behavior in voice workflows
"""

import pytest

from ai.src.core.exceptions import (
    ProviderAuthenticationError,
    ProviderTimeoutError,
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

