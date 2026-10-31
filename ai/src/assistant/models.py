"""
Data Models for Brightloop Customer Assistant.
"""

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class CustomerIntent(str, Enum):
    EXPLAIN_AVAILABLE_PLANS = "explain_available_plans"
    SHOW_ACTIVE_SUBSCRIPTIONS = "show_active_subscriptions"
    EXPLAIN_SUBSCRIBED_PLAN = "explain_subscribed_plan"
    SHOW_RENEWAL_INFO = "show_renewal_info"
    RETRIEVE_INVOICES = "retrieve_invoices"
    EXPLAIN_INVOICE = "explain_invoice"
    EXPLAIN_PAYMENT_STATUS = "explain_payment_status"
    SHOW_OUTSTANDING_AMOUNT = "show_outstanding_amount"
    EXPLAIN_UPGRADE_OPTIONS = "explain_upgrade_options"
    CONTACT_SUPPORT = "contact_support"
    GENERAL_INQUIRY = "general_inquiry"


class AuthenticatedCustomerContext(BaseModel):
    """
    Verified customer identity supplied by backend session/token.
    NEVER populated from raw user input.
    """
    customer_id: str = Field(..., description="Unique customer identifier verified by backend")
    email: str = Field(..., description="Verified customer email")
    full_name: str = Field(default="Valued Customer", description="Customer full name")
    role: str = Field(default="customer", description="User role (must be customer or admin)")
    session_token: Optional[str] = Field(default=None, description="Bearer token for downstream backend calls")


class CustomerChatMessage(BaseModel):
    role: str
    content: str
    timestamp: Optional[str] = None


class CustomerChatRequest(BaseModel):
    """Request payload for customer assistant conversation."""
    message: str = Field(..., min_length=1, max_length=2000, description="Customer message")
    context: AuthenticatedCustomerContext = Field(..., description="Verified authenticated session context")
    conversation_history: List[CustomerChatMessage] = Field(default_factory=list)


class CustomerChatResponse(BaseModel):
    """Structured response from customer assistant orchestrator."""
    reply: str = Field(..., description="Grounded, safe assistant reply")
    intent: CustomerIntent = Field(..., description="Detected intent of the customer request")
    grounded: bool = Field(default=True, description="Whether response is strictly grounded in verified data")
    is_simulated: bool = Field(default=False, description="Whether LLM/TTS provider used was a mock")
    latency_ms: float = Field(default=0.0, description="Processing latency")
    disclaimer: str = Field(
        default="Brightloop AI Assistant operates in read-only advisory mode. Financial transactions and plan modifications must be confirmed via customer portal.",
        description="Standard safety disclaimer"
    )
    metadata: Dict[str, Any] = Field(default_factory=dict)

