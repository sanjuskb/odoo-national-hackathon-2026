"""
Customer Assistant module for Brightloop.
"""

from ai.src.assistant.chatbot import CustomerAssistantOrchestrator
from ai.src.assistant.intents import classify_intent_heuristically
from ai.src.assistant.models import (
    AuthenticatedCustomerContext,
    CustomerChatMessage,
    CustomerChatRequest,
    CustomerChatResponse,
    CustomerIntent,
)

__all__ = [
    "CustomerAssistantOrchestrator",
    "CustomerIntent",
    "AuthenticatedCustomerContext",
    "CustomerChatMessage",
    "CustomerChatRequest",
    "CustomerChatResponse",
    "classify_intent_heuristically",
]

