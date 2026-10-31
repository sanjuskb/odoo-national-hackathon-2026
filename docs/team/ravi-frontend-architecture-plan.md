# Ravi — architecture lead and frontend owner

**Start:** review main use-cases and contracts with Amarnadh and Harsha; do not independently invent API shapes.

**Suggested UI:** Auth register/login/reset; admin product/variant, plan, tax, discount, staff views; staff quote template, subscription workflow, invoice actions and payment entry; customer own portal; finance dashboard and filters.

**Architecture:** TypeScript typed API client for `/api/v1`; role-specific layouts, shared forms/tables/validation; feature areas auth/catalog/plans/quotes/subscriptions/invoices/payments/reports. Provide loading, empty, error and pending states. Use server pagination to meet performance.

**First integration:** log in → create/list subscription → view due invoice → enter payment → refresh summary. Prove two-customer isolation. Use mock only temporarily and disclose until actual API connected.

**Hand-off:** approve types for Product, Variant, Plan, Subscription, SubscriptionLine, Invoice, Payment, DashboardOverview and lifecycle transition requests.
