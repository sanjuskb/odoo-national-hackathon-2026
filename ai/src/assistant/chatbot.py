"""
Customer Assistant Orchestrator.

Orchestrates authenticated, read-only interactions between customers, verified backend
data services, and the LLM provider. Enforces zero-trust customer scoping, preventing
prompt injection, unauthorized data access, and hallucinated financial figures.
"""

import time
from typing import Any, Dict, List, Optional

from ai.src.assistant.intents import classify_intent_heuristically
from ai.src.assistant.models import (
    AuthenticatedCustomerContext,
    CustomerChatRequest,
    CustomerChatResponse,
    CustomerIntent,
)
from ai.src.core.exceptions import (
    AuthenticationRequiredError,
    CrossCustomerAccessError,
    ProviderError,
)
from ai.src.integrations.backend_client import BaseBackendClient, MockBackendClient
from ai.src.prompts.assistant_prompts import CUSTOMER_ASSISTANT_SYSTEM_PROMPT
from ai.src.providers.llm_base import BaseLLMProvider, LLMMessage
from ai.src.providers.mock_gemini_provider import MockGeminiProvider
from ai.src.utils.logging import get_logger

logger = get_logger("ai.assistant.orchestrator")


class CustomerAssistantOrchestrator:
    """Orchestrator for grounded, authenticated customer support conversations."""

    def __init__(
        self,
        llm_provider: Optional[BaseLLMProvider] = None,
        backend_client: Optional[BaseBackendClient] = None,
    ):
        self.llm = llm_provider or MockGeminiProvider()
        self.backend = backend_client or MockBackendClient()

    def _validate_context(self, context: Optional[AuthenticatedCustomerContext]) -> AuthenticatedCustomerContext:
        """Validate verified session context."""
        if not context or not context.customer_id or not context.customer_id.strip():
            logger.error("Attempted assistant chat invocation without authenticated customer context")
            raise AuthenticationRequiredError(
                "A verified customer session is required to interact with the assistant."
            )
        return context

    def _format_subscriptions_summary(self, subs: List[Dict[str, Any]]) -> str:
        if not subs:
            return "No active subscriptions found for this account."
        lines = []
        for s in subs:
            lines.append(
                f"- Plan: {s.get('plan_name')} (ID: {s.get('id')}) | Status: {s.get('status')} | "
                f"Next Billing: {s.get('next_billing_date', 'N/A')} | Amount: ${s.get('amount', '0.00')}"
            )
        return "\n".join(lines)

    def _format_invoices_summary(self, invoices: List[Dict[str, Any]]) -> str:
        if not invoices:
            return "No invoices recorded for this account."
        lines = []
        for inv in invoices[:5]:  # Show up to 5 most recent
            lines.append(
                f"- Invoice {inv.get('invoice_number', inv.get('id'))}: Total ${inv.get('total_amount', '0.00')} | "
                f"Status: {inv.get('status')} | Due: {inv.get('due_date', 'N/A')} | "
                f"Outstanding: ${inv.get('outstanding_balance', '0.00')}"
            )
        return "\n".join(lines)

    def _format_plans_catalog(self, plans: List[Dict[str, Any]]) -> str:
        if not plans:
            return "Plan catalog currently unavailable."
        lines = []
        for p in plans:
            lines.append(
                f"- {p.get('name')} (${p.get('price')}/{p.get('billing_frequency')}): {p.get('features', '')}"
            )
        return "\n".join(lines)

    def _generate_deterministic_fallback(
        self,
        intent: CustomerIntent,
        context: AuthenticatedCustomerContext,
        subscriptions: List[Dict[str, Any]],
        invoices: List[Dict[str, Any]],
        plans: List[Dict[str, Any]],
    ) -> str:
        """Deterministic fallback responses when LLM provider is unavailable or rate-limited."""
        if intent == CustomerIntent.EXPLAIN_AVAILABLE_PLANS:
            return f"Here are the current Brightloop subscription plans:\n{self._format_plans_catalog(plans)}"
        elif intent in (CustomerIntent.SHOW_ACTIVE_SUBSCRIPTIONS, CustomerIntent.EXPLAIN_SUBSCRIBED_PLAN):
            return f"Your active subscriptions:\n{self._format_subscriptions_summary(subscriptions)}"
        elif intent == CustomerIntent.SHOW_RENEWAL_INFO:
            if subscriptions:
                sub = subscriptions[0]
                return f"Your {sub.get('plan_name')} renewal is scheduled for {sub.get('next_billing_date', 'N/A')} for ${sub.get('amount')}."
            return "You do not have any active renewing subscriptions on file."
        elif intent in (CustomerIntent.RETRIEVE_INVOICES, CustomerIntent.EXPLAIN_INVOICE):
            return f"Here is your recent invoice history:\n{self._format_invoices_summary(invoices)}"
        elif intent in (CustomerIntent.EXPLAIN_PAYMENT_STATUS, CustomerIntent.SHOW_OUTSTANDING_AMOUNT):
            outstanding_total = sum(float(inv.get("outstanding_balance", 0.0)) for inv in invoices)
            return f"Your current recorded outstanding balance is ${outstanding_total:.2f}. All payments are processed through your verified payment portal."
        elif intent == CustomerIntent.CONTACT_SUPPORT:
            return "You can reach Brightloop Customer Support at support@brightloop.io or +1-800-BRIGHTLOOP (Mon-Fri 9am-6pm)."
        return (
            f"Hello {context.full_name}, I am your Brightloop Customer Assistant. "
            f"You currently have {len(subscriptions)} active subscription(s). "
            f"How can I help you today?"
        )

    def process_chat(self, request: CustomerChatRequest) -> CustomerChatResponse:
        """
        Process incoming customer chat request with authentication, grounding,
        and fallback handling.
        """
        start_time = time.perf_counter()

        # 1. Enforce verified customer session
        context = self._validate_context(request.context)

        # 2. Defend against cross-customer data probing
        # Even if user message says "show me customer cust-202's invoices",
        # the system ONLY retrieves data for context.customer_id!
        logger.info(
            "Processing assistant query for verified customer_id=%s, email=%s",
            context.customer_id,
            context.email,
        )

        # 3. Detect customer intent
        intent = classify_intent_heuristically(request.message)

        # 4. Fetch verified factual data strictly scoped to this customer
        subscriptions = self.backend.get_customer_subscriptions(
            customer_id=context.customer_id, token=context.session_token
        )
        invoices = self.backend.get_customer_invoices(
            customer_id=context.customer_id, token=context.session_token
        )
        plans = self.backend.get_available_plans()

        # 5. Format grounded system prompt
        system_prompt = CUSTOMER_ASSISTANT_SYSTEM_PROMPT.format(
            customer_name=context.full_name,
            customer_id=context.customer_id,
            customer_email=context.email,
            subscriptions_summary=self._format_subscriptions_summary(subscriptions),
            invoices_summary=self._format_invoices_summary(invoices),
            plans_catalog=self._format_plans_catalog(plans),
        )

        # 6. Execute model inference with graceful fallback
        is_simulated = False
        try:
            # Build conversation history
            messages = []
            for past in request.conversation_history[-4:]:  # Keep recent context bounded
                messages.append(LLMMessage(role=past.role, content=past.content))
            messages.append(LLMMessage(role="user", content=request.message))

            llm_res = self.llm.chat(messages=messages, system_prompt=system_prompt)
            reply = llm_res.content
            is_simulated = llm_res.is_simulated
        except ProviderError as exc:
            logger.warning(
                "LLM provider failed (%s); activating deterministic grounded fallback", str(exc)
            )
            reply = self._generate_deterministic_fallback(
                intent=intent,
                context=context,
                subscriptions=subscriptions,
                invoices=invoices,
                plans=plans,
            )
            is_simulated = True

        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return CustomerChatResponse(
            reply=reply,
            intent=intent,
            grounded=True,
            is_simulated=is_simulated,
            latency_ms=latency_ms,
            metadata={
                "customer_id": context.customer_id,
                "active_subscriptions_count": len(subscriptions),
                "invoices_count": len(invoices),
            },
        )

