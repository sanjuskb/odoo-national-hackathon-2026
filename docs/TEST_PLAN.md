# Verification plan — Subscription Management System

The official PS requires under-two-second page responses with thousands of subscriptions; registration rules; customer isolation; invoicing without skips or duplicates; discounts, payments and reporting.

**Canonical test specification:** [quality/verification-plan.md](quality/verification-plan.md), [acceptance criteria](requirements/acceptance-criteria.md), and [demo acceptance checklist](quality/demo-acceptance-checklist.md).

The GitHub Actions [integration quality gate](../.github/workflows/ci.yml) checks repository structure and (once app package scripts exist) frontend/backend build/lint/test. A green documentation-only CI run does NOT verify the actual application.

Critical real integration checks: two-customer account isolation; admin-only staff creation; variant +560 pricing; plan options; subscription state transitions; invoice period unique constraint; retry/concurrent billing; discount caps; payment reconciliation; page performance with thousands of records. Record observed outcomes; do not assert success without running the test.
