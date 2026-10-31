"""
Tests for Gemini LLM Provider and Mock Provider.

Verifies:
- Mock provider execution
- Missing API key error
- Provider timeout handling
- Rate limit handling
- Provider error handling
"""

import pytest

from ai.src.core.exceptions import (
    ProviderAuthenticationError,
    ProviderRateLimitError,
    ProviderTimeoutError,
)
from ai.src.providers.gemini_provider import GeminiProvider
from ai.src.providers.llm_base import LLMMessage
from ai.src.providers.mock_gemini_provider import MockGeminiProvider


def test_mock_gemini_provider_default():
    """Verify mock Gemini provider generates grounded simulated completions."""
    provider = MockGeminiProvider()
    assert provider.is_available() is True

    res = provider.generate("Tell me about Brightloop subscription plans")
    assert res.is_simulated is True
    assert "Basic" in res.content
    assert "Professional" in res.content
    assert res.finish_reason == "stop"


def test_mock_gemini_chat():
    """Verify mock Gemini handles multi-turn conversation messages."""
    provider = MockGeminiProvider()
    messages = [
        LLMMessage(role="user", content="Hello"),
        LLMMessage(role="assistant", content="Hello! How can I help?"),
        LLMMessage(role="user", content="When is my renewal date?"),
    ]
    res = provider.chat(messages)
    assert res.is_simulated is True
    assert "renew" in res.content.lower()


def test_gemini_missing_api_key():
    """Verify GeminiProvider raises ProviderAuthenticationError if key is missing."""
    provider = GeminiProvider(api_key=None)
    # Ensure no environment override
    provider.api_key = ""
    assert provider.is_available() is False

    with pytest.raises(ProviderAuthenticationError) as exc_info:
        provider.generate("Test prompt")
    assert "API key is not configured" in str(exc_info.value)


def test_mock_gemini_simulated_auth_error():
    """Verify mock provider simulates missing API key."""
    provider = MockGeminiProvider(simulate_auth_error=True)
    assert provider.is_available() is False

    with pytest.raises(ProviderAuthenticationError):
        provider.generate("Test prompt")


def test_mock_gemini_simulated_timeout():
    """Verify mock provider simulates timeout exception."""
    provider = MockGeminiProvider(simulate_timeout=True)

    with pytest.raises(ProviderTimeoutError):
        provider.generate("Test prompt")


def test_mock_gemini_simulated_rate_limit():
    """Verify mock provider simulates rate limit exception."""
    provider = MockGeminiProvider(simulate_rate_limit=True)

    with pytest.raises(ProviderRateLimitError):
        provider.generate("Test prompt")

