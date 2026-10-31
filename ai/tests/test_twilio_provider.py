"""
Unit Tests for Twilio Telephony Provider Adapter.

Verifies:
- Credential validation and is_available() detection
- Strict E.164 phone number formatting
- TwiML voice XML document construction
- Dry-run safety execution (no live calls placed)
- Idempotent duplicate call prevention
- Live HTTP Basic Auth request construction with mocked responses
- HTTP 401/403 authentication error mapping
- HTTP 429 rate limit mapping
- Network timeout handling
- Webhook status callback parsing and call record lifecycle progression
- PII phone masking
"""

from unittest.mock import MagicMock, patch
import httpx
import pytest

from ai.src.core.exceptions import (
    ProviderAuthenticationError,
    ProviderRateLimitError,
    ProviderTimeoutError,
    ValidationError,
)
from ai.src.providers.telephony_base import CallStatus, OutboundCallRequest
from ai.src.providers.twilio_telephony_provider import TwilioTelephonyProvider


def test_twilio_missing_credentials():
    """Verify Twilio provider detects missing credentials."""
    provider = TwilioTelephonyProvider(account_sid="", auth_token="", from_phone="")
    assert provider.is_available() is False


def test_twilio_invalid_phone_validation():
    """Verify Twilio provider rejects non-E.164 destination telephone numbers."""
    provider = TwilioTelephonyProvider(
        account_sid="ACtest_dummy_sid",
        auth_token="test_token",
        from_phone="+15551234567",
    )

    # Invalid: no plus sign, invalid characters, too short
    with pytest.raises(ValidationError):
        provider.validate_destination_phone("555-1234")

    with pytest.raises(ValidationError):
        provider.validate_destination_phone("15550199")

    # Valid: E.164 with plus and international code
    provider.validate_destination_phone("+15550199")
    provider.validate_destination_phone("+919876543210")


def test_twilio_twiml_generation():
    """Verify clean TwiML construction with XML entity escaping."""
    provider = TwilioTelephonyProvider()
    req = OutboundCallRequest(
        call_id="call-001",
        customer_phone="+15550199",
        customer_id="cust-101",
        subscription_id="sub-101",
        dialogue_script="Welcome & greetings to Brightloop <Pro Plan>!",
    )
    twiml = provider._build_twiml(req)

    assert "<?xml version=" in twiml
    assert '<Say voice="Polly.Matthew">' in twiml
    # Entities escaped
    assert "&amp;" in twiml
    assert "&lt;Pro Plan&gt;" in twiml


def test_twilio_dry_run_mode_safety():
    """Verify dry_run mode generates simulated SID without making network requests."""
    provider = TwilioTelephonyProvider(
        account_sid="ACtest", auth_token="test", from_phone="+15550100", dry_run=True
    )
    req = OutboundCallRequest(
        call_id="call-dry-01",
        customer_phone="+15550199",
        customer_id="cust-101",
        subscription_id="sub-101",
        dialogue_script="Welcome to Brightloop!",
    )
    record = provider.initiate_call(req)

    assert record.is_simulated is True
    assert record.provider_call_id.startswith("CA")
    assert record.status == CallStatus.COMPLETED
    # PII phone masked
    assert record.customer_phone == "+15****0199"


def test_twilio_idempotency_duplicate_call():
    """Verify repeated call dispatch returns existing record without duplicate dispatch."""
    provider = TwilioTelephonyProvider(dry_run=True)
    req = OutboundCallRequest(
        call_id="call-dup-01",
        customer_phone="+15550199",
        customer_id="cust-101",
        subscription_id="sub-101",
        dialogue_script="Hello!",
    )
    rec1 = provider.initiate_call(req)
    rec2 = provider.initiate_call(req)

    assert rec1.provider_call_id == rec2.provider_call_id
    assert len(provider.records) == 1


def test_twilio_live_dispatch_success():
    """Verify live carrier dispatch request format against Twilio REST API with mocked HTTP."""
    provider = TwilioTelephonyProvider(
        account_sid="ACtest123",
        auth_token="authtoken123",
        from_phone="+15550100",
        status_callback_url="https://api.brightloop.io/voice/twilio/callback",
        dry_run=False,
    )
    req = OutboundCallRequest(
        call_id="call-live-01",
        customer_phone="+15550199",
        customer_id="cust-101",
        subscription_id="sub-101",
        dialogue_script="Thank you for subscribing!",
    )

    mock_resp = MagicMock()
    mock_resp.status_code = 201
    mock_resp.is_error = False
    mock_resp.json.return_value = {
        "sid": "CA1234567890abcdef1234567890abcdef",
        "status": "queued",
        "to": "+15550199",
        "from": "+15550100",
    }

    with patch("httpx.Client.post", return_value=mock_resp) as mock_post:
        record = provider.initiate_call(req)

    assert record.is_simulated is False
    assert record.provider_call_id == "CA1234567890abcdef1234567890abcdef"
    assert record.status == CallStatus.INITIATED

    # Verify HTTP POST arguments
    mock_post.assert_called_once()
    args, kwargs = mock_post.call_args
    assert "https://api.twilio.com/2010-04-01/Accounts/ACtest123/Calls.json" in args[0]
    assert kwargs["auth"] == ("ACtest123", "authtoken123")
    assert kwargs["data"]["To"] == "+15550199"
    assert kwargs["data"]["From"] == "+15550100"


def test_twilio_auth_failure_401():
    """Verify Twilio maps HTTP 401 to ProviderAuthenticationError."""
    provider = TwilioTelephonyProvider(
        account_sid="ACbad", auth_token="bad", from_phone="+15550100", dry_run=False
    )
    req = OutboundCallRequest(
        call_id="call-live-02",
        customer_phone="+15550199",
        customer_id="cust-101",
        subscription_id="sub-101",
        dialogue_script="Test auth error",
    )

    mock_resp = MagicMock()
    mock_resp.status_code = 401
    mock_resp.is_error = True
    mock_resp.text = '{"code": 20003, "message": "Authenticate"}'

    with patch("httpx.Client.post", return_value=mock_resp):
        with pytest.raises(ProviderAuthenticationError):
            provider.initiate_call(req)


def test_twilio_rate_limit_429():
    """Verify Twilio maps HTTP 429 to ProviderRateLimitError."""
    provider = TwilioTelephonyProvider(
        account_sid="ACtest", auth_token="token", from_phone="+15550100", dry_run=False
    )
    req = OutboundCallRequest(
        call_id="call-live-03",
        customer_phone="+15550199",
        customer_id="cust-101",
        subscription_id="sub-101",
        dialogue_script="Test rate limit",
    )

    mock_resp = MagicMock()
    mock_resp.status_code = 429
    mock_resp.is_error = True

    with patch("httpx.Client.post", return_value=mock_resp):
        with pytest.raises(ProviderRateLimitError):
            provider.initiate_call(req)


def test_twilio_timeout():
    """Verify Twilio maps network timeout to ProviderTimeoutError."""
    provider = TwilioTelephonyProvider(
        account_sid="ACtest", auth_token="token", from_phone="+15550100", dry_run=False
    )
    req = OutboundCallRequest(
        call_id="call-live-04",
        customer_phone="+15550199",
        customer_id="cust-101",
        subscription_id="sub-101",
        dialogue_script="Test timeout",
    )

    with patch("httpx.Client.post", side_effect=httpx.TimeoutException("Timeout")):
        with pytest.raises(ProviderTimeoutError):
            provider.initiate_call(req)


def test_twilio_status_callback_parsing():
    """Verify incoming Twilio webhook status updates call record state."""
    provider = TwilioTelephonyProvider(dry_run=True)
    req = OutboundCallRequest(
        call_id="call-cb-01",
        customer_phone="+15550199",
        customer_id="cust-101",
        subscription_id="sub-101",
        dialogue_script="Test callback",
    )
    record = provider.initiate_call(req)
    sid = record.provider_call_id

    # 1. Ringing update
    cb1 = {"CallSid": sid, "CallStatus": "ringing"}
    up1 = provider.parse_status_callback(cb1)
    assert up1 is not None
    assert up1.status == CallStatus.RINGING

    # 2. Answered update
    cb2 = {"CallSid": sid, "CallStatus": "in-progress"}
    up2 = provider.parse_status_callback(cb2)
    assert up2 is not None
    assert up2.status == CallStatus.ANSWERED

    # 3. Completed with duration update
    cb3 = {"CallSid": sid, "CallStatus": "completed", "CallDuration": "45"}
    up3 = provider.parse_status_callback(cb3)
    assert up3 is not None
    assert up3.status == CallStatus.COMPLETED
    assert up3.duration_seconds == 45.0
    assert up3.ended_at is not None

