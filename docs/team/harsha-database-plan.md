# Harsha — Supabase PostgreSQL and Auth

**Decision baseline:** one shared Supabase project; verify actual permissions/connection. Do not create duplicate MySQL application database.

1. Review `docs/architecture/database-design-proposal.md`, existing migrations and teammates' field needs.
2. Implement scoped schema/migrations with FK, positive quantity, dates, decimal money and unique subscription number.
3. Enforce invoice UNIQUE(subscription_id,billing_period_start); synchronize atomic invoice+lines+discount-usage+next-billing schedule with backend owner.
4. Configure customer-scoped RLS on exposed tables and test two distinct customers; staff/admin roles must be enforced server-side.
5. Seed clearly synthetic demo data: admin, staff, two customers, product with +560 variant, monthly/yearly plans, subscriptions/invoices/payments.
6. Benchmark thousands of subscriptions with indexed due/overdue/report queries; document measured time.

**Handoff to backend/frontend:** exact migration field names, indexes, RLS rules and data access pattern. Avoid unreviewed schema changes that break dependent APIs.
