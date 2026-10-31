"""
AI, Voice, and Telephony Provider Adapters for Brightloop.
"""

from ai.src.providers.gemini_provider import GeminiProvider
from ai.src.providers.llm_base import BaseLLMProvider, LLMMessage, LLMResponse
from ai.src.providers.mock_gemini_provider import MockGeminiProvider
from ai.src.providers.mock_murf_provider import MockMurfTTSProvider
from ai.src.providers.mock_telephony_provider import MockTelephonyProvider
from ai.src.providers.murf_provider import MurfTTSProvider
from ai.src.providers.telephony_base import (
    BaseTelephonyProvider,
    CallRecord,
    CallStatus,
    OutboundCallRequest,
)
from ai.src.providers.tts_base import BaseTTSProvider, TTSRequest, TTSResponse
from ai.src.providers.twilio_telephony_provider import TwilioTelephonyProvider

__all__ = [
    "BaseLLMProvider",
    "LLMMessage",
    "LLMResponse",
    "GeminiProvider",
    "MockGeminiProvider",
    "BaseTTSProvider",
    "TTSRequest",
    "TTSResponse",
    "MurfTTSProvider",
    "MockMurfTTSProvider",
    "BaseTelephonyProvider",
    "CallStatus",
    "OutboundCallRequest",
    "CallRecord",
    "MockTelephonyProvider",
    "TwilioTelephonyProvider",
]
