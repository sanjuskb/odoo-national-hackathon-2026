"""
Tests for AI Subscription Assistance Call Workflow.

Verifies:
- Activation event processing
- Idempotency / duplicate activation deduplication
- Customer opt-out / consent checking
- Telephony provider failure handling
- Call retry behavior and backoff limits
- Phone number privacy masking
"""

import pytest

from ai.src.integrations.backend_client import MockBackendClient
from ai.src.providers.mock_telephony_provider import MockTelephonyProvider
from ai.src.providers.telephony_base import CallStatus
from ai.src.voice.assistance_call_service import AIAssistanceCallService
from ai.src.voice.models import SubscriptionActivationEvent


def test_subscription_activation_initiates_call():
    """Verify active subscription event triggers outbound assistance call."""
    service = AIAssistanceCallService()
    event = SubscriptionActivationEvent(
        event_id="evt-001",
        subscription_id="sub-101",
        customer_id="cust-101",
        plan_id="plan-pro",
        plan_name="Professional Plan",
    )

    record = service.process_activation_event(event)
    assert record.status == CallStatus.COMPLETED
    assert record.customer_id == "cust-101"
    assert record.is_simulated is True
    assert "Professional Plan" in record.dialogue_script
    # Phone number must be masked in audit record
    assert record.customer_phone_masked.endswith("0199")
    assert "****" in record.customer_phone_masked


def test_duplicate_activation_event_deduplication():
    """Verify duplicate events for the same subscription do NOT place multiple calls."""
    service = AIAssistanceCallService()
    event = SubscriptionActivationEvent(
        event_id="evt-001",
        subscription_id="sub-101",
        customer_id="cust-101",
        plan_id="plan-pro",
        plan_name="Professional Plan",
    )

    record1 = service.process_activation_event(event)
    record2 = service.process_activation_event(event)

    # Must return the identical call_id (no duplicate call placed)
    assert record1.call_id == record2.call_id


def test_customer_without_call_consent_is_skipped():
    """Verify customer who opted out of calls (call_consent=False) is NOT called."""
    backend = MockBackendClient()
    service = AIAssistanceCallService(backend_client=backend)

    # cust-202 has call_consent=False in CUSTOMERS_FIXTURE
    event = SubscriptionActivationEvent(
        event_id="evt-002",
        subscription_id="sub-202",
        customer_id="cust-202",
        plan_id="plan-basic",
        plan_name="Starter Plan",
    )

    record = service.process_activation_event(event)
    assert record.status == CallStatus.CANCELLED
    assert "opted out" in record.failure_reason.lower()


def test_telephony_provider_failure_handling():
    """Verify graceful handling when telephony provider experiences network failure."""
    failing_telephony = MockTelephonyProvider(simulate_network_failure=True)
    service = AIAssistanceCallService(telephony_provider=failing_telephony)

    event = SubscriptionActivationEvent(
        event_id="evt-003",
        subscription_id="sub-101",
        customer_id="cust-101",
        plan_id="plan-pro",
        plan_name="Professional Plan",
    )

    record = service.process_activation_event(event)
    assert record.status == CallStatus.FAILED
    assert "trunk outage" in record.failure_reason.lower()


def test_call_retry_workflow():
    """Verify failed or unavailable calls can be retried up to max_retries limit."""
    telephony = MockTelephonyProvider(default_outcome=CallStatus.CUSTOMER_UNAVAILABLE)
    service = AIAssistanceCallService(telephony_provider=telephony)

    event = SubscriptionActivationEvent(
        event_id="evt-004",
        subscription_id="sub-101",
        customer_id="cust-101",
        plan_id="plan-pro",
        plan_name="Professional Plan",
    )

    record = service.process_activation_event(event)
    assert record.status == CallStatus.CUSTOMER_UNAVAILABLE
    assert record.retry_count == 0

    # Retry 1
    r1 = service.retry_call(record.call_id)
    assert r1.retry_count == 1

    # Retry 2
    r2 = service.retry_call(record.call_id)
    assert r2.retry_count == 2

    # Retry 3
    r3 = service.retry_call(record.call_id)
    assert r3.retry_count == 3

    # Retry 4 (Exceeds max retries = 3)
    r4 = service.retry_call(record.call_id)
    assert r4.status == CallStatus.FAILED
    assert "exceeded maximum retry" in r4.failure_reason.lower()

