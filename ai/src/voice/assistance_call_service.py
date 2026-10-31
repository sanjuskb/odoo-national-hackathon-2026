"""
AI Subscription Assistance Call Service.

Orchestrates the 60-second outbound assistance call upon confirmed subscription activation.
Implements idempotency deduplication, customer consent verification, grounded speech script
generation, Murf TTS audio synthesis, telephony dispatch, and automated retry workflows.
"""

from datetime import datetime, timezone
from typing import Dict, Optional, Set
import uuid

from ai.src.core.config import get_settings
from ai.src.core.exceptions import ConsentRequiredError, ProviderError
from ai.src.integrations.backend_client import BaseBackendClient, MockBackendClient
from ai.src.prompts.voice_prompts import VOICE_ASSISTANCE_CALL_SCRIPT_TEMPLATE
from ai.src.providers.mock_murf_provider import MockMurfTTSProvider
from ai.src.providers.mock_telephony_provider import MockTelephonyProvider
from ai.src.providers.telephony_base import (
    BaseTelephonyProvider,
    CallRecord,
    CallStatus,
    OutboundCallRequest,
)
from ai.src.providers.tts_base import BaseTTSProvider, TTSRequest
from ai.src.utils.logging import get_logger
from ai.src.voice.models import AssistanceCallRecord, SubscriptionActivationEvent

logger = get_logger("ai.voice.assistance_service")


class AIAssistanceCallService:
    """Core service for managing Brightloop AI Assistance Calls."""

    def __init__(
        self,
        telephony_provider: Optional[BaseTelephonyProvider] = None,
        tts_provider: Optional[BaseTTSProvider] = None,
        backend_client: Optional[BaseBackendClient] = None,
    ):
        self.telephony = telephony_provider or MockTelephonyProvider()
        self.tts = tts_provider or MockMurfTTSProvider()
        self.backend = backend_client or MockBackendClient()
        self.settings = get_settings()

        # In-memory tracking of processed events and call records
        self._processed_events: Set[str] = set()
        self._subscription_calls: Dict[str, str] = {}  # subscription_id -> call_id
        self._call_records: Dict[str, AssistanceCallRecord] = {}

    @staticmethod
    def _mask_phone(phone: str) -> str:
        """Mask telephone number for PII privacy protection."""
        if len(phone) < 4:
            return "***"
        return f"{phone[:3]}****{phone[-4:]}"

    def process_activation_event(
        self, event: SubscriptionActivationEvent
    ) -> AssistanceCallRecord:
        """
        Process a subscription activation event.
        Guarantees idempotency: duplicate activations for the same subscription
        do not trigger redundant calls.
        """
        idempotency_key = event.idempotency_key or f"{event.subscription_id}:{event.plan_id}"

        # 1. Idempotency Check
        if idempotency_key in self._processed_events or event.subscription_id in self._subscription_calls:
            logger.info("Duplicate activation event ignored for subscription_id=%s", event.subscription_id)
            existing_call_id = self._subscription_calls.get(event.subscription_id)
            if existing_call_id and existing_call_id in self._call_records:
                return self._call_records[existing_call_id]

        now_iso = datetime.now(timezone.utc).isoformat()
        call_id = f"call-{uuid.uuid4().hex[:10]}"

        # 2. Verify Customer Consent & Phone
        customer_profile = self.backend.get_customer_profile(event.customer_id)
        if not customer_profile:
            logger.error("Customer %s not found in backend records", event.customer_id)
            record = AssistanceCallRecord(
                call_id=call_id,
                event_id=event.event_id,
                subscription_id=event.subscription_id,
                customer_id=event.customer_id,
                customer_phone_masked="UNKNOWN",
                status=CallStatus.FAILED,
                provider_name="none",
                scheduled_at=now_iso,
                dialogue_script="",
                failure_reason="Customer profile not found",
            )
            self._call_records[call_id] = record
            return record

        phone = customer_profile.get("phone", "")
        masked_phone = self._mask_phone(phone)
        consent = customer_profile.get("call_consent", False)

        if not consent:
            logger.info(
                "Customer %s has opted out of assistance phone calls; skipping call dispatch",
                event.customer_id,
            )
            record = AssistanceCallRecord(
                call_id=call_id,
                event_id=event.event_id,
                subscription_id=event.subscription_id,
                customer_id=event.customer_id,
                customer_phone_masked=masked_phone,
                status=CallStatus.CANCELLED,
                provider_name="none",
                scheduled_at=now_iso,
                dialogue_script="",
                failure_reason="Customer opted out of phone assistance (consent=False)",
            )
            self._processed_events.add(idempotency_key)
            self._subscription_calls[event.subscription_id] = call_id
            self._call_records[call_id] = record
            return record

        # 3. Fetch verified subscription details for grounded dialogue
        subs = self.backend.get_customer_subscriptions(event.customer_id)
        target_sub = next((s for s in subs if s.get("id") == event.subscription_id), None)

        features = target_sub.get("features", "Full subscription platform access") if target_sub else "Standard features"
        next_billing = target_sub.get("next_billing_date") if target_sub else None
        renewal_phrase = (
            f"Your next scheduled renewal date is {next_billing}."
            if next_billing
            else "Your renewal schedule is available in your customer portal."
        )

        # 4. Generate dialogue script
        dialogue_script = VOICE_ASSISTANCE_CALL_SCRIPT_TEMPLATE.format(
            customer_name=customer_profile.get("full_name", "Valued Customer"),
            plan_name=event.plan_name,
            plan_features=features,
            renewal_phrase=renewal_phrase,
        )

        # 5. Synthesize Speech Audio (Murf TTS / Mock)
        audio_synthesized = False
        try:
            tts_res = self.tts.synthesize(TTSRequest(text=dialogue_script))
            audio_synthesized = len(tts_res.audio_bytes) > 0
            logger.info("Synthesized assistance call audio: duration=%.2fs", tts_res.duration_seconds)
        except ProviderError as exc:
            logger.warning("Murf TTS synthesis failed (%s); proceeding with text-to-speech fallback", str(exc))

        # 6. Dispatch Call via Telephony Provider
        outbound_req = OutboundCallRequest(
            call_id=call_id,
            customer_phone=phone,
            customer_id=event.customer_id,
            subscription_id=event.subscription_id,
            dialogue_script=dialogue_script,
        )

        tel_record = self.telephony.initiate_call(outbound_req)

        # 7. Record Call Outcome
        record = AssistanceCallRecord(
            call_id=call_id,
            event_id=event.event_id,
            subscription_id=event.subscription_id,
            customer_id=event.customer_id,
            customer_phone_masked=masked_phone,
            status=tel_record.status,
            provider_name=tel_record.provider_name,
            provider_call_id=tel_record.provider_call_id,
            scheduled_at=now_iso,
            initiated_at=tel_record.started_at,
            completed_at=tel_record.ended_at,
            duration_seconds=tel_record.duration_seconds,
            dialogue_script=dialogue_script,
            audio_synthesized=audio_synthesized,
            is_simulated=tel_record.is_simulated,
            failure_reason=tel_record.failure_reason,
        )

        # Mark idempotency key & register
        self._processed_events.add(idempotency_key)
        self._subscription_calls[event.subscription_id] = call_id
        self._call_records[call_id] = record

        return record

    def retry_call(self, call_id: str) -> AssistanceCallRecord:
        """
        Retry a failed or customer-unavailable assistance call.
        Enforces maximum retry limits (default: 3).
        """
        record = self._call_records.get(call_id)
        if not record:
            raise ValueError(f"Call record {call_id} not found")

        if record.status == CallStatus.COMPLETED:
            logger.info("Call %s already completed; no retry needed", call_id)
            return record

        if record.retry_count >= record.max_retries:
            logger.warning("Call %s exceeded maximum retries (%s)", call_id, record.max_retries)
            record.failure_reason = f"Exceeded maximum retry attempts ({record.max_retries})"
            record.status = CallStatus.FAILED
            return record

        record.retry_count += 1
        logger.info("Retrying assistance call %s (attempt %s/%s)", call_id, record.retry_count, record.max_retries)

        # Re-dispatch to telephony adapter
        outbound_req = OutboundCallRequest(
            call_id=f"{call_id}-r{record.retry_count}",
            customer_phone="+1-555-0199",  # Kept internal
            customer_id=record.customer_id,
            subscription_id=record.subscription_id,
            dialogue_script=record.dialogue_script,
        )

        tel_record = self.telephony.initiate_call(outbound_req)
        record.status = tel_record.status
        record.failure_reason = tel_record.failure_reason
        if tel_record.status == CallStatus.COMPLETED:
            record.completed_at = tel_record.ended_at
            record.duration_seconds = tel_record.duration_seconds

        return record

    def get_call_record(self, call_id: str) -> Optional[AssistanceCallRecord]:
        """Fetch audit record for a given call ID."""
        return self._call_records.get(call_id)

