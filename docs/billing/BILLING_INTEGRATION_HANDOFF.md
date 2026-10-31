# Brightloop Software — Billing API Handoff & Architecture Specification

**Project:** Brightloop Subscription Management System (ODDO National Hackathon 2026)  
**Lead / Author:** Sanju (`@sanjuskb`) — AI Foundation & Deterministic Billing Engine Lead  
**Target Recipient:** Ravi (`@donnyravi-alt`) — Frontend & System Architecture Lead  
**Collaborators:** Amarnath (`@amarnathgaddam75`, Backend API), Harsha (`@harsha-1706`, Database & Supabase)  
**Repository:** `sanjuskb/odoo-national-hackathon-2026`  
**Branch:** `feature/sanju-integration`  
**Status:** Approved & Verified Specification  

---

## 1. Executive Summary for Frontend Integration

This specification provides the verified contract for the Brightloop Billing Engine and its integration with the frontend application.

- **Canonical Production Engine:** [`billing/src/calculator.cjs`](../../billing/src/calculator.cjs) + [`billing/src/runner.cjs`](../../billing/src/runner.cjs).
- **Express Batch Billing Route:** `POST /api/v1/billing/run` (Admin only).
- **Idempotency Identity:** Composite key `${subscription_id}:${billing_period_start}`.
- **Database Persistence & Atomicity:** Implemented via PostgreSQL stored procedure `public.persist_due_billing_invoice` with hard table constraint `UNIQUE(subscription_id, billing_period_start)` on `public.invoices`.
- **Individual Invoice Retrieval & Payments:** Authored on `origin/feature/amarnath-products-plans` (`/api/v1/invoices`, `/api/v1/invoices/:id`, `/api/v1/invoices/:id/payments`, `/api/v1/portal/invoices`), pending merge into `develop`.

---

## 2. Canonical vs. Line-Item Billing Engines

| Engine | Location | Role & Status |
| :--- | :--- | :--- |
| **Canonical Batch Runner & Calculator** | `billing/src/calculator.cjs`<br>`billing/src/recurrence.cjs`<br>`billing/src/runner.cjs` | **CANONICAL PRODUCTION ENGINE.**<br>• Wired to Express endpoint `POST /api/v1/billing/run`.<br>• Wired to atomic Supabase RPC `persist_due_billing_invoice`.<br>• Enforces explicit finance policies (`taxMode`, `discountStacking`, `rounding`).<br>• 16/16 unit tests passing (`billing/tests/`). |
| **Fine-Grained Line-Item Engine** | `backend/src/billing/invoice-engine.js`<br>`backend/src/billing/billing-period.js`<br>`backend/src/billing/discounts.js`<br>`backend/src/billing/taxes.js` | **DETAILED LINE-ITEM REFERENCE ENGINE.**<br>• Generates full document tree with line-by-line tax/discount allocations.<br>• 39/39 unit tests passing (`backend/tests/billing/`).<br>• Pure in-memory calculation; reference for UI line item rendering. |
| **Quotation Preview Engine** | `backend/src/services/invoiceCalculator.service.js` *(on `amarnath-products-plans`)* | **PREVIEW-ONLY ENGINE.**<br>• Used by `GET /api/v1/billing/preview` for staff quotation previews.<br>• Pending merge into `develop`. |

---

## 3. Exact Exported Functions and Source Files

### A. Canonical Batch Calculation Function
- **Source File:** [`billing/src/calculator.cjs`](../../billing/src/calculator.cjs)
- **Export:**
  ```javascript
  const { calculateInvoice } = require('../../../billing/src/calculator.cjs');
  ```
- **Signature:**
  ```javascript
  function calculateInvoice({
    subscriptionId,
    customerId,
    periodStart,
    currency,
    lines,
    discounts = [],
    policy
  })
  ```

### B. Canonical Batch Runner Function
- **Source File:** [`billing/src/runner.cjs`](../../billing/src/runner.cjs)
- **Export:**
  ```javascript
  const { runDueBilling } = require('../../../billing/src/runner.cjs');
  ```
- **Signature:**
  ```javascript
  async function runDueBilling({
    repository,
    asOf,
    policy,
    batchSize = 100,
    maxPeriodsPerSubscription = 24
  })
  ```

### C. Detailed Line-Item Generator Function
- **Source File:** [`backend/src/billing/invoice-engine.js`](../../backend/src/billing/invoice-engine.js)
- **Export:**
  ```javascript
  const { generateInvoice } = require('../../backend/src/billing');
  ```
- **Signature:**
  ```javascript
  function generateInvoice({
    subscription,
    billingPeriodStart = null,
    billingFrequency = null,
    issueDate = null,
    paymentTermsDays = 15,
    availableDiscounts = [],
    taxRules = [],
    currency = 'USD',
    existingInvoiceKeys = null
  })
  ```

---

## 4. Exact Input & Output Schemas

### Input Schema (`calculateInvoice`)
```typescript
interface CalculateInvoiceInput {
  subscriptionId: string;           // UUID of subscription
  customerId: string;               // UUID of customer
  periodStart: string;              // "YYYY-MM-DD"
  currency: string;                 // "USD" (exact 3 uppercase letters)
  policy: {
    taxMode: 'inclusive' | 'exclusive';
    discountStacking: 'best' | 'all';
    rounding: 'half-up';
  };
  lines: Array<{
    productId: string;              // UUID
    title: string;                  // Immutable product description snapshot
    quantity: number;               // Positive safe integer (> 0)
    unitPrice: string;              // Exact decimal string, max 2 decimals (e.g. "49.00")
    variantAdjustment?: string;     // Variant delta, default "0.00"
    taxPercent: string;             // Explicit tax rate (e.g. "10.00")
  }>;
  discounts?: Array<{
    id: string;                     // UUID
    kind: 'fixed' | 'percentage';
    value: string;                  // Fixed minor unit amount or percentage 0..100
    scope: 'subscription' | 'product';
    productIds?: string[];          // Required if scope === 'product'
    minAmount?: string;             // Optional minimum spend threshold
    minQuantity?: number;           // Optional minimum item quantity threshold
    validFrom?: string;             // "YYYY-MM-DD"
    validUntil?: string;            // "YYYY-MM-DD"
    maxUses?: number;               // Usage limit
    usedCount?: number;             // Current redemptions
  }>;
}
```

### Output Schema (`calculateInvoice`)
```typescript
interface CalculateInvoiceOutput {
  subscriptionId: string;
  customerId: string;
  billingPeriodStart: string;       // "YYYY-MM-DD"
  currency: string;
  taxMode: 'inclusive' | 'exclusive';
  subtotal: string;                 // Exact two-decimal string ("49.00")
  discountTotal: string;            // Exact two-decimal string ("0.00")
  taxTotal: string;                 // Exact two-decimal string ("4.90")
  total: string;                    // Exact two-decimal string ("53.90")
  appliedDiscounts: Array<{
    id: string;                     // UUID of redeemed discount rule
    amount: string;                 // Exact discount amount deducted ("0.00")
  }>;
  invoiceLines: Array<{
    productId: string;
    title: string;
    quantity: number;
    unitPrice: string;
    variantAdjustment: string;
    taxPercent: string;
    baseAmount: string;             // (unitPrice + variantAdjustment) * quantity
    discountAmount: string;
    taxAmount: string;
    lineTotal: string;              // baseAmount - discountAmount + taxAmount
  }>;
}
```

---

## 5. Express API Contract (`POST /api/v1/billing/run`)

### Endpoint Details
- **Method:** `POST`
- **Route:** `/api/v1/billing/run`
- **Authentication:** `Authorization: Bearer <Supabase_JWT>`
- **Authorization:** `admin` role required (`requireRole('admin')`). Non-admins receive `HTTP 403 Forbidden`.
- **Request Headers:**
  ```http
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  Content-Type: application/json
  ```
- **Request Body (JSON):**
  ```json
  {
    "target_date": "2026-10-31" // Optional: defaults to current server UTC date (YYYY-MM-DD)
  }
  ```

### Response Scenarios
- **HTTP 200 OK (Batch Processed Successfully):**
  ```json
  {
    "success": true,
    "data": {
      "inspected": 3,
      "created": 2,
      "alreadyExists": 1,
      "failed": [],
      "backlog": []
    },
    "message": "Billing batch processed",
    "errors": null
  }
  ```
- **HTTP 207 Multi-Status (Partial Failures / Retriable):**
  ```json
  {
    "success": false,
    "data": {
      "inspected": 3,
      "created": 1,
      "alreadyExists": 0,
      "failed": [
        {
          "subscriptionId": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
          "reason": "Discount usage cap exhausted"
        }
      ],
      "backlog": []
    },
    "message": "Some billing periods failed; retry safely",
    "errors": null
  }
  ```
- **HTTP 503 Service Unavailable (Policy Unapproved):**
  ```json
  {
    "success": false,
    "data": null,
    "message": "Billing policy has not been approved/configured",
    "errors": null
  }
  ```

---

## 6. Billing Recurrence & Anchor Rules

Defined in [`billing/src/recurrence.cjs`](../../billing/src/recurrence.cjs):
- **Daily:** `next = current + 1 day` (UTC).
- **Weekly:** `next = current + 7 days` (UTC).
- **Monthly (Anchor Preservation):**
  $$\text{month} = \text{current.month} + 1$$
  $$\text{day} = \min(\text{anchor.day}, \text{daysInMonth}(\text{year}, \text{month}))$$
  *Example:* Subscriptions starting on Jan 31 bill on Feb 28, then automatically restore to Mar 31.
- **Yearly:** `next.year = current.year + 1`, maintaining anniversary month and day. Accounts for leap years (Feb 29 $\to$ Feb 28 on non-leap years).
- **Due Date:** `billing_period_start + BILLING_DUE_DAYS (15 days)`.

---

## 7. Database Persistence & SQL Constraints

### A. Atomic RPC Function
- **Name:** `public.persist_due_billing_invoice`
- **File:** `database/migrations/20261031_002_atomic_billing_rpc.sql`
- **Security:** `SECURITY DEFINER`, granted strictly to `service_role`.
- **Atomicity:** Locks subscription row `FOR UPDATE`, validates matching cursor date, inserts `public.invoices`, inserts `public.invoice_lines`, consumes discount caps in deterministic UUID order, advances `subscriptions.next_billing_date = p_next_date`, and returns `('created', invoice_id)` or `('already-exists', invoice_id)`.

### B. Hard Database Uniqueness
- **File:** `database/migrations/20261031_001_brightloop_core.sql`
- **Constraint:**
  ```sql
  create table public.invoices (
    ...
    unique(subscription_id, billing_period_start)
  );
  ```

---

## 8. Available Invoice Retrieval & Payment Endpoints (Amarnath Branch)

The following endpoints are authored on `origin/feature/amarnath-products-plans` awaiting PR merge to `develop`:

| Route | Method | Roles | Purpose |
| :--- | :--- | :--- | :--- |
| `/api/v1/invoices` | `GET` | Admin, Staff, Customer | List invoices with pagination, status, and date filters. Customers only see their own. |
| `/api/v1/invoices/:id` | `GET` | Admin, Staff, Customer | Full invoice detail including line items, taxes, discounts, and payments. |
| `/api/v1/invoices/:id/confirm` | `POST` | Admin, Staff | Manually confirm draft invoice. |
| `/api/v1/invoices/:id/cancel` | `POST` | Admin, Staff | Cancel draft or un-paid invoice. |
| `/api/v1/invoices/:id/send` | `POST` | Admin, Staff | Dispatch invoice email. |
| `/api/v1/invoices/:id/print` | `GET` | Admin, Staff, Customer | Render printable invoice (supports `?format=html`). |
| `/api/v1/invoices/:id/payments` | `POST` | Admin, Staff | Record payment against invoice. Clears balance and marks `paid`. |
| `/api/v1/invoices/:id/payments` | `GET` | Admin, Staff, Customer | View payment history for an invoice. |
| `/api/v1/portal/invoices` | `GET` | Customer | Customer self-service portal list. |

---

## 9. Test Verification Matrix

| Capability | Test File | Result |
| :--- | :--- | :--- |
| **Canonical Arithmetic & Rounding** | `billing/tests/calculator.test.cjs` | **11 / 11 passed** |
| **Batch Runner & Catch-up** | `billing/tests/runner.test.cjs` | **5 / 5 passed** |
| **Line-Item Engine & Idempotency** | `backend/tests/billing/*.test.js` | **39 / 39 passed** |
| **Express Route Auth & Policy Gate**| `backend/tests/billing-route.test.js` | **2 / 2 passed** |
| **AI Grounded Explanations** | `ai/tests/test_invoice_explainer.py` | **4 / 4 passed** |
| **Full AI Module Integration** | `ai/tests/` | **59 / 59 passed** |
| **Secret Scan (Tracked Files)** | `scripts/check-secrets.cjs` | **223 / 223 clean** |

---

## 10. Frontend Implementation Guide for Ravi

### A. Admin Batch Billing Action
- Place a button on the Admin Finance view: **"Run Due Billing"**.
- Triggers `POST /api/v1/billing/run` with `{ "target_date": selectedDate }`.
- Display summary alert: `${created} invoices created, ${alreadyExists} existing periods skipped`.

### B. Invoices Table & Detail Drawer
- Fetch list via `GET /api/v1/invoices?page=1&limit=20`.
- Display columns: Number, Subscription, Customer, Period Start, Total Amount, Balance Due, Status Badge (`draft`, `confirmed`, `paid`, `cancelled`).
- Detail view should present line items using exact string amounts from backend (`unit_price`, `quantity`, `tax_amount`, `line_total`).

### C. Manual Payment Entry Modal
- On invoice row action: **"Register Payment"**.
- Form inputs: Amount (default to `outstanding_balance`), Method (`cash`, `bank_transfer`, `manual_card`), Date, Note.
- Dispatches `POST /api/v1/invoices/:id/payments`.
- Refresh invoice state to update status to `paid`.

---

## 11. Remaining Work Required from Teammates

1. **Harsha (`@harsha-1706`):**
   - Create PR from `feature/harsha-supabase-setup` to `develop`.
   - Apply migrations `20261031_001_brightloop_core.sql` and `20261031_002_atomic_billing_rpc.sql` to live Supabase project.
2. **Amarnath (`@amarnathgaddam75`):**
   - Create PR from `feature/amarnath-products-plans` to `develop`.
   - Mount `product.routes.js`, `plan.routes.js`, `subscription.routes.js`, `invoice.routes.js`, and `payment.routes.js` in `backend/src/app.js`.
3. **DevOps / Environment:**
   - Configure required server variables in `.env`:
     ```properties
     BILLING_TAX_MODE=exclusive
     BILLING_DISCOUNT_STACKING=best
     BILLING_ROUNDING=half-up
     BILLING_DUE_DAYS=15
     ```

