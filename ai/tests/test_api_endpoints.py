"""
Tests for FastAPI HTTP Endpoints in Brightloop AI Foundation.
"""

from fastapi.testclient import TestClient
import pytest

from ai.src.integrations.ai_service import create_app


@pytest.fixture
def client():
    app = create_app()
    return TestClient(app)


def test_health_endpoint(client):
    """Verify /health returns 200 with system and provider diagnostics."""
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "providers" in data
    assert "llm" in data["providers"]
    assert "tts" in data["providers"]
    assert "telephony" in data["providers"]


def test_chat_endpoint_success(client):
    """Verify /assistant/chat endpoint with verified customer context."""
    payload = {
        "message": "What subscription plans are available?",
        "context": {
            "customer_id": "cust-101",
            "email": "customer@brightloop.io",
            "full_name": "Sanju Customer",
            "role": "customer",
        },
    }
    res = client.post("/assistant/chat", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["grounded"] is True
    assert "Basic" in data["reply"] or "Professional" in data["reply"]


def test_chat_endpoint_missing_customer_id(client):
    """Verify /assistant/chat returns 401 if customer_id is empty."""
    payload = {
        "message": "Hello",
        "context": {
            "customer_id": "",
            "email": "anonymous@test.com",
        },
    }
    res = client.post("/assistant/chat", json=payload)
    assert res.status_code == 401


def test_invoice_explain_endpoint_success(client):
    """Verify /invoice/explain returns 200 with persisted lines and totals."""
    payload = {
        "invoice_id": "inv-301",
        "customer_id": "cust-101",
    }
    res = client.post("/invoice/explain", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["total_amount"] == "53.90"
    assert data["status"] == "confirmed"


def test_invoice_explain_endpoint_cross_customer_forbidden(client):
    """Verify /invoice/explain returns 403 on cross-customer access attempt."""
    payload = {
        "invoice_id": "inv-302",  # Owned by cust-202
        "customer_id": "cust-101",  # Requesting as cust-101
    }
    res = client.post("/invoice/explain", json=payload)
    assert res.status_code == 403


def test_assistance_call_trigger_and_status(client):
    """Verify /voice/assistance-call/trigger and status query endpoints."""
    event_payload = {
        "event_id": "evt-http-01",
        "subscription_id": "sub-101",
        "customer_id": "cust-101",
        "plan_id": "plan-pro",
        "plan_name": "Professional Plan",
    }
    res_trigger = client.post("/voice/assistance-call/trigger", json=event_payload)
    assert res_trigger.status_code == 202
    data = res_trigger.json()
    call_id = data["call_id"]
    assert data["status"] == "completed"

    # Query call status
    res_status = client.get(f"/voice/assistance-call/status/{call_id}")
    assert res_status.status_code == 200
    status_data = res_status.json()
    assert status_data["call_id"] == call_id
    assert status_data["customer_phone_masked"].endswith("0199")
