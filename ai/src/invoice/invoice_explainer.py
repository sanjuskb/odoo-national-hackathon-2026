"""
AI Invoice Explanation and Intelligence Service.

Translates complex recurring billing invoices, taxes, line items, and discount
applications into plain-language customer summaries.
CRITICAL FINANCIAL SAFETY INVARIANT:
The AI service NEVER calculates, modifies, generates, or settles invoice figures.
All numbers are read-only reflections of authoritative, persisted backend records.
"""

from typing import Any, Dict, List, Optional

from ai.src.core.exceptions import (
    AuthenticationRequiredError,
    CrossCustomerAccessError,
    ProviderError,
    ValidationError,
)
from ai.src.integrations.backend_client import BaseBackendClient, MockBackendClient
from ai.src.invoice.models import (
    DiscountExplanation,
    InvoiceExplanationRequest,
    InvoiceExplanationResponse,
    InvoiceLineExplanation,
    TaxExplanation,
)
from ai.src.prompts.invoice_prompts import INVOICE_EXPLANATION_SYSTEM_PROMPT
from ai.src.providers.llm_base import BaseLLMProvider
from ai.src.providers.mock_gemini_provider import MockGeminiProvider
from ai.src.utils.logging import get_logger

logger = get_logger("ai.invoice.explainer")


class InvoiceExplanationService:
    """Service for grounded, read-only explanation of customer invoices."""

    def __init__(
        self,
        llm_provider: Optional[BaseLLMProvider] = None,
        backend_client: Optional[BaseBackendClient] = None,
    ):
        self.llm = llm_provider or MockGeminiProvider()
        self.backend = backend_client or MockBackendClient()

    def _format_lines(self, lines: List[Dict[str, Any]]) -> str:
        if not lines:
            return "No line items."
        formatted = []
        for line in lines:
            formatted.append(
                f"- {line.get('product_name')}: {line.get('quantity')}x @ ${line.get('unit_price')} "
                f"(Tax: ${line.get('tax_amount')}) = ${line.get('line_total')}"
            )
        return "\n".join(formatted)

    def _format_discounts(self, discounts: List[Dict[str, Any]]) -> str:
        if not discounts:
            return "No promotional discounts applied."
        formatted = []
        for disc in discounts:
            formatted.append(f"- Code {disc.get('code', 'PROMO')}: -${disc.get('amount')}")
        return "\n".join(formatted)

    def _format_taxes(self, taxes: List[Dict[str, Any]]) -> str:
        if not taxes:
            return "No taxes applied."
        formatted = []
        for tax in taxes:
            formatted.append(f"- {tax.get('name')} ({tax.get('rate_percentage')}%): ${tax.get('amount')}")
        return "\n".join(formatted)

    def _build_deterministic_narrative(
        self, invoice: Dict[str, Any]
    ) -> str:
        """Deterministic plain-language explanation used when LLM is offline or in mock mode."""
        lines_desc = ", ".join(f"{l.get('product_name')} (${l.get('line_total')})" for l in invoice.get("lines", []))
        status = invoice.get("status", "").upper()
        due_date = invoice.get("due_date", "N/A")
        total = invoice.get("total_amount", "0.00")
        paid = invoice.get("amount_paid", "0.00")
        outstanding = invoice.get("outstanding_balance", "0.00")

        tax_summary = ""
        taxes = invoice.get("taxes", [])
        if taxes:
            tax_names = [f"${t.get('amount')} for {t.get('name')}" for t in taxes]
            tax_summary = f" This includes {', '.join(tax_names)} in taxes."

        return (
            f"Invoice {invoice.get('invoice_number')} covers your subscription charges: {lines_desc}.{tax_summary} "
            f"The total amount billed is ${total} {invoice.get('currency', 'USD')}. "
            f"To date, ${paid} has been recorded as paid, leaving an outstanding balance of ${outstanding}. "
            f"The invoice status is currently {status}, with payment due on {due_date}."
        )

    def explain_invoice(
        self, request: InvoiceExplanationRequest
    ) -> InvoiceExplanationResponse:
        """
        Generate grounded explanation for a customer's persisted invoice.
        Enforces customer ownership: a customer cannot request explanation
        of another customer's invoice.
        """
        if not request.customer_id or not request.customer_id.strip():
            raise AuthenticationRequiredError("Customer ID required to access invoice explanations")

        # 1. Fetch invoice and verify customer ownership
        invoice = self.backend.get_invoice_detail(
            invoice_id=request.invoice_id,
            customer_id=request.customer_id,
            token=request.session_token,
        )

        if not invoice:
            raise ValidationError(f"Invoice {request.invoice_id} not found for this account")

        # 2. Extract structured lines for response envelope
        lines_expl = [
            InvoiceLineExplanation(
                product_name=line.get("product_name", "Subscription Item"),
                quantity=line.get("quantity", 1),
                unit_price=str(line.get("unit_price", "0.00")),
                tax_amount=str(line.get("tax_amount", "0.00")),
                line_total=str(line.get("line_total", "0.00")),
            )
            for line in invoice.get("lines", [])
        ]

        taxes_expl = [
            TaxExplanation(
                name=tax.get("name", "Tax"),
                rate_percentage=str(tax.get("rate_percentage", "0.00")),
                amount=str(tax.get("amount", "0.00")),
            )
            for tax in invoice.get("taxes", [])
        ]

        discounts_expl = [
            DiscountExplanation(
                code=disc.get("code"),
                description=disc.get("description"),
                amount=str(disc.get("amount", "0.00")),
            )
            for disc in invoice.get("discounts", [])
        ]

        # 3. Format grounded system prompt
        system_prompt = INVOICE_EXPLANATION_SYSTEM_PROMPT.format(
            invoice_number=invoice.get("invoice_number", invoice.get("id")),
            status=invoice.get("status"),
            issue_date=invoice.get("issue_date", "N/A"),
            due_date=invoice.get("due_date", "N/A"),
            currency=invoice.get("currency", "USD"),
            line_items_formatted=self._format_lines(invoice.get("lines", [])),
            discounts_formatted=self._format_discounts(invoice.get("discounts", [])),
            taxes_formatted=self._format_taxes(invoice.get("taxes", [])),
            subtotal=invoice.get("subtotal", "0.00"),
            total_discount=invoice.get("total_discount", "0.00"),
            total_tax=invoice.get("total_tax", "0.00"),
            total_amount=invoice.get("total_amount", "0.00"),
            amount_paid=invoice.get("amount_paid", "0.00"),
            outstanding_balance=invoice.get("outstanding_balance", "0.00"),
        )

        user_prompt = "Please explain the charges, taxes, discounts, and payment status for this invoice in clear, simple language."

        # 4. Generate narrative with deterministic fallback
        is_simulated = False
        try:
            llm_res = self.llm.generate(prompt=user_prompt, system_prompt=system_prompt)
            explanation_narrative = llm_res.content
            is_simulated = llm_res.is_simulated
        except ProviderError as exc:
            logger.warning("LLM provider failed for invoice explanation (%s); falling back to deterministic explanation", str(exc))
            explanation_narrative = self._build_deterministic_narrative(invoice)
            is_simulated = True

        return InvoiceExplanationResponse(
            invoice_id=request.invoice_id,
            invoice_number=invoice.get("invoice_number", request.invoice_id),
            status=invoice.get("status", "unknown"),
            due_date=invoice.get("due_date", "N/A"),
            currency=invoice.get("currency", "USD"),
            subtotal=str(invoice.get("subtotal", "0.00")),
            total_tax=str(invoice.get("total_tax", "0.00")),
            total_discount=str(invoice.get("total_discount", "0.00")),
            total_amount=str(invoice.get("total_amount", "0.00")),
            amount_paid=str(invoice.get("amount_paid", "0.00")),
            outstanding_balance=str(invoice.get("outstanding_balance", "0.00")),
            lines=lines_expl,
            taxes=taxes_expl,
            discounts=discounts_expl,
            explanation_narrative=explanation_narrative,
            is_simulated=is_simulated,
        )

