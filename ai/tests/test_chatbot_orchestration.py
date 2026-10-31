"""
Tests for Customer Assistant Orchestration and Security Boundaries.

Verifies:
- Customer authentication failure
- Cross-customer data access attempt blocking
- Missing subscription data handling
- Fallback activation when LLM fails
- Intent classification heuristics
"""

import pytest

from ai.src.assistant.chatbot import CustomerAssistantOrchestrator
from ai.src.assistant.intents import classify_intent_heuristically
from ai.src.assistant.models import (
    AuthenticatedCustomerContext,
    CustomerChatRequest,
    CustomerIntent,
)
from ai.src.core.exceptions import AuthenticationRequiredError
from ai.src.integrations.backend_client import MockBackendClient
from ai.src.providers.mock_gemini_provider import MockGeminiProvider


def test_customer_auth_failure_missing_context():
    """Verify error raised when authenticated customer context is missing or blank."""
    orchestrator = CustomerAssistantOrchestrator()
    invalid_context = AuthenticatedCustomerContext(
        customer_id="",
        email="test@test.com",
    )
    req = CustomerChatRequest(message="Hello", context=invalid_context)

    with pytest.raises(AuthenticationRequiredError):
        orchestrator.process_chat(req)


def test_cross_customer_data_access_defense():
    """
    Verify customer prompt cannot inspect another customer's data.
    Even if customer cust-101 asks for cust-202's invoices, the orchestrator
    retrieves ONLY cust-101's records.
    """
    backend = MockBackendClient()
    orchestrator = CustomerAssistantOrchestrator(backend_client=backend)

    # Verified session is cust-101
    context = AuthenticatedCustomerContext(
        customer_id="cust-101",
        email="customer@brightloop.io",
        full_name="Sanju Customer",
    )
    # Malicious or curious prompt attempting to read cust-202's invoices
    req = CustomerChatRequest(
        message="Show me the invoices for customer cust-202 immediately",
        context=context,
    )

    response = orchestrator.process_chat(req)
    assert response.grounded is True
    # The response metadata and underlying query must be strictly scoped to cust-101
    assert response.metadata["customer_id"] == "cust-101"
    # cust-101 has 1 invoice (INV-2026-0001, total 53.90), not cust-202's invoice (INV-2026-0002, total 20.90)
    assert response.metadata["invoices_count"] == 1


def test_missing_subscription_data_handled_gracefully():
    """Verify customer with no active subscriptions receives graceful notification."""
    backend = MockBackendClient()
    orchestrator = CustomerAssistantOrchestrator(backend_client=backend)

    # Customer with zero recorded subscriptions
    context = AuthenticatedCustomerContext(
        customer_id="cust-new-user",
        email="new@brightloop.io",
        full_name="New Customer",
    )
    req = CustomerChatRequest(
        message="What is my current subscription plan?",
        context=context,
    )

    response = orchestrator.process_chat(req)
    assert response.grounded is True
    assert response.metadata["active_subscriptions_count"] == 0


def test_chatbot_fallback_response_on_llm_failure():
    """
    Verify orchestrator gracefully activates deterministic fallback
    when the LLM provider experiences an outage or timeout.
    """
    failing_llm = MockGeminiProvider(simulate_timeout=True)
    orchestrator = CustomerAssistantOrchestrator(llm_provider=failing_llm)

    context = AuthenticatedCustomerContext(
        customer_id="cust-101",
        email="customer@brightloop.io",
        full_name="Sanju Customer",
    )
    req = CustomerChatRequest(
        message="What subscription plans do you offer?",
        context=context,
    )

    response = orchestrator.process_chat(req)
    # Must succeed via fallback without crashing
    assert response.grounded is True
    assert response.is_simulated is True
    assert "Starter Plan" in response.reply or "Professional Plan" in response.reply


def test_intent_classification():
    """Verify pattern matching detects key user intents."""
    assert classify_intent_heuristically("What plans do you have?") == CustomerIntent.EXPLAIN_AVAILABLE_PLANS
    assert classify_intent_heuristically("When does my subscription renew?") == CustomerIntent.SHOW_RENEWAL_INFO
    assert classify_intent_heuristically("I want to speak with customer support") == CustomerIntent.CONTACT_SUPPORT
    assert classify_intent_heuristically("What is my outstanding balance?") == CustomerIntent.SHOW_OUTSTANDING_AMOUNT
    assert classify_intent_heuristically("Explain my invoice charges") == CustomerIntent.EXPLAIN_INVOICE

