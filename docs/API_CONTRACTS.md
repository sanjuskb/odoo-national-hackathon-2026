# API contracts — Subscription Management System

> The original pre-PS resource template is superseded by [proposed endpoint contracts](integration/api-contracts.md). Ravi and Amarnadh must approve exact JSON fields with Harsha before frontend/backend modules depend on them.

**Existing agreed conventions (to verify against running app):**
- Prefix: `/api/v1`.
- Content-Type: `application/json`.
- Success: `{"success":true,"data":{},"message":"...","errors":null}`.
- Failure: `{"success":false,"data":null,"message":"...","errors":[{"field":"...","issue":"..."}]}`.
- Protected requests: verified bearer identity (Supabase Auth by team plan), server-side role and customer ownership checks.

The official requirements imply resources for accounts, staff, products/variants, plans, quotation templates, subscriptions, taxes, discounts, billing, invoices, payments and reporting. Specific routes remain proposed until approved and implemented. See [contract handoff](integration/CONTRACT_FREEZE_AND_HANDOFF.md). Never claim a documented endpoint is deployed until exercised.
