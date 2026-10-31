# API Contract Proposal — Brightloop Subscription Management System

> **Status:** PROPOSED — awaiting approval from Sanju (billing service/team lead), Ravi (architecture/frontend) and Harsha (database).
> **Owner:** Amarnadh (backend)
> **Date:** 2026-10-31
> **Source:** [Official Problem Statement](../docs/official/problem-statement.md), [Requirements](../docs/requirements/requirements.md), [Proposed API Contracts](../docs/integration/api-contracts.md)

---

## Conventions

### Base path
All endpoints are prefixed with `/api/v1`.

### Response envelope
Every response uses:
```json
{
  "success": true | false,
  "data": <object | array | null>,
  "message": "<human-readable string>",
  "errors": <array | null>
}
```

### Error format
```json
{
  "success": false,
  "data": null,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "issue": "must be a valid email address" }
  ]
}
```

### Authentication
`Authorization: Bearer <access_token>` header. Tokens issued by Supabase Auth. Role and ownership verified server-side.

### Pagination
List endpoints accept `page` (default 1) and `page_size` (default 20, max 100) query parameters. Response includes:
```json
{
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total_items": 1234,
      "total_pages": 62
    }
  }
}
```

### Date format
ISO 8601: `"2026-10-31T10:00:00.000Z"`.

### Money format
Decimal strings with exactly two places: `"99.00"`, `"560.00"`. Never floating-point numbers.

### Subscription status enum
`draft` → `quotation` → `confirmed` → `active` → `closed`

### Invoice status enum
`draft` → `confirmed` → `paid` (plus `cancelled` if team approves — open decision)

### HTTP error codes used
| Code | Meaning |
|------|---------|
| 400 | Bad request / malformed input |
| 401 | Missing or invalid token |
| 403 | Insufficient role or ownership |
| 404 | Resource not found |
| 409 | Conflict (duplicate email, duplicate billing, etc.) |
| 422 | Validation failure (Zod schema) |
| 500 | Internal server error |

---

## Endpoint Table

### AUTH (FR-001, FR-002, FR-003, SEC-001, SEC-002, SEC-003)

| Req ID | Method | Path | Allowed Roles | Request Body | Success Response (data) | Validation Rules | Error Codes | DB Dependency | Status |
|--------|--------|------|---------------|-------------|------------------------|------------------|-------------|---------------|--------|
| FR-001, SEC-001 | POST | /auth/register | Public | `{ email, password, full_name }` | `{ user: { id, email, full_name, role: "customer" } }` | email: valid format, unique; password: >8 chars (min 9), upper+lower+special; full_name non-empty | 400 validation, 409 duplicate email | Supabase Auth + roleStore | Implemented |
| FR-001 | POST | /auth/login | Public | `{ email, password }` | `{ access_token, refresh_token, expires_at, user: { id, email, role } }` | email+password required | 400 validation, 401 invalid credentials | Supabase Auth + roleStore | Implemented |
| FR-003 | POST | /auth/forgot-password | Public | `{ email }` | `null` | valid email format; enumeration-safe (identical response whether email exists or not) | 400 validation | Supabase Auth | Implemented |
| SEC-002 | GET | /auth/me | Any authenticated | — | `{ id, email, role, user: { id, email, role } }` | Valid Bearer token | 401 unauthenticated | Supabase Auth + roleStore | Implemented |
| SEC-003 | POST | /staff (alias /admin/staff) | Admin | `{ email, password, full_name }` | `{ user: { id, email, full_name, role: "staff" } }` | Same password rules as register; caller verified admin | 400 validation, 401 unauthenticated, 403 forbidden, 409 duplicate | Supabase Auth + roleStore | Implemented |

#### Implemented Auth Request & Response Examples

##### 1. POST /api/v1/auth/register
- **Request Body:**
```json
{
  "email": "customer@example.com",
  "password": "CustomerPassword123!",
  "full_name": "Bright Customer"
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "11111111-2222-3333-4444-555555555555",
      "email": "customer@example.com",
      "full_name": "Bright Customer",
      "role": "customer"
    }
  },
  "message": "User registered successfully",
  "errors": null
}
```

##### 2. POST /api/v1/auth/login
- **Request Body:**
```json
{
  "email": "customer@example.com",
  "password": "CustomerPassword123!"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOi...",
    "refresh_token": "refresh-token-...",
    "expires_at": 1730370000,
    "user": {
      "id": "11111111-2222-3333-4444-555555555555",
      "email": "customer@example.com",
      "role": "customer"
    }
  },
  "message": "Login successful",
  "errors": null
}
```

##### 3. POST /api/v1/auth/forgot-password
- **Request Body:**
```json
{
  "email": "customer@example.com"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "data": null,
  "message": "If your email is registered, you will receive a password reset link.",
  "errors": null
}
```

##### 4. GET /api/v1/auth/me
- **Headers:** `Authorization: Bearer <access_token>`
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "11111111-2222-3333-4444-555555555555",
    "email": "customer@example.com",
    "role": "customer",
    "user": {
      "id": "11111111-2222-3333-4444-555555555555",
      "email": "customer@example.com",
      "role": "customer"
    }
  },
  "message": "Current user profile",
  "errors": null
}
```

##### 5. POST /api/v1/staff (or POST /api/v1/admin/staff)
- **Headers:** `Authorization: Bearer <admin_access_token>`
- **Request Body:**
```json
{
  "email": "staff@brightloop.local",
  "password": "StaffPassword123!",
  "full_name": "Internal Staff"
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "22222222-3333-4444-5555-666666666666",
      "email": "staff@brightloop.local",
      "full_name": "Internal Staff",
      "role": "staff"
    }
  },
  "message": "Staff user created successfully",
  "errors": null
}
```

### PRODUCTS (FR-004, FR-005)

| Req ID | Method | Path | Allowed Roles | Request Body | Success Response (data) | Validation Rules | Error Codes | DB Dependency | Status |
|--------|--------|------|---------------|-------------|------------------------|------------------|-------------|---------------|--------|
| FR-004 | GET | /products | Any authenticated | — (query: page, page_size, search, type) | `{ items: [Product], pagination }` | page >= 1, page_size <= 100; cost_price stripped for customer | 401 | products | Implemented |
| FR-004 | POST | /products | Admin | `{ name, type, sales_price, cost_price, notes }` | `{ product: Product }` | name required; prices non-negative decimal strings | 400, 401, 403 | products | Implemented |
| FR-004 | GET | /products/:id | Any authenticated | — | `{ product: Product, variants: [Variant] }` | Valid ID; cost_price stripped for customer | 401, 404 | products, product_variants | Implemented |
| FR-004 | PATCH | /products/:id | Admin | `{ name?, type?, sales_price?, cost_price?, notes? }` | `{ product: Product }` | At least one field; non-negative money | 400, 401, 403, 404 | products | Implemented |
| FR-005 | POST | /products/:id/variants | Admin | `{ name, price_adjustment }` | `{ variant: Variant }` | name required; price_adjustment non-negative money | 400, 401, 403, 404 | product_variants | Implemented |
| FR-005 | PATCH | /products/:id/variants/:variantId | Admin | `{ name?, price_adjustment? }` | `{ variant: Variant }` | At least one field; variant must belong to product | 400, 401, 403, 404 | product_variants | Implemented |
| FR-005 (Addition) | GET | /products/:id/price | Any authenticated | — (query: variant_id?) | `{ product_id, variant_id, base_price, adjustment, unit_price }` | Valid product ID; optional variant must belong to product | 400, 401, 404 | products, product_variants | Implemented (Addition) |

#### Implemented Product & Variant Examples

##### 1. POST /api/v1/products (Admin)
- **Request Body:**
```json
{
  "name": "Brightloop CRM",
  "type": "software",
  "sales_price": "1000.00",
  "cost_price": "300.00",
  "notes": "Enterprise subscription edition"
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "product": {
      "id": "prod-1",
      "name": "Brightloop CRM",
      "type": "software",
      "sales_price": "1000.00",
      "cost_price": "300.00",
      "notes": "Enterprise subscription edition",
      "created_at": "2026-10-31T06:00:00.000Z",
      "updated_at": "2026-10-31T06:00:00.000Z"
    }
  },
  "message": "Product created successfully",
  "errors": null
}
```

##### 2. POST /api/v1/products/:id/variants (Admin)
- **Request Body:**
```json
{
  "name": "Odoo Brand",
  "price_adjustment": "560.00"
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "variant": {
      "id": "var-1",
      "product_id": "prod-1",
      "name": "Odoo Brand",
      "price_adjustment": "560.00",
      "created_at": "2026-10-31T06:05:00.000Z",
      "updated_at": "2026-10-31T06:05:00.000Z"
    }
  },
  "message": "Product variant created successfully",
  "errors": null
}
```

##### 3. GET /api/v1/products/:id/price?variant_id=var-1 (Contract Addition)
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "product_id": "prod-1",
    "variant_id": "var-1",
    "base_price": "1000.00",
    "adjustment": "560.00",
    "unit_price": "1560.00"
  },
  "message": "Price calculated successfully",
  "errors": null
}
```

### PLANS (FR-006, FR-007, FR-008)

| Req ID | Method | Path | Allowed Roles | Request Body | Success Response (data) | Validation Rules | Error Codes | DB Dependency | Status |
|--------|--------|------|---------------|-------------|------------------------|------------------|-------------|---------------|--------|
| FR-006 | GET | /plans | Any authenticated | — (query: page, page_size, frequency, product_id, available) | `{ items: [Plan], pagination }` | Customers only see plans within active availability window | 401 | plans | Implemented |
| FR-006, FR-007, FR-008 | POST | /plans | Admin | `{ product_id, price, frequency, min_quantity, available_from, available_until, auto_close, allow_early_close, allow_pause, allow_renew }` | `{ plan: Plan }` | frequency ∈ {daily,weekly,monthly,yearly}; min_quantity >= 1; available_until >= available_from | 400, 401, 403, 404 | plans, products | Implemented |
| FR-006 | GET | /plans/:id | Any authenticated | — | `{ plan: Plan }` | Valid ID; customer requesting unavailable plan receives 404 | 401, 404 | plans | Implemented |
| FR-006, FR-008 | PATCH | /plans/:id | Admin | Partial plan fields | `{ plan: Plan }` | Re-validates merged dates and quantities; non-negative money | 400, 401, 403, 404 | plans | Implemented |

#### Implemented Plan Examples

##### 1. POST /api/v1/plans (Admin)
- **Request Body:**
```json
{
  "product_id": "prod-1",
  "price": "99.00",
  "frequency": "monthly",
  "min_quantity": 1,
  "available_from": "2026-01-01T00:00:00.000Z",
  "available_until": "2026-12-31T23:59:59.000Z",
  "auto_close": false,
  "allow_early_close": true,
  "allow_pause": true,
  "allow_renew": true
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "plan": {
      "id": "plan-1",
      "product_id": "prod-1",
      "price": "99.00",
      "frequency": "monthly",
      "min_quantity": 1,
      "available_from": "2026-01-01T00:00:00.000Z",
      "available_until": "2026-12-31T23:59:59.000Z",
      "auto_close": false,
      "allow_early_close": true,
      "allow_pause": true,
      "allow_renew": true,
      "created_at": "2026-10-31T06:10:00.000Z",
      "updated_at": "2026-10-31T06:10:00.000Z"
    }
  },
  "message": "Plan created successfully",
  "errors": null
}
```

### TAXES (FR-014)

| Req ID | Method | Path | Allowed Roles | Request Body | Success Response (data) | Validation Rules | Error Codes | DB Dependency | Status |
|--------|--------|------|---------------|-------------|------------------------|------------------|-------------|---------------|--------|
| FR-014 | GET | /taxes | Any authenticated | — | `{ items: [TaxRule] }` | — | 401 | tax_rules | Proposed |
| FR-014 | POST | /taxes | Admin | `{ name, rate, description }` | `{ tax: TaxRule }` | rate decimal string (percentage) | 403, 422 | tax_rules | Proposed |
| FR-014 | PATCH | /taxes/:id | Admin | `{ name?, rate?, description? }` | `{ tax: TaxRule }` | At least one field | 403, 404, 422 | tax_rules | Proposed |

### DISCOUNTS (FR-018, FR-019, FR-020, FR-021)

| Req ID | Method | Path | Allowed Roles | Request Body | Success Response (data) | Validation Rules | Error Codes | DB Dependency | Status |
|--------|--------|------|---------------|-------------|------------------------|------------------|-------------|---------------|--------|
| FR-018 | GET | /discounts | Admin, Staff | — (query: page, page_size, active) | `{ items: [Discount], pagination }` | — | 401, 403 | discount_rules | Proposed |
| FR-018, FR-019, FR-020 | POST | /discounts | Admin | `{ type, value, min_amount, min_quantity, start_date, end_date, max_uses, scope, product_ids }` | `{ discount: Discount }` | type ∈ {fixed,percentage}; value decimal string; scope ∈ {product,subscription}; product_ids required when scope=product | 403, 422 | discount_rules, discount_product_mappings | Proposed |
| FR-018 | PATCH | /discounts/:id | Admin | Partial discount fields | `{ discount: Discount }` | At least one field; cannot reduce max_uses below used_count | 403, 404, 422 | discount_rules | Proposed |

### QUOTATION TEMPLATES (FR-009)

| Req ID | Method | Path | Allowed Roles | Request Body | Success Response (data) | Validation Rules | Error Codes | DB Dependency | Status |
|--------|--------|------|---------------|-------------|------------------------|------------------|-------------|---------------|--------|
| FR-009 | GET | /quotation-templates | Any authenticated | — (query: page, page_size) | `{ items: [Template], pagination }` | — | 401 | quotation_templates | Proposed |
| FR-009 | POST | /quotation-templates | Admin | `{ name, plan_id, validity_days, lines: [{ product_id, variant_id?, quantity }] }` | `{ template: Template }` | plan_id valid, validity_days > 0, lines non-empty | 403, 422 | quotation_templates, template_lines | Proposed |
| FR-009 | GET | /quotation-templates/:id | Any authenticated | — | `{ template: Template, lines: [TemplateLine] }` | Valid UUID | 401, 404 | quotation_templates, template_lines | Proposed |

### SUBSCRIPTIONS (FR-010, FR-011, FR-012)

| Req ID | Method | Path | Allowed Roles | Request Body | Success Response (data) | Validation Rules | Error Codes | DB Dependency | Status |
|--------|--------|------|---------------|-------------|------------------------|------------------|-------------|---------------|--------|
| FR-010 | GET | /subscriptions | Staff, Admin | — (query: page, page_size, status, customer_id) | `{ items: [Subscription], pagination }` | — | 401, 403 | subscriptions | Proposed |
| FR-010, FR-011 | POST | /subscriptions | Staff, Admin | `{ customer_id, plan_id, start_date, expiry_date, payment_terms, template_id?, lines: [{ product_id, variant_id?, quantity }] }` | `{ subscription: Subscription }` | Auto-generates unique number; plan must be available; lines required unless template_id provided | 403, 422 | subscriptions, subscription_lines | Proposed |
| FR-010 | GET | /subscriptions/:id | Staff, Admin (or owning customer) | — | `{ subscription: Subscription, lines: [SubscriptionLine] }` | Valid UUID; ownership check for customer role | 401, 403, 404 | subscriptions, subscription_lines | Proposed |
| FR-012 | POST | /subscriptions/:id/transition | Staff, Admin | `{ action }` | `{ subscription: Subscription }` | action ∈ {confirm_quotation, confirm, activate, close}; must follow lifecycle order; early close/pause/renew subject to plan policy | 403, 404, 409, 422 | subscriptions | Proposed |

### BILLING (FR-013, FR-017)

**Ownership:** Sanju supplies deterministic invoice calculations and period orchestration; Amarnadh protects/hosts the Express endpoint; Harsha enforces PostgreSQL atomic persistence and unique billing periods. Proposed route is not proof of live billing.

| Req ID | Method | Path | Allowed Roles | Request Body | Success Response (data) | Validation Rules | Error Codes | DB Dependency | Status |
|--------|--------|------|---------------|-------------|------------------------|------------------|-------------|---------------|--------|
| FR-013, FR-017 | POST | /billing/run | Admin | `{ target_date? }` | `{ invoices_created: number, errors: [] }` | Protected trigger; idempotent via UNIQUE(subscription_id, billing_period_start) | 403 | subscriptions, invoices, invoice_lines, discount_redemptions | Proposed |

### INVOICES (FR-013, FR-015, FR-016)

| Req ID | Method | Path | Allowed Roles | Request Body | Success Response (data) | Validation Rules | Error Codes | DB Dependency | Status |
|--------|--------|------|---------------|-------------|------------------------|------------------|-------------|---------------|--------|
| FR-013 | GET | /invoices | Staff, Admin (or owning customer) | — (query: page, page_size, status, customer_id, due_before, due_after) | `{ items: [Invoice], pagination }` | Ownership filtering for customer role | 401, 403 | invoices | Proposed |
| FR-013 | GET | /invoices/:id | Staff, Admin (or owning customer) | — | `{ invoice: Invoice, lines: [InvoiceLine] }` | Ownership check | 401, 403, 404 | invoices, invoice_lines | Proposed |
| FR-015, FR-016 | POST | /invoices/:id/confirm | Staff, Admin | — | `{ invoice: Invoice }` | Must be in draft status | 403, 404, 409 | invoices | Proposed |
| FR-015 | POST | /invoices/:id/cancel | Staff, Admin | — | `{ invoice: Invoice }` | Must be in draft or confirmed status; "cancelled" status TBD | 403, 404, 409 | invoices | Proposed |
| FR-015 | POST | /invoices/:id/send | Staff, Admin | — | `{ invoice: Invoice, sent: boolean }` | Must be confirmed or paid; email delivery best-effort | 403, 404, 409 | invoices | Proposed |
| FR-015 | GET | /invoices/:id/print | Staff, Admin (or owning customer) | — | PDF or HTML representation | Must exist | 401, 403, 404 | invoices, invoice_lines | Proposed |

### PAYMENTS (FR-022, FR-023)

| Req ID | Method | Path | Allowed Roles | Request Body | Success Response (data) | Validation Rules | Error Codes | DB Dependency | Status |
|--------|--------|------|---------------|-------------|------------------------|------------------|-------------|---------------|--------|
| FR-022 | POST | /invoices/:id/payments | Staff, Admin | `{ method, amount, date, note? }` | `{ payment: Payment }` | amount decimal string, must not exceed outstanding; invoice must be confirmed | 403, 404, 409, 422 | payments, invoices | Proposed |
| FR-023 | GET | /payments | Staff, Admin | — (query: page, page_size, invoice_id, date_from, date_to) | `{ items: [Payment], pagination }` | — | 401, 403 | payments | Proposed |

### REPORTS (FR-024)

| Req ID | Method | Path | Allowed Roles | Request Body | Success Response (data) | Validation Rules | Error Codes | DB Dependency | Status |
|--------|--------|------|---------------|-------------|------------------------|------------------|-------------|---------------|--------|
| FR-024 | GET | /reports/summary | Admin, Staff | — (query: date_from, date_to) | `{ active_subscriptions, total_revenue, outstanding_amount, overdue_count }` | Dates optional; defaults to current month | 401, 403 | subscriptions, invoices, payments | Proposed |
| FR-024 | GET | /reports/overdue-invoices | Admin, Staff | — (query: page, page_size, status) | `{ items: [Invoice], pagination }` | Filters on due_date < now AND status != paid | 401, 403 | invoices | Proposed |
| FR-024 | GET | /reports/payments | Admin, Staff | — (query: page, page_size, date_from, date_to) | `{ items: [Payment], pagination }` | — | 401, 403 | payments | Proposed |

### CUSTOMER PORTAL (FR-025, SEC-002)

| Req ID | Method | Path | Allowed Roles | Request Body | Success Response (data) | Validation Rules | Error Codes | DB Dependency | Status |
|--------|--------|------|---------------|-------------|------------------------|------------------|-------------|---------------|--------|
| FR-025 | GET | /portal/subscriptions | Customer | — (query: page, page_size, status) | `{ items: [Subscription], pagination }` | Always scoped to authenticated customer | 401 | subscriptions | Proposed |
| FR-025 | GET | /portal/invoices | Customer | — (query: page, page_size, status) | `{ items: [Invoice], pagination }` | Always scoped to authenticated customer | 401 | invoices | Proposed |
| FR-025, FR-008 | POST | /portal/subscriptions/:id/pause | Customer | — | `{ subscription: Subscription }` | Plan must allow_pause; subscription must be active; owned by customer | 401, 403, 404, 409 | subscriptions | Proposed |
| FR-025, FR-008 | POST | /portal/subscriptions/:id/close | Customer | — | `{ subscription: Subscription }` | Plan must allow_early_close; subscription must be active; owned by customer | 401, 403, 404, 409 | subscriptions | Proposed |
| FR-025, FR-008 | POST | /portal/subscriptions/:id/renew | Customer | — | `{ subscription: Subscription }` | Plan must allow_renew; subscription must be closed or expiring; owned by customer | 401, 403, 404, 409 | subscriptions | Proposed |

---

## Differences from existing repo docs

| Topic | Repo doc says | This proposal says | Resolution needed |
|-------|--------------|--------------------|--------------------|
| Health check data | `{"status":"healthy"}` (API_CONTRACTS.md) | `{"status":"healthy"}` with uptime + timestamp | Resolved: aligned to `"healthy"` |
| Staff creation path | `/api/v1/staff` (api-contracts.md) | `/api/v1/staff` (primary) and `/api/v1/admin/staff` (alias) | Resolved: both mounted and working |
| Billing path | `/api/v1/billing/run-due` (api-contracts.md) | `/api/v1/billing/run` | Minor — needs team decision |
| Subscription actions path | `/api/v1/subscriptions/:id/actions` (api-contracts.md) | Separate `/portal/subscriptions/:id/{pause,close,renew}` for customer; `/subscriptions/:id/transition` for staff | Clearer role separation; needs Ravi+Sanju approval |
| Tax path | `/api/v1/tax-rules` (api-contracts.md) | `/api/v1/taxes` | Shorter; either works |
| Discount path | `/api/v1/discount-rules` (api-contracts.md) | `/api/v1/discounts` | Shorter; either works |

---

## Open decisions (need Sanju + team)

1. **Invoice cancellation:** Add `cancelled` status or not?
2. **Discount stacking:** Can multiple discounts apply to one invoice line?
3. **Partial payments:** Allow, or require full amount?
4. **Billing timezone:** UTC for all dates, or configurable?
5. **Currency:** Single currency assumed; which one?
6. **Tax inclusive/exclusive pricing:** Which model?
7. **Proration:** On mid-cycle changes, prorate or full-period billing?
8. **Email provider:** For password reset and invoice send — which service?
9. **Scheduler:** Cron job, Supabase Edge Function, or manual trigger for billing?

