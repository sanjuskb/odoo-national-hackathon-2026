# Deterministic billing engine — Sanju (primary owner)

This package contains **real, dependency-free, testable** deterministic invoice calculations and recurring billing orchestration. It is **not** an LLM, payment gateway, scheduler, PostgreSQL implementation or completed application.

## Verified contract

- `src/calculator.cjs`: `calculateInvoice({ subscriptionId, customerId, periodStart, currency, lines, discounts, policy })`.
- Explicit policy: `{ taxMode: 'exclusive'|'inclusive', discountStacking: 'best'|'all', rounding: 'half-up' }`.
- Each line: `{ productId, title, quantity, unitPrice: '100.00', variantAdjustment?: '0.00', taxPercent: '18.00' }`.
- Each discount: `{ id, kind: 'fixed'|'percentage', value: '10.00', scope: 'product'|'subscription', productIds?, minAmount?, minQuantity?, validFrom?, validUntil?, maxUses?, usedCount? }`.
- Prices, discounts and taxes are integer minor units internally; JSON results use exact two-decimal strings. Do not perform ledger math in JavaScript floating point or LLM code.
- `src/recurrence.cjs`: `nextBillingDate(date, frequency, anchorDate)` supports daily, weekly, monthly and yearly recurrence using UTC calendar dates and consistent anchor-day policy.
- `src/runner.cjs`: `runDueBilling({ repository, asOf, policy, batchSize, maxPeriodsPerSubscription })` catches up due periods in bounded batches, reports failures/backlog and requires a DB transaction adapter.

## Required PostgreSQL adapter — Harsha owns

Implement and verify:
1. `listDueSubscriptionIds({asOf,limit})` returns stable IDs of due active subscriptions.
2. `getBillingSnapshot(subscriptionId)` returns customerId, status, nextBillingDate (YYYY-MM-DD), anchorDate, frequency, currency, line snapshots, eligible discounts with usage counters. **Do not trust client-controlled prices or discounts.**
3. `persistInvoiceAtomically({subscriptionId,expectedNextBillingDate,nextBillingDate,invoice,idempotencyKey,discountRedemptionIds})`: one ACID transaction locks/claims subscription and discount usages, enforces `UNIQUE(subscription_id,billing_period_start)`, inserts invoice and lines, consumes discount limits, advances the cursor, and commits. On any failure, rollback. Response status must be `created` or `already-exists` **only if the cursor is safely advanced**.

**CRITICAL:** Until a real PostgreSQL adapter implements and tests those guarantees, this module is NOT production-ready for concurrent billing. A fake in-memory adapter's unit tests cannot prove transactional persistence, RLS or multi-worker safety.

## Express adapter — Amarnadh owns

Integrate into protected `POST /api/v1/billing/run` using verified staff/admin identity (or trusted worker), server-side policy lookup and real DB adapter. Do not expose an unauthenticated endpoint that accepts arbitrary pricing or elevated service keys.

## Policies requiring approval

Currency, tax inclusion/exclusion, discount stacking and ordering, currency-specific minor units, timezone, renewal pause behavior, month-end anchor and proration. This initial package assumes two minor currency decimal places and half-up rounding **when explicitly requested**; do not run live billing for other policies/currencies without an approved extension.

## Run tests

```bash
cd billing
npm test
```

The tests verify pure calculations and a fake rollback/retry adapter only. They do not connect to Supabase or make real payments.

Next integration proof: Harsha's migration/RLS/atomic function + Amarnadh's protected endpoint + two-customer isolation + repeated/concurrent billing against **actual PostgreSQL**.
