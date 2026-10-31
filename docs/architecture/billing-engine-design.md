# Billing engine — implementation proposal

Official PDF p.3: generate invoices when subscriptions are due; do not duplicate or skip billing.

**Required invariant:** UNIQUE(subscription_id, billing_period_start). Each due billing operation runs in a database transaction: lock/claim due subscription, calculate lines and tax/eligible discounts with exact decimal money, snapshot invoice and lines, reserve eligible discount usages, advance next due date and COMMIT. Failure ROLLBACK. Retry of same period returns existing invoice/no-op. Catch up missed periods. Process in bounded batches.

Test: duplicate run, concurrent workers, failed transaction, missed period, all four billing frequencies, discount expiration/cap, payment reconciliation. Scheduler must be verified. Protected manual “Run due billing” is a demo fallback, not automatic unattended billing.

**Team ownership:** Sanju implements deterministic invoice calculation and billing-period orchestration; Amarnadh integrates the protected Express API and owns the surrounding backend; Harsha owns transactional persistence, RLS and database uniqueness.

**Unapproved policy choices:** currency, rounding, inclusive/exclusive tax, stacking/ordering of discounts, partial payments, timezone and month-end. Do not claim the official PS specifies these policies.
