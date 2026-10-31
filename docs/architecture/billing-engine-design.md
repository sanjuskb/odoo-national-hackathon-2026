# Billing engine — implementation proposal

Official PDF p.3: generate invoices when subscriptions are due; do not duplicate or skip billing.

**Required invariant:** UNIQUE(subscription_id, billing_period_start). Each due billing operation runs in a database transaction: lock/claim due subscription, calculate lines and tax/eligible discounts with exact decimal money, snapshot invoice and lines, reserve eligible discount usages, advance next due date and COMMIT. Failure ROLLBACK. Retry of same period returns existing invoice/no-op. Catch up missed periods. Process in bounded batches.

Test: duplicate run, concurrent workers, failed transaction, missed period, all four billing frequencies, discount expiration/cap, payment reconciliation. Scheduler must be verified. Protected manual “Run due billing” is a demo fallback, not automatic unattended billing.

**Decisions not specified in PS:** currency, rounding, tax inclusive/exclusive, stacking/ordering of discounts, partial payments, timezone and month-end policy. Owners Amarnadh + Harsha; team lead approves.
