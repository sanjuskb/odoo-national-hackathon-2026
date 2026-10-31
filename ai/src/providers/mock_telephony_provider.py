"""
Mock Telephony Provider Adapter.

Simulates telephone network operations in-memory without placing real phone calls.
Supports all required states: scheduled, initiated, answered, completed, failed,
and customer_unavailable. Clearly tags all call records with is_simulated=True.
"""

from datetime import datetime, timezone
from typing import Dict, Optional
import uuid

from ai.src.providers.telephony_base import (
    BaseTelephonyProvider,
    CallRecord,
    CallStatus,
    OutboundCallRequest,
)
from ai.src.utils.logging import get_logger

logger = get_logger("ai.providers.mock_telephony")


class MockTelephonyProvider(BaseTelephonyProvider):
    """In-memory mock telephony adapter for testing and demonstration."""

    def __init__(
        self,
        default_outcome: CallStatus = CallStatus.COMPLETED,
        simulate_network_failure: bool = False,
    ):
        self.default_outcome = default_outcome
        self.simulate_network_failure = simulate_network_failure
        self.records: Dict[str, CallRecord] = {}

    def is_available(self) -> bool:
        return not self.simulate_network_failure

    def initiate_call(self, request: OutboundCallRequest) -> CallRecord:
        """Simulate placing an outbound call with configurable outcome."""
        now = datetime.now(timezone.utc).isoformat()
        provider_id = f"mock-tel-{uuid.uuid4().hex[:8]}"

        if self.simulate_network_failure:
            record = CallRecord(
                call_id=request.call_id,
                provider_call_id=provider_id,
                provider_name="MockTelephonyService",
                status=CallStatus.FAILED,
                customer_phone=request.customer_phone,
                customer_id=request.customer_id,
                subscription_id=request.subscription_id,
                started_at=now,
                ended_at=now,
                duration_seconds=0.0,
                is_simulated=True,
                failure_reason="Simulated carrier network trunk outage",
            )
            self.records[request.call_id] = record
            logger.warning("Simulated telephony failure for call_id=%s", request.call_id)
            return record

        # Determine target simulated outcome
        status = self.default_outcome
        failure_reason = None
        duration = 0.0

        if status == CallStatus.COMPLETED:
            duration = 42.5
        elif status == CallStatus.CUSTOMER_UNAVAILABLE:
            failure_reason = "Customer line busy or unanswered after 6 rings"
        elif status == CallStatus.FAILED:
            failure_reason = "Carrier routing rejection"

        record = CallRecord(
            call_id=request.call_id,
            provider_call_id=provider_id,
            provider_name="MockTelephonyService",
            status=status,
            customer_phone=request.customer_phone,
            customer_id=request.customer_id,
            subscription_id=request.subscription_id,
            started_at=now,
            ended_at=now if status in (CallStatus.COMPLETED, CallStatus.FAILED, CallStatus.CUSTOMER_UNAVAILABLE) else None,
            duration_seconds=duration,
            is_simulated=True,
            failure_reason=failure_reason,
            metadata={"script_preview": request.dialogue_script[:60]},
        )
        self.records[request.call_id] = record
        logger.info(
            "Mock call recorded: call_id=%s status=%s phone=%s",
            request.call_id,
            status.value,
            request.customer_phone,
        )
        return record

    def get_call_status(self, call_id: str) -> Optional[CallRecord]:
        return self.records.get(call_id)

    def terminate_call(self, call_id: str) -> bool:
        if call_id in self.records:
            record = self.records[call_id]
            record.status = CallStatus.COMPLETED
            record.ended_at = datetime.now(timezone.utc).isoformat()
            return True
        return False

