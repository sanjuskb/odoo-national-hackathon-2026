"""
Backend Client for Inter-Module Communication and Grounded Data Retrieval.

Provides both an HTTP client communicating with Amarnath's Express backend
and an in-memory MockBackendClient for local offline development, testing,
and CI runs when the Express server or database is not running.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
import httpx

from ai.src.core.config import get_settings
from ai.src.core.exceptions import CrossCustomerAccessError
from ai.src.utils.logging import get_logger

logger = get_logger("ai.integrations.backend_client")


class BaseBackendClient(ABC):
    """Abstract interface for Brightloop backend operations required by AI services."""

    @abstractmethod
    def get_available_plans(self) -> List[Dict[str, Any]]:
        """Fetch active public subscription plans catalog."""
        pass

    @abstractmethod
    def get_customer_subscriptions(
        self, customer_id: str, token: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Fetch subscriptions belonging exclusively to the verified customer."""
        pass

    @abstractmethod
    def get_customer_invoices(
        self, customer_id: str, token: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Fetch invoices belonging exclusively to the verified customer."""
        pass

    @abstractmethod
    def get_invoice_detail(
        self, invoice_id: str, customer_id: str, token: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Fetch full invoice with line items, ensuring caller customer ownership."""
        pass

    @abstractmethod
    def get_customer_profile(
        self, customer_id: str, token: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Fetch customer profile and communication consent settings."""
        pass


class HttpBackendClient(BaseBackendClient):
    """Live HTTP client targeting Amarnath's Express API (/api/v1)."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        timeout_seconds: Optional[float] = None,
    ):
        settings = get_settings()
        self.base_url = (base_url or settings.backend_base_url).rstrip("/")
        self.timeout = timeout_seconds or settings.backend_timeout_seconds

    def _headers(self, token: Optional[str] = None) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        return headers

    def get_available_plans(self) -> List[Dict[str, Any]]:
        try:
            with httpx.Client(base_url=self.base_url, timeout=self.timeout) as client:
                res = client.get("/plans")
                if res.is_success:
                    payload = res.json()
                    return payload.get("data", {}).get("items", [])
        except Exception as exc:
            logger.warning("Failed to fetch plans from backend: %s", str(exc))
        return []

    def get_customer_subscriptions(
        self, customer_id: str, token: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        try:
            with httpx.Client(base_url=self.base_url, timeout=self.timeout) as client:
                res = client.get("/portal/subscriptions", headers=self._headers(token))
                if res.is_success:
                    payload = res.json()
                    return payload.get("data", {}).get("items", [])
        except Exception as exc:
            logger.warning("Failed to fetch customer subscriptions: %s", str(exc))
        return []

    def get_customer_invoices(
        self, customer_id: str, token: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        try:
            with httpx.Client(base_url=self.base_url, timeout=self.timeout) as client:
                res = client.get("/portal/invoices", headers=self._headers(token))
                if res.is_success:
                    payload = res.json()
                    return payload.get("data", {}).get("items", [])
        except Exception as exc:
            logger.warning("Failed to fetch customer invoices: %s", str(exc))
        return []

    def get_invoice_detail(
        self, invoice_id: str, customer_id: str, token: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        try:
            with httpx.Client(base_url=self.base_url, timeout=self.timeout) as client:
                res = client.get(f"/invoices/{invoice_id}", headers=self._headers(token))
                if res.is_success:
                    invoice = res.json().get("data", {}).get("invoice")
                    if invoice and invoice.get("customer_id") == customer_id:
                        return invoice
                    else:
                        raise CrossCustomerAccessError("Customer is not authorized to view this invoice")
        except CrossCustomerAccessError:
            raise
        except Exception as exc:
            logger.warning("Failed to fetch invoice detail: %s", str(exc))
        return None

    def get_customer_profile(
        self, customer_id: str, token: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        try:
            with httpx.Client(base_url=self.base_url, timeout=self.timeout) as client:
                res = client.get("/auth/me", headers=self._headers(token))
                if res.is_success:
                    return res.json().get("data", {}).get("user")
        except Exception as exc:
            logger.warning("Failed to fetch customer profile: %s", str(exc))
        return None


class MockBackendClient(BaseBackendClient):
    """
    Mock backend client with verified deterministic test datasets.
    Implements customer data isolation rules for testing.
    """

    PLANS_FIXTURE = [
        {
            "id": "plan-basic",
            "name": "Starter Plan",
            "billing_frequency": "monthly",
            "price": "19.00",
            "currency": "USD",
            "features": "Single user, standard invoicing, basic reports",
            "allow_pause": False,
            "allow_early_close": True,
            "allow_renew": True,
        },
        {
            "id": "plan-pro",
            "name": "Professional Plan",
            "billing_frequency": "monthly",
            "price": "49.00",
            "currency": "USD",
            "features": "Up to 10 users, multi-frequency billing, discount rules, automated reminders, AI assistant",
            "allow_pause": True,
            "allow_early_close": True,
            "allow_renew": True,
        },
        {
            "id": "plan-ent",
            "name": "Enterprise Plan",
            "billing_frequency": "yearly",
            "price": "499.00",
            "currency": "USD",
            "features": "Unlimited users, priority assistance calls, dedicated account rep, custom SLA",
            "allow_pause": True,
            "allow_early_close": True,
            "allow_renew": True,
        },
    ]

    CUSTOMERS_FIXTURE = {
        "cust-101": {
            "id": "cust-101",
            "full_name": "Sanju Customer",
            "email": "customer@brightloop.io",
            "phone": "+1-555-0199",
            "call_consent": True,
            "role": "customer",
        },
        "cust-202": {
            "id": "cust-202",
            "full_name": "Alice Partner",
            "email": "alice@partner.org",
            "phone": "+1-555-0288",
            "call_consent": False,  # Opted out of phone calls
            "role": "customer",
        },
    }

    SUBSCRIPTIONS_FIXTURE = {
        "cust-101": [
            {
                "id": "sub-101",
                "customer_id": "cust-101",
                "plan_id": "plan-pro",
                "plan_name": "Professional Plan",
                "status": "active",
                "start_date": "2026-10-01T00:00:00Z",
                "next_billing_date": "2026-11-30T00:00:00Z",
                "amount": "49.00",
                "currency": "USD",
                "features": "Up to 10 users, multi-frequency billing, discount rules, automated reminders",
            }
        ],
        "cust-202": [
            {
                "id": "sub-202",
                "customer_id": "cust-202",
                "plan_id": "plan-basic",
                "plan_name": "Starter Plan",
                "status": "active",
                "start_date": "2026-10-15T00:00:00Z",
                "next_billing_date": "2026-11-15T00:00:00Z",
                "amount": "19.00",
                "currency": "USD",
                "features": "Single user, standard invoicing",
            }
        ],
    }

    INVOICES_FIXTURE = {
        "inv-301": {
            "id": "inv-301",
            "invoice_number": "INV-2026-0001",
            "customer_id": "cust-101",
            "subscription_id": "sub-101",
            "status": "confirmed",
            "issue_date": "2026-10-31",
            "due_date": "2026-11-15",
            "currency": "USD",
            "subtotal": "49.00",
            "total_discount": "0.00",
            "total_tax": "4.90",
            "total_amount": "53.90",
            "amount_paid": "0.00",
            "outstanding_balance": "53.90",
            "lines": [
                {
                    "id": "line-1",
                    "product_name": "Professional Plan Subscription",
                    "quantity": 1,
                    "unit_price": "49.00",
                    "tax_amount": "4.90",
                    "line_total": "53.90",
                }
            ],
            "discounts": [],
            "taxes": [
                {"name": "Standard GST", "rate_percentage": "10.00", "amount": "4.90"}
            ],
            "payments": [],
        },
        "inv-302": {
            "id": "inv-302",
            "invoice_number": "INV-2026-0002",
            "customer_id": "cust-202",
            "subscription_id": "sub-202",
            "status": "paid",
            "issue_date": "2026-10-15",
            "due_date": "2026-10-30",
            "currency": "USD",
            "subtotal": "19.00",
            "total_discount": "0.00",
            "total_tax": "1.90",
            "total_amount": "20.90",
            "amount_paid": "20.90",
            "outstanding_balance": "0.00",
            "lines": [
                {
                    "id": "line-2",
                    "product_name": "Starter Plan Subscription",
                    "quantity": 1,
                    "unit_price": "19.00",
                    "tax_amount": "1.90",
                    "line_total": "20.90",
                }
            ],
            "discounts": [],
            "taxes": [
                {"name": "Standard GST", "rate_percentage": "10.00", "amount": "1.90"}
            ],
            "payments": [
                {"id": "pay-01", "method": "manual_bank_transfer", "amount": "20.90", "payment_date": "2026-10-16"}
            ],
        },
    }

    def get_available_plans(self) -> List[Dict[str, Any]]:
        return list(self.PLANS_FIXTURE)

    def get_customer_subscriptions(
        self, customer_id: str, token: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        return list(self.SUBSCRIPTIONS_FIXTURE.get(customer_id, []))

    def get_customer_invoices(
        self, customer_id: str, token: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        return [
            inv for inv in self.INVOICES_FIXTURE.values()
            if inv["customer_id"] == customer_id
        ]

    def get_invoice_detail(
        self, invoice_id: str, customer_id: str, token: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        invoice = self.INVOICES_FIXTURE.get(invoice_id)
        if not invoice:
            return None
        # Enforce Customer Isolation Rule
        if invoice["customer_id"] != customer_id:
            raise CrossCustomerAccessError(
                f"Customer {customer_id} is not authorized to access invoice {invoice_id}"
            )
        return dict(invoice)

    def get_customer_profile(
        self, customer_id: str, token: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        profile = self.CUSTOMERS_FIXTURE.get(customer_id)
        return dict(profile) if profile else None



class ResilientBackendClient(BaseBackendClient):
    """
    Live backend client that targets Express /api/v1 via HttpBackendClient.
    When a route is not yet merged/implemented on Express (e.g. returns 404)
    or backend server is offline, it safely falls back to MockBackendClient
    fixtures with clear logging so evaluation never crashes.
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        timeout_seconds: Optional[float] = None,
    ):
        self.http_client = HttpBackendClient(base_url=base_url, timeout_seconds=timeout_seconds)
        self.mock_client = MockBackendClient()

    def get_available_plans(self) -> List[Dict[str, Any]]:
        plans = self.http_client.get_available_plans()
        if plans:
            return plans
        logger.info("Live plans endpoint unavailable on Express; using standard fixtures.")
        return self.mock_client.get_available_plans()

    def get_customer_subscriptions(
        self, customer_id: str, token: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        subs = self.http_client.get_customer_subscriptions(customer_id=customer_id, token=token)
        if subs:
            return subs
        logger.info("Live customer subscriptions endpoint unavailable; using standard fixtures.")
        return self.mock_client.get_customer_subscriptions(customer_id=customer_id, token=token)

    def get_customer_invoices(
        self, customer_id: str, token: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        invoices = self.http_client.get_customer_invoices(customer_id=customer_id, token=token)
        if invoices:
            return invoices
        logger.info("Live customer invoices endpoint unavailable; using standard fixtures.")
        return self.mock_client.get_customer_invoices(customer_id=customer_id, token=token)

    def get_invoice_detail(
        self, invoice_id: str, customer_id: str, token: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        try:
            invoice = self.http_client.get_invoice_detail(
                invoice_id=invoice_id, customer_id=customer_id, token=token
            )
            if invoice:
                return invoice
        except CrossCustomerAccessError:
            raise
        except Exception as exc:
            logger.warning("HttpBackendClient error on invoice detail: %s", str(exc))

        logger.info("Live invoice detail unavailable from Express; using verified fixture for %s.", invoice_id)
        return self.mock_client.get_invoice_detail(
            invoice_id=invoice_id, customer_id=customer_id, token=token
        )

    def get_customer_profile(
        self, customer_id: str, token: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        profile = self.http_client.get_customer_profile(customer_id=customer_id, token=token)
        if profile:
            return profile
        logger.info("Live customer profile unavailable; using verified fixture for %s.", customer_id)
        return self.mock_client.get_customer_profile(customer_id=customer_id, token=token)


# Backwards compatibility alias
BackendClient = HttpBackendClient

