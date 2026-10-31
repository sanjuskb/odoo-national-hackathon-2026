"""
Base Telephony Provider Interface.

Defines vendor-neutral abstractions for outbound telephony systems (e.g. Twilio,
Exotel, Mock). Handles scheduling, initiation, status inspection, and lifecycle
transitions for AI Assistance Calls.
"""

from abc import ABC, abstractmethod
from enum import Enum
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class CallStatus(str, Enum):
    """Lifecycle statuses of an AI Assistance Phone Call."""
    SCHEDULED = "scheduled"
    INITIATED = "initiated"
    RINGING = "ringing"
    ANSWERED = "answered"
    COMPLETED = "completed"
    FAILED = "failed"
    CUSTOMER_UNAVAILABLE = "customer_unavailable"
    CANCELLED = "cancelled"


class OutboundCallRequest(BaseModel):
    """Specification for placing an outbound customer assistance call."""
    call_id: str = Field(..., description="Unique internal call tracking identifier")
    customer_phone: str = Field(..., description="E.164 formatted customer telephone number")
    customer_id: str = Field(..., description="Verified backend customer UUID")
    subscription_id: str = Field(..., description="Verified active subscription UUID")
    greeting_audio_url: Optional[str] = Field(default=None, description="Optional Murf synthesized audio URL")
    dialogue_script: str = Field(..., description="Spoken dialogue script for text fallback or TTS stream")
    max_duration_seconds: int = Field(default=300, description="Hard ceiling for call duration")


class CallRecord(BaseModel):
    """Record of an outbound call attempt and current lifecycle state."""
    call_id: str
    provider_call_id: str
    provider_name: str
    status: CallStatus
    customer_phone: str
    customer_id: str
    subscription_id: str
    started_at: str
    ended_at: Optional[str] = None
    duration_seconds: float = 0.0
    is_simulated: bool = False
    failure_reason: Optional[str] = None
    retry_count: int = 0
    metadata: Dict[str, Any] = Field(default_factory=dict)


class BaseTelephonyProvider(ABC):
    """Abstract interface for outbound telephony adapters."""

    @abstractmethod
    def initiate_call(self, request: OutboundCallRequest) -> CallRecord:
        """Schedule or immediately initiate an outbound phone call."""
        pass

    @abstractmethod
    def get_call_status(self, call_id: str) -> Optional[CallRecord]:
        """Query current status of an in-flight or completed call."""
        pass

    @abstractmethod
    def terminate_call(self, call_id: str) -> bool:
        """Hang up or cancel a call."""
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Check provider operational status and credentials."""
        pass

