# Brightloop database implementation baseline — HARSHA REVIEW REQUIRED

**Status: proposed source committed in a review branch; NOT applied to the team's Supabase database.**

## Files
- `migrations/20261031_001_brightloop_core.sql`: normalized tables, RLS, customer Auth trigger, indexes, invoice-period UNIQUE.
- `migrations/20261031_002_atomic_billing_rpc.sql`: privileged `persist_due_billing_invoice` transactional function. Locks due subscription, validates totals and discount usage, inserts immutable invoice line snapshots, updates redemption counters and billing cursor atomically, and refuses unauthorized JWT role.
- `tests/20261031_contract_checks.sql`: read-only structural assertions after applying migrations.

## Critical integration contract with Sanju and Amarnadh

- Sanju: `billing/src/calculator.cjs` returns deterministic invoice snapshot with `invoiceLines`, `subtotal`, `discountTotal`, `taxTotal`, `total`, `appliedDiscounts`.
- Harsha: approve schema and the SQL RPC, then implement `billing/src/runner.cjs` repository adapter using the **service-role only on a trusted backend**. The RPC accepts expected due date, next date, due date, money strings, `invoiceLines` JSON and `appliedDiscounts` JSON.
- Amarnadh: use a protected `POST /api/v1/billing/run` that never trusts client-controlled amounts; load subscriptions/discounts from DB under verified identity/role and invoke Sanju's runner.
- Ravi: consume `/api/v1/invoices` and backend response envelope only, not privileged Supabase direct writes.

## Before executing
1. Check existing Supabase tables/triggers, inspect diff, and use an isolated development project or backup. This migration is designed for a new schema and will conflict with incompatible preexisting tables/triggers.
2. Review Auth `profiles` trigger, initial admin bootstrap and privileged staff creation. Trigger creates `customer`, not an admin, intentionally.
3. Approve finance rules: currency, inclusive/exclusive tax, discount stacking/usage semantics, paused/closed behavior, timezone/date anchoring and due date policy.
4. Apply 001 then 002, then structural test SQL, then **actual** RLS tests with distinct JWTs and real transaction rollback/concurrency tests. Structural assertions alone are insufficient.
5. Confirm `supabase-js` RPC field mapping and permissions. Never publish `SUPABASE_SERVICE_ROLE_KEY` or direct DB credentials.
6. Check any generated Auth-provider password reset settings and email delivery separately; schema does not configure those.

## Required real tests after applying
- Registration creates profile role=`customer` and cannot self-promote to admin.
- Customer A denied customer B's subscriptions, invoices, lines and payments; internal staff have approved reads.
- Unique(subscription_id,billing_period_start) blocks duplicate bills.
- Two concurrent billing workers produce one invoice and one usage redemption per discount.
- Simulated DB exception rolls back all invoice lines, redemptions and next_billing_date.
- Payment inserts reconcile to outstanding amount and cannot create unauthorized charges.
- Thousands of subscriptions indexed and benchmarked under the official two-second page target.

**Do not claim the SQL is running simply because a GitHub PR passes repository CI.** Harsha owns approval and deployment.
