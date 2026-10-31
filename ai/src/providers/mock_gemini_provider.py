"""
Mock Gemini LLM Provider Adapter.

Provides deterministic, offline simulated completions for automated testing,
local development, and environments without active Gemini API keys.
Includes hooks to simulate timeouts, rate limits, and custom response templates.
"""

import time
from typing import Any, Callable, Dict, List, Optional
from ai.src.core.exceptions import (
    ProviderAuthenticationError,
    ProviderRateLimitError,
    ProviderTimeoutError,
)
from ai.src.providers.llm_base import BaseLLMProvider, LLMMessage, LLMResponse
from ai.src.utils.logging import get_logger

logger = get_logger("ai.providers.mock_gemini")


class MockGeminiProvider(BaseLLMProvider):
    """Mock Gemini provider for local development, CI testing, and evaluation."""

    def __init__(
        self,
        model: str = "mock-gemini-1.5-flash",
        simulate_timeout: bool = False,
        simulate_rate_limit: bool = False,
        simulate_auth_error: bool = False,
        latency_ms: float = 15.0,
        custom_responder: Optional[Callable[[str], str]] = None,
    ):
        self.model = model
        self.simulate_timeout = simulate_timeout
        self.simulate_rate_limit = simulate_rate_limit
        self.simulate_auth_error = simulate_auth_error
        self.latency_ms = latency_ms
        self.custom_responder = custom_responder
        self.invocation_count = 0

    def is_available(self) -> bool:
        """Mock provider is always available unless auth error is simulated."""
        return not self.simulate_auth_error

    def _generate_response(self, text: str, system_prompt: Optional[str] = None) -> LLMResponse:
        """Internal mock response dispatcher."""
        self.invocation_count += 1

        if self.simulate_auth_error:
            raise ProviderAuthenticationError("Simulated missing or invalid API key in mock Gemini provider")

        if self.simulate_rate_limit:
            raise ProviderRateLimitError("Simulated Gemini API rate limit error (HTTP 429)")

        if self.simulate_timeout:
            raise ProviderTimeoutError("Simulated Gemini provider timeout")

        start = time.perf_counter()

        if self.custom_responder:
            reply = self.custom_responder(text)
        else:
            # Deterministic, grounded mock responses based on input keywords
            lower_text = text.lower()
            if "plan" in lower_text or "tier" in lower_text:
                reply = (
                    "Brightloop offers 3 transparent subscription plans:\n"
                    "- Basic ($19/mo): Core invoicing & billing features\n"
                    "- Professional ($49/mo): Multi-frequency billing, discount rules, automated reminders\n"
                    "- Enterprise ($149/mo): Dedicated account manager, priority assistance calls, custom SLA."
                )
            elif "invoice" in lower_text or "bill" in lower_text:
                reply = (
                    "Here is the breakdown of your latest invoice based on verified backend records:\n"
                    "- Base Subscription Charge: $49.00\n"
                    "- Applied Discounts: -$0.00\n"
                    "- Taxes (10% GST): $4.90\n"
                    "- Total Due: $53.90\n"
                    "Status: CONFIRMED. Due date: 2026-11-15."
                )
            elif "renewal" in lower_text:
                reply = (
                    "Your Professional plan subscription is scheduled to renew automatically on 2026-11-30. "
                    "Your recorded payment method will be charged $49.00."
                )
            elif "subscription" in lower_text:
                reply = (
                    "You have 1 active subscription: 'Professional Monthly' (ID: sub-101), "
                    "started on 2026-10-01. Status: ACTIVE."
                )
            elif "payment" in lower_text or "balance" in lower_text:
                reply = (
                    "Your account has no overdue balances. Total outstanding balance is $0.00."
                )
            elif "help" in lower_text or "support" in lower_text or "escalat" in lower_text:
                reply = (
                    "You can reach Brightloop Customer Care at support@brightloop.io or call +1-800-BRIGHTLOOP. "
                    "Our support hours are Mon-Fri 9:00 AM - 6:00 PM."
                )
            else:
                reply = (
                    "Hello! I am your Brightloop Customer Assistant. I can help explain your subscription plans, "
                    "review your active invoices, show upcoming renewal dates, or connect you with support."
                )

        latency = self.latency_ms or round((time.perf_counter() - start) * 1000, 2)

        return LLMResponse(
            content=reply,
            model=self.model,
            latency_ms=latency,
            finish_reason="stop",
            is_simulated=True,
            raw_response={"mock_provider": True, "call_index": self.invocation_count},
        )

    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_output_tokens: int = 1024,
        **kwargs: Any,
    ) -> LLMResponse:
        return self._generate_response(prompt, system_prompt)

    def chat(
        self,
        messages: List[LLMMessage],
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_output_tokens: int = 1024,
        **kwargs: Any,
    ) -> LLMResponse:
        last_message = messages[-1].content if messages else ""
        return self._generate_response(last_message, system_prompt)

