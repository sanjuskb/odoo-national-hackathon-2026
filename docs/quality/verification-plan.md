# Verification plan — evidence before claims

| Area | Minimum evidence |
|---|---|
| Registration | Duplicate email rejected; password rules; reset link |
| Authorization | Admin-only staff/discount changes; cross-customer record access blocked |
| Catalog/plans | Product fields; +560 variant; four frequencies and availability rules |
| Quote/subscription | Template valid-days, unique ID, line totals and valid transitions |
| Billing | Complete invoice from subscription/tax/discount; rerun idempotency; concurrent worker; missed period catch-up |
| Invoice | Draft/Confirmed/Paid, confirm/cancel/send/print behavior |
| Discount | Scope, thresholds, expiry, usage cap |
| Payments | Correct linked method/amount/date/note and outstanding/overdue |
| Reporting | Active/revenue/payments/overdue filters and reconciled totals |
| Performance | Pages measured <2s with thousands of seeded subscriptions |

Run API integration tests and one browser end-to-end smoke test using clearly labeled synthetic data. Record fixtures, test environment, actual observed timings and failures. Unexecuted tests stay unverified.

Security: no leaked service keys, no unvalidated role claims, no cross-customer invoices, server-side computation of financial totals.
