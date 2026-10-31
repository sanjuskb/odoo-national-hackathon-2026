# Contract-first integration handoff — agreement required

**Canonical PS:** [official statement](../official/problem-statement.md). **Proposed endpoint list:** [api-contracts.md](api-contracts.md). Owner decision required by Ravi + Amarnadh + Harsha before treating this as implemented API.

## Core shared conventions
- Express base path: `/api/v1` (the existing repository's pre-PS convention).
- JSON response envelope (existing convention): `{"success":true,"data":{},"message":"...","errors":null}`. Errors must use appropriate HTTP codes.
- Auth identity comes from verified Supabase session/token, never from frontend-declared `role` or `customerId` alone.
- Frontend-facing `Product`, `Plan`, `Subscription`, `Invoice`, `Payment`, `DashboardOverview` shapes must be approved together and kept versioned/typed where practical.
- Server computes pricing, taxes, discounts, invoice totals and outstanding balances.
- Stable `subscription_id + billing_period_start` uniqueness and a DB transaction are essential billing invariants.

## Proposed first vertical slice
1. Harsha: migration for profiles/roles, product/plan, subscription, invoice; add RLS/unique period constraint (names agreed first).
2. Amarnadh: `GET /api/v1/health`, authenticated subscription create/list; billing run and invoice read; shared exact JSON.
3. Ravi: login + subscription form and list with valid/invalid states; show real backend response.
4. Sanju: use two customers to verify ownership; run due billing twice and confirm a single invoice, then record payment and verify dashboard.

## Contract review record (fill before implementation)
| Domain | Request shape | Response shape | DB entity/migration | Frontend owner | Backend owner | Approved |
|---|---|---|---|---|---|---|
| Auth/role | TBD | TBD | TBD | Ravi | Amarnadh | No |
| Product/variant | TBD | TBD | TBD | Ravi | Amarnadh | No |
| Plan/quote/subscription | TBD | TBD | TBD | Ravi | Amarnadh | No |
| Invoice/billing | TBD | TBD | TBD | Ravi | Amarnadh | No |
| Payment/report | TBD | TBD | TBD | Ravi | Amarnadh | No |

Any contract change after approval: notify affected owners; update this file + API contract + implementation tests in the same PR.

**Do not confuse endpoint examples with working code.** Confirm actual backend routes and DB migrations before marking a feature complete.
