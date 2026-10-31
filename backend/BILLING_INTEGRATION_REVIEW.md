# Express ↔ Sanju Billing ↔ Supabase adapter — REVIEW ONLY

This PR is a real proposed connection layer, **not a verified live financial workflow**. Requires Harsha's schema and RPC from draft PR #15 to be approved, applied and tested first.

## Route
`POST /api/v1/billing/run` with an actual Supabase user bearer JWT. The backend fetches the authenticated user through Supabase Auth, then checks the stored role via server-only credentials. Only `admin` may trigger billing. Missing JWT = 401; insufficient role = 403.

## Server configuration
- `SUPABASE_URL` (project origin)
- `SUPABASE_ANON_KEY` (public key, sent only to Auth user verification)
- `SUPABASE_SERVICE_ROLE_KEY` (**server only**, never committed or returned)
- `BILLING_TAX_MODE`: choose `inclusive` or `exclusive`
- `BILLING_DISCOUNT_STACKING`: choose `best` or `all`
- `BILLING_ROUNDING`: `half-up`
- `BILLING_DUE_DAYS`: explicitly approved number 0..365

All billing settings are intentionally blank in `.env.example`. Route rejects missing policy.

## Data contract assumptions
- `subscription_lines.unit_price` stores the base unit price snapshot and `variant_adjustment` stores the chosen variant delta at subscription creation. Do not fetch mutable current catalog prices for historical invoices.
- `subscription_lines.description` is the immutable product description snapshot.
- `tax_rate_percent` is sourced from an admin-configured rule applied when the subscription is created or renewed.
- Discount rules and product mappings are fetched from Supabase. The initial adapter refuses to bill when there are 1000+ rules because pagination is not yet implemented; that is safer than silently ignoring discounts.
- For a given subscription period, Sanju's pure calculator generates invoice snapshots. Harsha's atomic RPC persists invoice/lines, usage counters and billing cursor in a single transaction.
- Failed database calls are surfaced as failures; the API does not expose Supabase credentials or SQL internals.

## Testing limits
Backend route tests prove that the endpoint requires authentication and approved finance policies before running. The existing billing tests cover pure arithmetic and a simulated repository adapter.

**Still required before shipping:** real Supabase connection tests, authorized admin/staff/customer accounts, 2-customer isolation, tax policy approval, duplicate/concurrent due-billing execution with actual PostgreSQL, failure rollback/retry, scheduler and page performance. This is not a live payment gateway.

## Required review
- **Amarnadh:** Express route/auth standards and API response envelope.
- **Sanju:** billing policy and service interface.
- **Harsha:** RPC/schema field mapping and RLS/security.
- **Ravi:** frontend `/api/v1/billing/run` contract if a manual admin trigger will appear.

Do not merge until reviewed, or claim the route delivers unattended automatic billing: it is an admin-triggered batch endpoint.
