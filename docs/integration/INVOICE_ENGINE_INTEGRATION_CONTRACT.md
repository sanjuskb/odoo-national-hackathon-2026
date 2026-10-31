# Deterministic Invoice Generation Engine — Integration Contract & Technical Specification

> **Document Status:** Implemented and tested. Unit test suite: 39/39 passing.  
> **Primary Service Owner:** Sanju (`@sanjuskb`) — Team Lead, Deterministic Billing Engine Lead  
> **Supporting Collaborators:** Amarnath (`@amarnathgaddam75`, Express API Integration), Harsha (`@harsha-1706`, Database Schema & Persistence), Ravi (`@donnyravi-alt`, Frontend Client)  
> **Date:** 31 October 2026  
> **Module Path:** `backend/src/billing/`  

---

## 1. Engine Purpose & Core Invariants

The **Brightloop Invoice Generation Engine** is a deterministic, high-performance financial calculation service written in native Node.js. It executes the recurring billing logic for Brightloop subscriptions across four standard frequencies (`daily`, `weekly`, `monthly`, `yearly`).

### Inviolable Invariants:
1. **Zero Floating-Point Drift:** All internal monetary math executes in integer minor units (cents) with half-up rounding (`Math.round`), returning exact two-decimal string representations (`"49.00"`, `"53.90"`). Never IEEE-754 floats.
2. **Stable Billing Identity:** Each invoice run has a canonical idempotency key:
   $$\text{Idempotency Key} = \texttt{subscription\_id} : \texttt{billing\_period\_start}$$
3. **Database Uniqueness Guard:** Uniqueness is enforced at the database level by Harsha via `UNIQUE(subscription_id, billing_period_start)`. The application engine exposes this key for duplicate check handling.
4. **Non-Negative Guard:** Net line totals and invoice grand totals are strictly non-negative. Discounts are capped at the eligible base amount.
5. **Calendar & Leap-Year Correctness:** Billing period math operates strictly on UTC calendar dates, accurately clamping to month ends (e.g. Jan 31 -> Feb 28) and preserving the anchor day (e.g. Feb 28 -> Mar 31) across leap and non-leap years.

---

## 2. Calculation & Rounding Specifications

### 2.1 Formula Hierarchy
1. **Line Subtotal:**
   $$\text{line\_subtotal\_cents} = \text{quantity} \times \text{unit\_price\_cents}$$
2. **Discount Evaluation:**
   - **Fixed Discount:** $\text{discount\_cents} = \min(\text{fixed\_cents}, \text{eligible\_base\_cents})$
   - **Percentage Discount:** $\text{discount\_cents} = \left\lfloor \frac{\text{base\_cents} \times \text{rate\_bps} + 5000}{10000} \right\rfloor$ where $\text{rate\_bps} = \text{round}(\text{rate} \times 100)$
   - **Proportional Allocation:** When subscription-scoped discounts are present, they are distributed across line items proportional to line subtotals with remainder absorption on the final line to ensure zero penny rounding drift.
3. **Line Tax (Tax-Exclusive):**
   $$\text{tax\_cents} = \left\lfloor \frac{(\text{line\_subtotal\_cents} - \text{line\_discount\_cents}) \times \text{tax\_rate\_bps} + 5000}{10000} \right\rfloor$$
4. **Grand Totals:**
   $$\text{total\_subtotal} = \sum \text{line\_subtotal}$$
   $$\text{total\_discount} = \sum \text{line\_discount}$$
   $$\text{total\_tax} = \sum \text{line\_tax}$$
   $$\text{total\_amount} = \max(0, \text{total\_subtotal} - \text{total\_discount} + \text{total\_tax})$$
   $$\text{outstanding\_balance} = \text{total\_amount} - \text{amount\_paid}$$

---

## 3. Input & Output Contract

### 3.1 Function Signature
```javascript
const { generateInvoice } = require('./billing');

const invoice = generateInvoice({
  subscription,          // Required: Subscription entity object
  billingPeriodStart,    // Optional: ISO date string (defaults to next_billing_date)
  billingFrequency,      // Optional: 'daily' | 'weekly' | 'monthly' | 'yearly'
  issueDate,             // Optional: ISO date string (defaults to billingPeriodStart)
  paymentTermsDays,      // Optional: integer days (default: 15)
  availableDiscounts,    // Optional: array of discount rules
  taxRules,              // Optional: array of tax rules
  currency,              // Optional: 'USD' (default)
  existingInvoiceKeys,   // Optional: Set or Array of existing idempotency keys
});
```

### 3.2 Required Subscription Object Shape
```json
{
  "id": "sub-101",
  "customer_id": "cust-101",
  "status": "active",
  "billing_frequency": "monthly",
  "start_date": "2026-01-31",
  "next_billing_date": "2026-02-28",
  "anchor_day": 31,
  "lines": [
    {
      "product_id": "prod-1",
      "product_name": "Professional Subscription",
      "quantity": 1,
      "unit_price": "49.00"
    }
  ]
}
```

### 3.3 Output Invoice Structure
```json
{
  "idempotency_key": "sub-101:2026-02-28",
  "is_duplicate": false,
  "subscription_id": "sub-101",
  "customer_id": "cust-101",
  "status": "draft",
  "currency": "USD",
  "billing_frequency": "monthly",
  "billing_period_start": "2026-02-28",
  "billing_period_end": "2026-03-30",
  "next_billing_date": "2026-03-31",
  "issue_date": "2026-02-28",
  "due_date": "2026-03-15",
  "subtotal": "49.00",
  "total_discount": "0.00",
  "total_tax": "4.90",
  "total_amount": "53.90",
  "amount_paid": "0.00",
  "outstanding_balance": "53.90",
  "lines": [
    {
      "product_id": "prod-1",
      "product_name": "Professional Subscription",
      "variant_id": null,
      "quantity": 1,
      "unit_price": "49.00",
      "subtotal": "49.00",
      "discount_amount": "0.00",
      "taxable_amount": "49.00",
      "tax_amount": "4.90",
      "line_total": "53.90",
      "taxes": [
        {
          "name": "Standard GST",
          "rate_percentage": "10.00",
          "amount": "4.90"
        }
      ],
      "discounts": []
    }
  ],
  "taxes": [
    {
      "name": "Standard GST",
      "rate_percentage": "10.00",
      "amount": "4.90"
    }
  ],
  "discounts": [],
  "metadata": {
    "generated_by": "SanjuDeterministicBillingEngine",
    "version": "1.0.0",
    "anchor_day": 31,
    "payment_terms_days": 15
  }
}
```

---

## 4. Error Categories & Codes

| Error Class | Code | Cause |
|---|---|---|
| `InvoiceValidationError` | `MISSING_SUBSCRIPTION` | Input payload missing subscription object |
| `InvoiceValidationError` | `INVALID_SUBSCRIPTION_ID` | Blank or non-string subscription ID |
| `InvoiceValidationError` | `SUBSCRIPTION_NOT_ACTIVE` | Attempt to invoice `draft`, `paused`, or `closed` subscription |
| `InvoiceValidationError` | `INVALID_BILLING_FREQUENCY` | Frequency not in `{ 'daily', 'weekly', 'monthly', 'yearly' }` |
| `InvoiceValidationError` | `EMPTY_LINE_ITEMS` | Subscription lines array is empty |
| `InvoiceValidationError` | `INVALID_QUANTITY` | Line item quantity is < 1 or non-integer |
| `FinancialCalculationError` | `INVALID_MONEY_FORMAT` | Price or amount contains non-numeric characters or negative sign |
| `FinancialCalculationError` | `NEGATIVE_AMOUNT_REJECTED` | Calculation resulted in illegal negative currency amount |
| `BillingPeriodError` | `INVALID_DATE_FORMAT` | Date string does not match `YYYY-MM-DD` |
| `BillingPeriodError` | `INVALID_DAY` | Calendar day does not exist (e.g. Feb 30 or Feb 29 in non-leap year) |
| `DiscountRuleError` | `INVALID_PERCENTAGE_VALUE` | Percentage discount value is < 0 or > 100 |

---

## 5. Integration Blueprint for Amarnath (Express Backend)

In `backend/src/routes/billing.js` (or controller handling `POST /api/v1/billing/run`):

```javascript
const { generateInvoice } = require('../billing');

// Endpoint handler: POST /api/v1/billing/run
async function runDueBilling(req, res) {
  const { subscription_ids } = req.body;
  
  // 1. Fetch due subscriptions from Supabase
  const dueSubscriptions = await fetchDueSubscriptions(subscription_ids);
  const activeDiscounts = await fetchActiveDiscounts();
  const activeTaxes = await fetchActiveTaxRules();
  
  const createdInvoices = [];
  const skippedDuplicates = [];
  const errors = [];

  for (const sub of dueSubscriptions) {
    try {
      // 2. Generate deterministic invoice object
      const invoiceDoc = generateInvoice({
        subscription: sub,
        billingPeriodStart: sub.next_billing_date,
        availableDiscounts: activeDiscounts,
        taxRules: activeTaxes,
      });

      // 3. Atomically persist via Harsha's database RPC / transaction
      const persisted = await persistInvoiceWithLines(invoiceDoc);
      createdInvoices.push(persisted);
    } catch (err) {
      if (err.code === '23505') { // Postgres unique_violation error code
        skippedDuplicates.push({ subscription_id: sub.id, reason: 'Duplicate billing period ignored' });
      } else {
        errors.push({ subscription_id: sub.id, error: err.message });
      }
    }
  }

  return res.json({
    success: true,
    data: {
      invoices_created: createdInvoices.length,
      skipped_duplicates: skippedDuplicates.length,
      errors: errors.length > 0 ? errors : null,
    },
    message: `Billing run processed ${dueSubscriptions.length} subscriptions.`
  });
}
```

---

## 6. Database Requirements for Harsha (Supabase Database)

To guarantee idempotency and prevent double-billing across concurrent requests:

```sql
-- 1. Invoices Table Uniqueness Guard (CRITICAL)
ALTER TABLE public.invoices
  ADD CONSTRAINT uq_invoices_subscription_period
  UNIQUE (subscription_id, billing_period_start);

-- 2. Precision Columns (CRITICAL)
-- Ensure all monetary values use NUMERIC(12, 2)
ALTER TABLE public.invoices 
  ALTER COLUMN subtotal TYPE NUMERIC(12, 2),
  ALTER COLUMN total_tax TYPE NUMERIC(12, 2),
  ALTER COLUMN total_discount TYPE NUMERIC(12, 2),
  ALTER COLUMN total_amount TYPE NUMERIC(12, 2),
  ALTER COLUMN amount_paid TYPE NUMERIC(12, 2),
  ALTER COLUMN outstanding_balance TYPE NUMERIC(12, 2);

ALTER TABLE public.invoice_lines
  ALTER COLUMN unit_price TYPE NUMERIC(12, 2),
  ALTER COLUMN subtotal TYPE NUMERIC(12, 2),
  ALTER COLUMN discount_amount TYPE NUMERIC(12, 2),
  ALTER COLUMN taxable_amount TYPE NUMERIC(12, 2),
  ALTER COLUMN tax_amount TYPE NUMERIC(12, 2),
  ALTER COLUMN line_total TYPE NUMERIC(12, 2);

-- 3. Composite Index for Billing Run Queries
CREATE INDEX idx_subscriptions_due_run 
  ON public.subscriptions (status, next_billing_date)
  WHERE status = 'active';
```

---

## 7. Open Decisions Awaiting Team Alignment

| Decision | Current Engine Behavior | Open Decision Point |
|---|---|---|
| **Payment Terms (Due Date)** | Defaults to Net-15 (`startDate + 15 days`) | Should payment terms be defined on the Plan entity (e.g. Net-0, Net-15, Net-30)? |
| **Tax Inclusive vs Exclusive** | Tax-Exclusive (tax added on top of price) | Is tax-inclusive pricing needed for consumer tiers? |
| **Currency Support** | Defaults to `USD` | Will multi-currency conversion be required or single currency? |
| **Proration** | Full-period billing upon activation | How should mid-cycle upgrades be prorated? |

