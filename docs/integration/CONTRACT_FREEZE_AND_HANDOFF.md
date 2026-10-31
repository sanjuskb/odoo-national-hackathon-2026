# Contract-first integration handoff — agreement required

**Canonical PS:** [official statement](../official/problem-statement.md). **Proposed endpoint list:** [api-contracts.md](api-contracts.md). Shared API and data contracts still require approval by Ravi + Amarnadh + Harsha; invoice-generation ownership is assigned to Sanju as recorded below.

## Core shared conventions
- Express base path: /api/v1 (the existing repository's pre-PS convention).
- JSON response envelope (existing convention): {"success":true,"data":{},"message":"...","errors":null}. Errors must use appropriate HTTP codes.
- Auth identity comes from verified Supabase session/token, never from frontend-declared role or customerId alone.
- Frontend-facing Product, Plan, Subscription, Invoice, Payment, DashboardOverview shapes must be approved together and kept versioned/typed where practical.
- Server computes pricing, taxes, discounts, invoice totals and outstanding balances. LLMs must never calculate or modify ledger values.
- Stable subscription_id + billing_period_start uniqueness and a DB transaction are essential billing invariants.

## Ownership and first vertical slice
1. Harsha: migration for profiles/roles, product/plan, subscription and invoice; add RLS and unique billing-period constraint (names agreed first).
2. Amarnadh: GET /api/v1/health, authenticated subscription create/list, Express route/controller integration and payment/report APIs.
3. **Sanju (primary owner): deterministic invoice-generation service and billing-period orchestration**, including finance-policy implementation, invoice persistence coordination, idempotency behavior and invoice-generation tests. Work with Amarnadh on backend route/service integration and Harsha on schema/constraints. Do not duplicate or bypass shared backend contracts.
4. Ravi: login + subscription form/list and invoice presentation with valid/invalid states; show real backend responses.
5. Sanju: verify two-customer ownership isolation; run due billing twice and under concurrency to confirm one invoice per period; record payment and verify dashboard reconciliation.

## Contract review record (fill before implementation)
| Domain | Request shape | Response shape | DB entity/migration | Frontend owner | Backend/service owner | Approved |
|---|---|---|---|---|---|---|
| Auth/role | TBD | TBD | TBD | Ravi | Amarnadh | No |
| Product/variant | TBD | TBD | TBD | Ravi | Amarnadh | No |
| Plan/quote/subscription | TBD | TBD | TBD | Ravi | Amarnadh | No |
| Invoice/billing | TBD | TBD | TBD | Ravi | **Sanju (generation service); Amarnadh (Express integration); Harsha (persistence)** | No |
| Payment/report | TBD | TBD | TBD | Ravi | Amarnadh | No |

Any contract change after approval: notify affected owners; update this file + API contract + implementation tests in the same PR.

**Do not confuse endpoint examples with working code.** Confirm actual backend routes and DB migrations before marking a feature complete.
