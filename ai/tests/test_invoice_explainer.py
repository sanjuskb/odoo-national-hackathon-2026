"""
Tests for AI Invoice Explanation Service.

Verifies:
- Invoice explanation uses exact persisted financial numbers without recalculating
- Cross-customer invoice access attempts are blocked
- Missing invoice handling
- Fallback narrative generation when LLM is unavailable
"""

import pytest

from ai.src.core.exceptions import CrossCustomerAccessError, ValidationError
from ai.src.integrations.backend_client import MockBackendClient
from ai.src.invoice.invoice_explainer import InvoiceExplanationService
from ai.src.invoice.models import InvoiceExplanationRequest
from ai.src.providers.mock_gemini_provider import MockGeminiProvider


def test_invoice_explanation_uses_persisted_values():
    """
    Verify explanation uses exact persisted financial totals
    without performing internal arithmetic.
    """
    backend = MockBackendClient()
    service = InvoiceExplanationService(backend_client=backend)

    # cust-101 owns inv-301 ($53.90 total, $4.90 tax)
    req = InvoiceExplanationRequest(
        invoice_id="inv-301",
        customer_id="cust-101",
    )

    res = service.explain_invoice(req)
    assert res.invoice_number == "INV-2026-0001"
    assert res.total_amount == "53.90"
    assert res.total_tax == "4.90"
    assert res.subtotal == "49.00"
    assert res.outstanding_balance == "53.90"
    assert len(res.lines) == 1
    assert res.lines[0].line_total == "53.90"


def test_cross_customer_invoice_access_forbidden():
    """
    Verify customer cust-101 CANNOT explain customer cust-202's invoice (inv-302).
    """
    backend = MockBackendClient()
    service = InvoiceExplanationService(backend_client=backend)

    # Attempting to access inv-302 (owned by cust-202) using cust-101 identity
    req = InvoiceExplanationRequest(
        invoice_id="inv-302",
        customer_id="cust-101",
    )

    with pytest.raises(CrossCustomerAccessError):
        service.explain_invoice(req)


def test_missing_invoice_raises_validation_error():
    """Verify non-existent invoice raises ValidationError."""
    backend = MockBackendClient()
    service = InvoiceExplanationService(backend_client=backend)

    req = InvoiceExplanationRequest(
        invoice_id="inv-non-existent",
        customer_id="cust-101",
    )

    with pytest.raises(ValidationError):
        service.explain_invoice(req)


def test_invoice_explainer_fallback_on_llm_failure():
    """Verify deterministic narrative is returned when LLM provider fails."""
    failing_llm = MockGeminiProvider(simulate_timeout=True)
    service = InvoiceExplanationService(llm_provider=failing_llm)

    req = InvoiceExplanationRequest(
        invoice_id="inv-301",
        customer_id="cust-101",
    )

    res = service.explain_invoice(req)
    assert res.is_simulated is True
    # The narrative must contain exact persisted values
    assert "INV-2026-0001" in res.explanation_narrative
    assert "53.90" in res.explanation_narrative
    assert "CONFIRMED" in res.explanation_narrative

