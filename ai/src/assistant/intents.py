"""
Intent Classification for Customer Assistant.

Provides fast, deterministic heuristic pattern-matching with LLM fallback
to identify customer needs safely and predictably.
"""

import re
from ai.src.assistant.models import CustomerIntent


INTENT_PATTERNS = [
    (
        CustomerIntent.CONTACT_SUPPORT,
        re.compile(r"\b(support|help|human|agent|contact|call|representative|care|escalat|reach)\b", re.I),
    ),
    (
        CustomerIntent.SHOW_OUTSTANDING_AMOUNT,
        re.compile(r"\b(outstanding|due|balance|owe|unpaid|amount due)\b", re.I),
    ),
    (
        CustomerIntent.EXPLAIN_PAYMENT_STATUS,
        re.compile(r"\b(payment|paid|transaction|receipt|settled|cleared|card charged)\b", re.I),
    ),
    (
        CustomerIntent.SHOW_RENEWAL_INFO,
        re.compile(r"\b(renew|renewal|next bill|next cycle|expiry|expires|when do i pay)\b", re.I),
    ),
    (
        CustomerIntent.EXPLAIN_INVOICE,
        re.compile(r"\b(explain.*(invoice|bill)|breakdown|line item|tax.*(on bill|invoice)|charge on)\b", re.I),
    ),
    (
        CustomerIntent.RETRIEVE_INVOICES,
        re.compile(r"\b(invoices?|bills?|statements?|download invoice|past invoices)\b", re.I),
    ),
    (
        CustomerIntent.EXPLAIN_UPGRADE_OPTIONS,
        re.compile(r"\b(upgrade|downgrade|switch.*plan|change.*tier|higher tier)\b", re.I),
    ),
    (
        CustomerIntent.EXPLAIN_SUBSCRIBED_PLAN,
        re.compile(r"\b(my plan features|features of my|what does my plan include|subscribed plan)\b", re.I),
    ),
    (
        CustomerIntent.SHOW_ACTIVE_SUBSCRIPTIONS,
        re.compile(r"\b(my subscription|active subscription|current subscription|what am i subscribed)\b", re.I),
    ),
    (
        CustomerIntent.EXPLAIN_AVAILABLE_PLANS,
        re.compile(r"\b(plans?|pricing|tiers?|packages?|cost of plans?|available plans?)\b", re.I),
    ),
]


def classify_intent_heuristically(text: str) -> CustomerIntent:
    """Fast deterministic intent detection based on regex patterns."""
    text_clean = text.strip()
    for intent, pattern in INTENT_PATTERNS:
        if pattern.search(text_clean):
            return intent
    return CustomerIntent.GENERAL_INQUIRY

