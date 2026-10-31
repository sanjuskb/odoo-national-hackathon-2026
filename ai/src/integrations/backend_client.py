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
from ai.src.core.exceptions import (
    BackendApiError,
    BackendConnectionError,
    CrossCustomerAccessError,
)
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

    def _handle_response(self, res: httpx.Response, endpoint: str) -> Dict[str, Any]:
        if res.is_success:
            return res.json()
        status_code = res.status_code
        try:
            err_json = res.json()
            msg = err_json.get("message") or f"HTTP {status_code}"
        except Exception:
            msg = f"HTTP {status_code}: {res.text[:100]}"

        raise BackendApiError(
            status_code=status_code,
            message=f"{endpoint} failed - {msg}",
            details={"endpoint": endpoint, "status_code": status_code},
        )

    def get_available_plans(self) -> List[Dict[str, Any]]:
        try:
            with httpx.Client(base_url=self.base_url, timeout=self.timeout) as client:
                res = client.get("/plans")
                payload = self._handle_response(res, "GET /plans")
                return payload.get("data", {}).get("items", [])
        except BackendApiError:
            raise
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            raise BackendConnectionError(
                f"Express backend unreachable at {self.base_url}/plans: {str(exc)}"
            )
        except Exception as exc:
            raise BackendConnectionError(f"Backend plans query failed: {str(exc)}")

    def get_customer_subscriptions(
        self, customer_id: str, token: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        try:
            with httpx.Client(base_url=self.base_url, timeout=self.timeout) as client:
                res = client.get("/portal/subscriptions", headers=self._headers(token))
                payload = self._handle_response(res, "GET /portal/subscriptions")
                return payload.get("data", {}).get("items", [])
        except BackendApiError:
            raise
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            raise BackendConnectionError(
                f"Express backend unreachable at {self.base_url}/portal/subscriptions: {str(exc)}"
            )
        except Exception as exc:
            raise BackendConnectionError(f"Backend subscriptions query failed: {str(exc)}")

    def get_customer_invoices(
        self, customer_id: str, token: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        try:
            with httpx.Client(base_url=self.base_url, timeout=self.timeout) as client:
                res = client.get("/portal/invoices", headers=self._headers(token))
                payload = self._handle_response(res, "GET /portal/invoices")
                return payload.get("data", {}).get("items", [])
        except BackendApiError:
            raise
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            raise BackendConnectionError(
                f"Express backend unreachable at {self.base_url}/portal/invoices: {str(exc)}"
            )
        except Exception as exc:
            raise BackendConnectionError(f"Backend customer invoices query failed: {str(exc)}")

    def get_invoice_detail(
        self, invoice_id: str, customer_id: str, token: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        try:
            with httpx.Client(base_url=self.base_url, timeout=self.timeout) as client:
                res = client.get(f"/invoices/{invoice_id}", headers=self._headers(token))
                payload = self._handle_response(res, f"GET /invoices/{invoice_id}")
                invoice = payload.get("data", {}).get("invoice")
                if not invoice:
                    return None
                if invoice.get("customer_id") != customer_id:
                    raise CrossCustomerAccessError(
                        f"Customer {customer_id} is not authorized to access invoice {invoice_id}"
                    )
                return invoice
        except (BackendApiError, CrossCustomerAccessError):
            raise
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            raise BackendConnectionError(
                f"Express backend unreachable at {self.base_url}/invoices/{invoice_id}: {str(exc)}"
            )
        except Exception as exc:
            raise BackendConnectionError(f"Backend invoice query failed: {str(exc)}")

    def get_customer_profile(
        self, customer_id: str, token: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        try:
            with httpx.Client(base_url=self.base_url, timeout=self.timeout) as client:
                res = client.get("/auth/me", headers=self._headers(token))
                payload = self._handle_response(res, "GET /auth/me")
                return payload.get("data", {}).get("user")
        except BackendApiError:
            raise
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            raise BackendConnectionError(
                f"Express backend unreachable at {self.base_url}/auth/me: {str(exc)}"
            )
        except Exception as exc:
            raise BackendConnectionError(f"Backend profile query failed: {str(exc)}")


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
            "taxes": [
                {
                    "name": "Standard GST",
                    "rate_percentage": "10.00",
                    "amount": "4.90",
                }
            ],
            "discounts": [],
        },
        "inv-302": {
            "id": "inv-302",
            "invoice_number": "INV-2026-0002",
            "customer_id": "cust-202",
            "subscription_id": "sub-202",
            "status": "confirmed",
            "issue_date": "2026-10-15",
            "due_date": "2026-10-30",
            "currency": "USD",
            "subtotal": "19.00",
            "total_discount": "0.00",
            "total_tax": "0.00",
            "total_amount": "19.00",
            "amount_paid": "19.00",
            "outstanding_balance": "0.00",
            "lines": [
                {
                    "id": "line-2",
                    "product_name": "Starter Plan Subscription",
                    "quantity": 1,
                    "unit_price": "19.00",
                    "tax_amount": "0.00",
                    "line_total": "19.00",
                }
            ],
            "taxes": [],
            "discounts": [],
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
    Backend client with explicit LIVE versus MOCK/DEMO modes.

    - 'live': Connects strictly to Express API (/api/v1).
              Never silently falls back to fixture data when Express returns
              404, 401, 403, 500 or is unavailable. Raises clear BackendIntegrationError.
    - 'mock' / 'demo': Uses verified local fixtures directly for deterministic evaluation.
    """

    def __init__(
        self,
        mode: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout_seconds: Optional[float] = None,
    ):
        settings = get_settings()
        self.mode = (mode or getattr(settings, "backend_mode", "mock")).lower()
        self.http_client = HttpBackendClient(base_url=base_url, timeout_seconds=timeout_seconds)
        self.mock_client = MockBackendClient()

    def get_available_plans(self) -> List[Dict[str, Any]]:
        if self.mode == "live":
            return self.http_client.get_available_plans()
        return self.mock_client.get_available_plans()

    def get_customer_subscriptions(
        self, customer_id: str, token: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        if self.mode == "live":
            return self.http_client.get_customer_subscriptions(customer_id=customer_id, token=token)
        return self.mock_client.get_customer_subscriptions(customer_id=customer_id, token=token)

    def get_customer_invoices(
        self, customer_id: str, token: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        if self.mode == "live":
            return self.http_client.get_customer_invoices(customer_id=customer_id, token=token)
        return self.mock_client.get_customer_invoices(customer_id=customer_id, token=token)

    def get_invoice_detail(
        self, invoice_id: str, customer_id: str, token: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        if self.mode == "live":
            return self.http_client.get_invoice_detail(
                invoice_id=invoice_id, customer_id=customer_id, token=token
            )
        return self.mock_client.get_invoice_detail(
            invoice_id=invoice_id, customer_id=customer_id, token=token
        )

    def get_customer_profile(
        self, customer_id: str, token: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        if self.mode == "live":
            return self.http_client.get_customer_profile(customer_id=customer_id, token=token)
        return self.mock_client.get_customer_profile(customer_id=customer_id, token=token)


# Backwards compatibility alias
BackendClient = HttpBackendClient
