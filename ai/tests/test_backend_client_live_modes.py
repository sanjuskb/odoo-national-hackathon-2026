"""
Unit tests for BackendClient LIVE vs MOCK modes, error handling, JWT forwarding,
and Express invoice format normalization.
"""

import httpx
import pytest
from unittest.mock import MagicMock, patch

from ai.src.core.exceptions import (
    BackendApiError,
    BackendConnectionError,
    CrossCustomerAccessError,
)
from ai.src.integrations.backend_client import (
    HttpBackendClient,
    MockBackendClient,
    ResilientBackendClient,
)
from ai.src.invoice.invoice_explainer import InvoiceExplanationService
from ai.src.invoice.models import InvoiceExplanationRequest
from ai.src.providers.mock_gemini_provider import MockGeminiProvider


def test_http_backend_client_jwt_forwarding():
    """Verify HttpBackendClient._headers properly attaches Bearer token."""
    client = HttpBackendClient(base_url="http://127.0.0.1:5000/api/v1")
    headers_with_token = client._headers(token="jwt-secure-token-123")
    assert headers_with_token["Authorization"] == "Bearer jwt-secure-token-123"
    assert headers_with_token["Content-Type"] == "application/json"

    headers_no_token = client._headers(token=None)
    assert "Authorization" not in headers_no_token
    assert headers_no_token["Content-Type"] == "application/json"


def test_live_mode_rejects_silent_fallback_on_404():
    """In LIVE mode, 404 from Express must raise BackendApiError, not fall back to fixtures."""
    client = ResilientBackendClient(mode="live", base_url="http://127.0.0.1:5000/api/v1")

    mock_response = MagicMock(spec=httpx.Response)
    mock_response.is_success = False
    mock_response.status_code = 404
    mock_response.json.return_value = {"success": False, "message": "Resource not found: GET /api/v1/invoices/inv-missing"}

    with patch("httpx.Client.get", return_value=mock_response):
        with pytest.raises(BackendApiError) as exc_info:
            client.get_invoice_detail(invoice_id="inv-missing", customer_id="cust-101")

        assert exc_info.value.code == "BACKEND_HTTP_404"
        assert exc_info.value.details["status_code"] == 404


def test_live_mode_rejects_silent_fallback_on_401():
    """In LIVE mode, 401 Unauthorized from Express must raise BackendApiError."""
    client = ResilientBackendClient(mode="live", base_url="http://127.0.0.1:5000/api/v1")

    mock_response = MagicMock(spec=httpx.Response)
    mock_response.is_success = False
    mock_response.status_code = 401
    mock_response.json.return_value = {"success": False, "message": "Authentication required"}

    with patch("httpx.Client.get", return_value=mock_response):
        with pytest.raises(BackendApiError) as exc_info:
            client.get_customer_subscriptions(customer_id="cust-101")

        assert exc_info.value.code == "BACKEND_HTTP_401"


def test_live_mode_rejects_silent_fallback_on_500():
    """In LIVE mode, 500 Internal Error from Express must raise BackendApiError."""
    client = ResilientBackendClient(mode="live", base_url="http://127.0.0.1:5000/api/v1")

    mock_response = MagicMock(spec=httpx.Response)
    mock_response.is_success = False
    mock_response.status_code = 500
    mock_response.json.return_value = {"success": False, "message": "Database connection pool exhausted"}

    with patch("httpx.Client.get", return_value=mock_response):
        with pytest.raises(BackendApiError) as exc_info:
            client.get_available_plans()

        assert exc_info.value.code == "BACKEND_HTTP_500"


def test_live_mode_raises_on_connection_error():
    """In LIVE mode, connection failure to Express raises BackendConnectionError without fixture fallback."""
    client = ResilientBackendClient(mode="live", base_url="http://127.0.0.1:5000/api/v1")

    with patch("httpx.Client.get", side_effect=httpx.ConnectError("Connection refused")):
        with pytest.raises(BackendConnectionError) as exc_info:
            client.get_available_plans()

        assert "unreachable" in exc_info.value.message


def test_mock_mode_uses_fixtures():
    """In MOCK/DEMO mode, fixtures are used cleanly for offline testing."""
    client = ResilientBackendClient(mode="mock")
    plans = client.get_available_plans()
    assert len(plans) >= 2
    assert plans[0]["id"] == "plan-basic"

    invoice = client.get_invoice_detail(invoice_id="inv-301", customer_id="cust-101")
    assert invoice is not None
    assert invoice["total_amount"] == "53.90"


def test_cross_customer_isolation_enforced():
    """Verify cross-customer invoice access raises CrossCustomerAccessError."""
    client = MockBackendClient()
    with pytest.raises(CrossCustomerAccessError):
        # Alice (cust-101) tries to access Bob's invoice (inv-302 owned by cust-202)
        client.get_invoice_detail(invoice_id="inv-302", customer_id="cust-101")


def test_invoice_explainer_supports_express_schema():
    """Verify InvoiceExplanationService normalizes Express repository format into grounded response."""
    # Express repository format uses: total, tax_total, discount_total, description
    express_invoice = {
        "id": "inv-express-001",
        "invoice_number": "INV-2026-EXPRESS",
        "customer_id": "cust-express-101",
        "status": "confirmed",
        "due_date": "2026-11-20",
        "currency": "INR",
        "subtotal": "1000.00",
        "discount_total": "100.00",
        "tax_total": "162.00",
        "total": "1062.00",
        "financials": {
            "total": "1062.00",
            "paid_amount": "0.00",
            "balance_due": "1062.00",
        },
        "lines": [
            {
                "product_id": "prod-001",
                "description": "Enterprise Subscription - Monthly",
                "quantity": 1,
                "unit_price": "1000.00",
                "tax_amount": "162.00",
                "line_total": "1062.00",
            }
        ],
        "taxes": [],
        "discounts": [],
    }

    mock_backend = MagicMock()
    mock_backend.get_invoice_detail.return_value = express_invoice

    service = InvoiceExplanationService(
        llm_provider=MockGeminiProvider(),
        backend_client=mock_backend,
    )

    req = InvoiceExplanationRequest(
        invoice_id="inv-express-001",
        customer_id="cust-express-101",
    )

    resp = service.explain_invoice(req)

    assert resp.invoice_number == "INV-2026-EXPRESS"
    assert resp.subtotal == "1000.00"
    assert resp.total_tax == "162.00"
    assert resp.total_discount == "100.00"
    assert resp.total_amount == "1062.00"
    assert resp.amount_paid == "0.00"
    assert resp.outstanding_balance == "1062.00"
    assert len(resp.lines) == 1
    assert resp.lines[0].product_name == "Enterprise Subscription - Monthly"
    assert resp.currency == "INR"
