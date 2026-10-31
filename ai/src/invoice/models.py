"""
Data Models for AI Invoice Explanation Service.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class InvoiceLineExplanation(BaseModel):
    product_name: str
    quantity: int
    unit_price: str
    tax_amount: str
    line_total: str


class TaxExplanation(BaseModel):
    name: str
    rate_percentage: str
    amount: str


class DiscountExplanation(BaseModel):
    code: Optional[str] = None
    description: Optional[str] = None
    amount: str


class InvoiceExplanationRequest(BaseModel):
    """Request to generate plain-language explanation of a persisted invoice."""
    invoice_id: str = Field(..., description="Target invoice UUID")
    customer_id: str = Field(..., description="Verified customer UUID from authenticated session")
    session_token: Optional[str] = Field(default=None, description="Backend auth token")


class InvoiceExplanationResponse(BaseModel):
    """Grounded plain-language invoice explanation with verified financial snapshot."""
    invoice_id: str
    invoice_number: str
    status: str
    due_date: str
    currency: str
    subtotal: str
    total_tax: str
    total_discount: str
    total_amount: str
    amount_paid: str
    outstanding_balance: str
    lines: List[InvoiceLineExplanation]
    taxes: List[TaxExplanation]
    discounts: List[DiscountExplanation]
    explanation_narrative: str = Field(
        ..., description="Polite, plain-language breakdown explaining every line and charge"
    )
    is_simulated: bool = False
    disclaimer: str = Field(
        default="Financial calculations are authoritative in the backend database. This explanation is provided for customer convenience.",
        description="Non-authoritative disclaimer"
    )
    metadata: Dict[str, Any] = Field(default_factory=dict)

