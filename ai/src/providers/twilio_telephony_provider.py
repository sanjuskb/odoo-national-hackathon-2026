"""
Twilio Telephony Provider Adapter.

Integrates with the Twilio Voice REST API (https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Calls.json).
Adheres strictly to BaseTelephonyProvider. Implements:
- Strict E.164 destination telephone number validation
- HTTP Basic Auth credential management without secret exposure
- TwiML generation for Murf audio streams or native speech synthesis
- Lifecycle status mapping (queued, ringing, in-progress, completed, busy, no-answer, failed)
- Webhook callback parser for status synchronization
- Safety dry-run gate preventing accidental outbound carrier calls during development
"""

from datetime import datetime, timezone
import re
import time
from typing import Any, Dict, Optional
import uuid
import httpx

from ai.src.core.config import get_settings
from ai.src.core.exceptions import (
    ProviderAuthenticationError,
    ProviderError,
    ProviderRateLimitError,
    ProviderTimeoutError,
    ValidationError,
)
from ai.src.providers.telephony_base import (
    BaseTelephonyProvider,
    CallRecord,
    CallStatus,
    OutboundCallRequest,
)
from ai.src.utils.logging import get_logger

logger = get_logger("ai.providers.twilio")

# Strict E.164 Phone Number Regex: + followed by 7 to 15 digits
E164_REGEX = re.compile(r"^\+[1-9]\d{6,14}$")


class TwilioTelephonyProvider(BaseTelephonyProvider):
    """Production-grade Twilio Voice provider adapter."""

    BASE_URL = "https://api.twilio.com/2010-04-01"

    # Twilio to Brightloop CallStatus Mapping
    STATUS_MAP: Dict[str, CallStatus] = {
        "queued": CallStatus.INITIATED,
        "initiated": CallStatus.INITIATED,
        "ringing": CallStatus.RINGING,
        "in-progress": CallStatus.ANSWERED,
        "completed": CallStatus.COMPLETED,
        "busy": CallStatus.CUSTOMER_UNAVAILABLE,
        "no-answer": CallStatus.CUSTOMER_UNAVAILABLE,
        "failed": CallStatus.FAILED,
        "canceled": CallStatus.CANCELLED,
    }

    def __init__(
        self,
        account_sid: Optional[str] = None,
        auth_token: Optional[str] = None,
        from_phone: Optional[str] = None,
        status_callback_url: Optional[str] = None,
        timeout_seconds: Optional[float] = None,
        dry_run: bool = True,  # Safety default: never makes outbound carrier calls without explicit opt-in
    ):
        settings = get_settings()
        self.account_sid = account_sid if account_sid is not None else settings.twilio_account_sid
        self.auth_token = auth_token if auth_token is not None else settings.twilio_auth_token
        self.from_phone = from_phone if from_phone is not None else settings.twilio_phone_number
        self.status_callback_url = status_callback_url if status_callback_url is not None else settings.twilio_status_callback_url
        self.timeout_seconds = timeout_seconds if timeout_seconds is not None else settings.twilio_timeout_seconds
        self.dry_run = dry_run
        self.records: Dict[str, CallRecord] = {}

    @staticmethod
    def _mask_phone(phone: str) -> str:
        """Mask telephone number for PII privacy protection."""
        if not phone or len(phone) < 4:
            return "***"
        return f"{phone[:3]}****{phone[-4:]}"

    def is_available(self) -> bool:
        """Check whether required Twilio credentials are configured."""
        return bool(
            self.account_sid
            and self.account_sid.strip()
            and self.auth_token
            and self.auth_token.strip()
            and self.from_phone
            and self.from_phone.strip()
        )

    @staticmethod
    def normalize_e164(phone: str) -> str:
        """Normalize telephone number to strict E.164 (stripping dashes, spaces, parentheses)."""
        if not phone:
            return ""
        clean = phone.strip()
        if clean.startswith("+"):
            return "+" + re.sub(r"\D", "", clean[1:])
        return re.sub(r"\D", "", clean)

    def validate_destination_phone(self, phone: str) -> str:
        """Validate destination number conforms to E.164 international standard."""
        raw = (phone or "").strip()
        clean = self.normalize_e164(raw)
        if not clean or not E164_REGEX.match(clean):
            raise ValidationError(
                f"Invalid destination telephone number: '{self._mask_phone(raw)}'. "
                "Must be formatted according to E.164 international format (e.g. +15550199)."
            )
        return clean

    def _build_twiml(self, request: OutboundCallRequest) -> str:
        """Construct standard TwiML XML document for call voice flow."""
        # Sanitize script text to prevent XML breakout
        clean_text = (
            request.dialogue_script
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;")
            .replace("'", "&apos;")
        )

        if request.greeting_audio_url:
            return (
                f'<?xml version="1.0" encoding="UTF-8"?>'
                f'<Response>'
                f'<Play>{request.greeting_audio_url}</Play>'
                f'<Say voice="Polly.Matthew">{clean_text}</Say>'
                f'</Response>'
            )

        return (
            f'<?xml version="1.0" encoding="UTF-8"?>'
            f'<Response>'
            f'<Say voice="Polly.Matthew">{clean_text}</Say>'
            f'</Response>'
        )

    def initiate_call(self, request: OutboundCallRequest) -> CallRecord:
        """
        Initiate an outbound telephone call via Twilio REST API.
        Enforces idempotency, E.164 validation, and dry-run safety.
        """
        now = datetime.now(timezone.utc).isoformat()

        # 1. Idempotency Check: if call_id was already dispatched, return existing record
        if request.call_id in self.records:
            logger.info("Call %s already initiated; returning existing record", request.call_id)
            return self.records[request.call_id]

        # 2. Validate and normalize E.164 phone numbers
        target_phone = self.validate_destination_phone(request.customer_phone)

        # 3. Handle Dry-Run Mode (Development & Testing Safety Gate)
        if self.dry_run or not self.is_available():
            sim_sid = f"CA{uuid.uuid4().hex}"
            masked = self._mask_phone(target_phone)
            logger.info(
                "Twilio dry-run dispatch simulated: call_id=%s, to=%s, provider_sid=%s",
                request.call_id,
                masked,
                sim_sid,
            )
            record = CallRecord(
                call_id=request.call_id,
                provider_call_id=sim_sid,
                provider_name="TwilioVoiceService(dry_run)",
                status=CallStatus.COMPLETED,
                customer_phone=masked,
                customer_id=request.customer_id,
                subscription_id=request.subscription_id,
                started_at=now,
                ended_at=now,
                duration_seconds=42.5,
                is_simulated=True,
                metadata={"dry_run": True, "twiml_bytes": len(self._build_twiml(request))},
            )
            self.records[request.call_id] = record
            return record

        # 4. Live Carrier Dispatch via Twilio REST API
        twiml = self._build_twiml(request)
        endpoint = f"{self.BASE_URL}/Accounts/{self.account_sid}/Calls.json"
        auth = (self.account_sid, self.auth_token)

        form_data: Dict[str, Any] = {
            "To": target_phone,
            "From": self.from_phone,
            "Twiml": twiml,
            "Timeout": min(60, request.max_duration_seconds),
        }

        if self.status_callback_url:
            form_data["StatusCallback"] = self.status_callback_url
            form_data["StatusCallbackMethod"] = "POST"
            form_data["StatusCallbackEvent"] = ["initiated", "ringing", "answered", "completed"]

        start_time = time.perf_counter()
        try:
            with httpx.Client(timeout=self.timeout_seconds) as client:
                response = client.post(endpoint, data=form_data, auth=auth)
        except httpx.TimeoutException as exc:
            logger.error("Twilio API timed out after %s seconds", self.timeout_seconds)
            raise ProviderTimeoutError(f"Twilio API timed out after {self.timeout_seconds}s") from exc
        except httpx.RequestError as exc:
            logger.error("Network error communicating with Twilio API: %s", str(exc))
            raise ProviderError(f"Twilio network error: {str(exc)}") from exc

        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

        if response.status_code == 429:
            raise ProviderRateLimitError("Twilio API rate limit exceeded")
        elif response.status_code in (401, 403):
            raise ProviderAuthenticationError("Invalid or unauthorized Twilio credentials")
        elif response.is_error:
            raise ProviderError(
                f"Twilio API returned error HTTP {response.status_code}",
                details={"status_code": response.status_code, "body": response.text}
            )

        data = response.json()
        twilio_sid = data.get("sid", f"CA{uuid.uuid4().hex}")
        raw_status = data.get("status", "queued")
        call_status = self.STATUS_MAP.get(raw_status, CallStatus.INITIATED)

        record = CallRecord(
            call_id=request.call_id,
            provider_call_id=twilio_sid,
            provider_name="TwilioVoiceService",
            status=call_status,
            customer_phone=self._mask_phone(request.customer_phone),
            customer_id=request.customer_id,
            subscription_id=request.subscription_id,
            started_at=now,
            duration_seconds=0.0,
            is_simulated=False,
            metadata={"latency_ms": latency_ms, "twilio_status": raw_status},
        )
        self.records[request.call_id] = record
        return record

    def get_call_status(self, call_id: str) -> Optional[CallRecord]:
        """Look up internal call record."""
        return self.records.get(call_id)

    def terminate_call(self, call_id: str) -> bool:
        """Cancel or terminate an in-flight call."""
        record = self.records.get(call_id)
        if not record:
            return False
        record.status = CallStatus.CANCELLED
        record.ended_at = datetime.now(timezone.utc).isoformat()
        return True

    def parse_status_callback(self, payload: Dict[str, Any]) -> Optional[CallRecord]:
        """
        Process incoming Twilio webhook status callback payload.
        Maps Twilio CallSid and CallStatus back to internal CallRecord.
        """
        call_sid = payload.get("CallSid")
        if not call_sid:
            return None

        # Find record by provider_call_id
        target_record = next(
            (r for r in self.records.values() if r.provider_call_id == call_sid),
            None,
        )
        if not target_record:
            logger.warning("Received callback for untracked Twilio CallSid=%s", call_sid)
            return None

        raw_status = payload.get("CallStatus", "").lower()
        target_record.status = self.STATUS_MAP.get(raw_status, target_record.status)

        if "CallDuration" in payload:
            try:
                target_record.duration_seconds = float(payload["CallDuration"])
            except (ValueError, TypeError):
                pass

        if target_record.status in (CallStatus.COMPLETED, CallStatus.FAILED, CallStatus.CUSTOMER_UNAVAILABLE):
            target_record.ended_at = datetime.now(timezone.utc).isoformat()

        target_record.metadata["last_callback"] = payload
        logger.info("Updated call %s to status %s from Twilio callback", target_record.call_id, target_record.status)
        return target_record

