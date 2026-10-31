"""
Data Models for Brightloop AI Subscription Assistance Call.
"""

from datetime import datetime, timezone
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field

from ai.src.providers.telephony_base import CallStatus


class SubscriptionActivationEvent(BaseModel):
    """
    Idempotent event emitted by backend upon confirmed subscription activation.
    """
    event_id: str = Field(..., description="Unique event identifier (UUID)")
    subscription_id: str = Field(..., description="Active subscription UUID")
    customer_id: str = Field(..., description="Customer UUID")
    plan_id: str = Field(..., description="Subscribed plan UUID or slug")
    plan_name: str = Field(..., description="Human-readable plan name")
    status: str = Field(default="active", description="Verified subscription status")
    activated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    idempotency_key: Optional[str] = Field(default=None, description="Deduplication key")


class AssistanceCallRecord(BaseModel):
    """
    Audit and lifecycle record for an AI assistance call.
    """
    call_id: str = Field(..., description="Internal call tracking ID")
    event_id: str = Field(..., description="Source activation event ID")
    subscription_id: str = Field(..., description="Target subscription ID")
    customer_id: str = Field(..., description="Customer ID")
    customer_phone_masked: str = Field(..., description="Masked phone number for privacy safe logging")
    status: CallStatus = Field(..., description="Current call lifecycle status")
    provider_name: str = Field(..., description="Name of telephony adapter used")
    provider_call_id: Optional[str] = None
    scheduled_at: str
    initiated_at: Optional[str] = None
    completed_at: Optional[str] = None
    duration_seconds: float = 0.0
    retry_count: int = 0
    max_retries: int = 3
    dialogue_script: str
    audio_synthesized: bool = False
    is_simulated: bool = True
    failure_reason: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

