# Official-PS-traceable requirements

Source: 4-page `Subscription_Management_System.pdf`. **P0/P1 are team scheduling priorities only. The PDF does not grant permission to omit P1 items.** All statuses are *Not verified* pending implementation and tests.

| ID | Requirement | PDF page | Build priority* | Owner | Proof | Status |
|---|---|---:|---|---|---|---|
| FR-001 | Customer registration email/password | 2 | P0 | Amarnadh/Harsha | Register test | Not verified |
| FR-002 | Unique account per email | 2 | P0 | Harsha | Duplicate rejection | Not verified |
| SEC-001 | Password >8 chars with upper/lower/special | 2 | P0 | Amarnadh | Boundary validation | Not verified |
| FR-003 | Email reset link to registered address | 2 | P0 | Amarnadh | Reset email delivery | Not verified |
| SEC-002 | Admin/staff/customer permissions; customer sees only own subscriptions and invoices | 2 | P0 | Amarnadh/Harsha/Ravi | Two-customer isolation | Not verified |
| SEC-003 | Only admin creates staff | 2 | P0 | Amarnadh | Staff 403 | Not verified |
| FR-004 | Product name, type, sale/cost price, notes | 3 | P0 | Amarnadh/Harsha/Ravi | Product CRUD | Not verified |
| FR-005 | Price-adjusted product variants; Odoo brand +560 example | 3 | P0 | Amarnadh/Harsha | Price fixture | Not verified |
| FR-006 | Plan cost and daily/weekly/monthly/yearly billing | 3 | P0 | Amarnadh/Harsha | Frequency tests | Not verified |
| FR-007 | Plan minimum quantity and available dates | 3 | P0 | Amarnadh | Date/quantity validation | Not verified |
| FR-008 | Per-plan auto-close, early-close, pause and renewal policy | 3 | P1 | Amarnadh | Policy tests | Not verified |
| FR-009 | Quotation template with plan, product lines, validity days | 3 | P0 | Amarnadh/Ravi | Template-to-quote | Not verified |
| FR-010 | Unique subscription number, customer, plan, start/expiry, terms | 3 | P0 | Harsha/Amarnadh | Uniqueness + fields | Not verified |
| FR-011 | Subscription lines with product, qty, price, tax, amount | 3 | P0 | Amarnadh/Harsha | Line math | Not verified |
| FR-012 | Draft->Quotation->Confirmed->Active->Closed, visible status | 3 | P0 | Amarnadh/Ravi | Transition tests | Not verified |
| FR-013 | Due invoices generated from subscriptions with customer/lines/tax/totals | 3 | P0 | Sanju (engine) / Amarnadh (API) / Harsha (DB) | Billing job | Not verified |
| FR-014 | Automated tax from admin tax rules | 3 | P0 | Amarnadh | Tax fixture | Not verified |
| FR-015 | Confirm/cancel/send/print invoice actions | 3 | P1 | Amarnadh/Ravi | Actions & output | Not verified |
| FR-016 | Invoice Draft->Confirmed->Paid lifecycle | 3 | P0 | Amarnadh | State test | Not verified |
| FR-017 | No duplicated or skipped scheduled invoices | 3 | P0 | Sanju (engine) / Harsha (DB) / Amarnadh (API) | Retry/concurrency | Not verified |
| FR-018 | Admin-only fixed or percentage discount rules | 4 | P0 | Amarnadh/Harsha | Admin rule + 403 | Not verified |
| FR-019 | Discount min purchase/quantity, date window, max uses | 4 | P0 | Amarnadh/Harsha | Eligibility/boundary | Not verified |
| FR-020 | Discount scope specific products or entire subscription | 4 | P0 | Amarnadh/Harsha | Product/whole tests | Not verified |
| FR-021 | Apply valid discount automatically to next invoice; expire/exhaust correctly | 4 | P0 | Sanju (engine) / Amarnadh (API) / Harsha (DB) | Next invoice tests | Not verified |
| FR-022 | Payments linked to correct invoice with method/amount/date/note | 4 | P0 | Amarnadh/Ravi | Payment link | Not verified |
| FR-023 | Show paid/outstanding and overdue invoices | 4 | P0 | Ravi/Amarnadh | Balance query | Not verified |
| FR-024 | Filtered summary active subscriptions, revenue, payments, overdue | 4 | P0 | Ravi/Harsha | Reconciled reports | Not verified |
| FR-025 | Customer self-service portal for own subscriptions and invoices | 1–2 | P0 | Ravi/Amarnadh | Customer e2e | Not verified |
| NFR-001 | Page response under 2 seconds with thousands of subscriptions | 4 | P0 | All | Measured load run | Not verified |
| DATA-001 | Persistent products, subscriptions, billing, users, payments and rules | 1–4 | P0 | Harsha | Reload/persistence | Not verified |

## Implementation gates
1. Approve roles, shared schema and API envelope.
2. Complete actual customer → subscription → scheduled invoice → payment → reporting path.
3. Show repeat billing safely creates no duplicates.
4. Test ownership restrictions and overdue calculations.
5. Benchmark under realistic thousands of subscriptions; never claim performance without a measurement.

**Open specifications:** currency; payment terms interpretation, tax-inclusive pricing, rounding/discount order/stacking, partial payments, billing timezone and schedule, customer cancellation rules and provider email integration. See decision log.
