# Phase 0: Cross-Team Conflicts and Engineering Priorities
## Brightloop Software Subscription Management System — Odoo National Level Hackathon 2026

**Auditor:** Harsha (`harsha-1706`), Database Engineer  
**Workspace Root:** `E:\Projects\Odoo-Team`  
**Audit Date:** 2026-10-31  
**Audit Mode:** READ-ONLY Verification  

---

## 1. Master Cross-Team Conflict Matrix

| Feature / Contract | Harsha Local Implementation (`database/migrations/001..005`) | Amarnadh Backend Implementation (`develop` / `backend/`) | Ravi Frontend Expectation (`frontend/`) | Sanju Billing & AI Expectation (`billing/` & PR #15) | Recommended Harmonized Contract | Priority | Owner |
|---|---|---|---|---|---|---|---|
| **Billing Procedure & Calculation** | PL/pgSQL internal calculator `fn_generate_due_invoice(sub_id, date)` computes taxes and discounts inside DB | Calls `client.rpc('persist_due_billing_invoice', ...)` via `supabaseBillingRepository.cjs` | Displays invoice generated from backend `/api/v1/billing/run` | Deterministic Node.js minor-unit calculator `calculator.cjs` produces snapshot; requires atomic DB persistence RPC | **Adopt `persist_due_billing_invoice(...)` RPC.** Deterministic JavaScript calculates money to eliminate rounding drift; PostgreSQL performs row locks, period uniqueness check, snapshot insertion, and cursor progression atomically. | **P0** | Harsha (DB) & Sanju (Billing) |
| **Subscription Status Column** | Named `state` (`draft`, `quotation`, `confirmed`, `active`, `closed`) | Queries `.select('..., status, ...')` and `.eq('status', 'active')` | Renders `status` badge in UI | Expects `status IN ('draft', 'quotation', 'confirmed', 'active', 'paused', 'closed')` | **Standardize on `status`.** Include `paused` state in the enum check constraint. | **P0** | Harsha (DB) |
| **Paused Subscription Modeling** | Uses separate column `is_paused BOOLEAN DEFAULT false` | Does not inspect `is_paused`; expects status check | Toggle pause button sends lifecycle transition request | Status state machine transitions to `paused` | **Use `status = 'paused'`.** Maintain `status IN ('draft','quotation','confirmed','active','paused','closed')`. Remove redundant `is_paused` column. | **P0** | Harsha (DB) & Amarnadh (API) |
| **Subscription Line Attributes** | `subscription_lines` contains `(product_id, variant_id, quantity, unit_price, tax_rate_percent, discount_percentage, amount)` | Queries `(product_id, description, quantity, unit_price, variant_adjustment, tax_rate_percent)` | Shows line description, quantity, unit price, variant addon, and line total | Passes `productId`, `title`, `quantity`, `unitPrice`, `variantAdjustment`, `taxPercent` | **Adopt backend/billing schema:** `product_id`, `description`, `quantity`, `unit_price`, `variant_adjustment`, `tax_rate_percent`. Allow optional `variant_id` FK. | **P0** | Harsha (DB) |
| **Discount Rule Table & Scopes** | `discount_rules` + `discount_rule_products (discount_rule_id, product_id)` with `applies_to ('entire_subscription', 'specific_products')` | Queries `discount_rules` with columns `kind, value, scope, min_amount, min_quantity, valid_from, valid_until, max_uses, used_count` and `discount_product_mappings` | Admin UI to create percentage or fixed discount on product or order | Expects `scope in ('subscription','product')` and join table `discount_product_mappings` | **Standardize on `discount_rules` + `discount_product_mappings`.** Columns: `kind`, `value`, `scope`, `min_amount`, `min_quantity`, `valid_from`, `valid_until`, `max_uses`, `used_count`. | **P0** | Harsha (DB) |
| **Plan Catalogue Structure** | Has `plan_products (plan_id, product_id, is_primary)` join table | Queries `plans.product_id` direct FK, plus `frequency`, `currency` | Selects plan for a product | Expects direct `plans.product_id` foreign key | **Use direct `plans.product_id REFERENCES products(id)`.** A plan belongs to a core subscription product. Simplifies queries and matches backend. | **P0** | Harsha (DB) |
| **User Role Authority & Sync** | `profiles.role` protected by `fn_prevent_role_escalation()` trigger and `fn_handle_new_user()` reading `raw_app_meta_data` | `roleStore.js` updates `auth.users.raw_app_meta_data->>'role'` using service-role key | Uses profile role for UI routing | Requires `profiles.role` to match `raw_app_meta_data` for PostgreSQL RLS | **Implement two-way Auth-to-Profile Sync Trigger.** `brightloop_auth_role_metadata_changed` updates `profiles.role` on `raw_app_meta_data` change. Backfill development users. | **P0** | Harsha (DB) |
| **Monetary Precision** | `NUMERIC(12, 2)` (up to 999,999,999.99) | Serializes exact 2-decimal strings | Formats currency with 2 decimals | Exact minor-unit integer calculation converted to 2-decimal strings | **Use `NUMERIC(14, 2)` across all financial tables.** Accommodates enterprise enterprise volume up to 999 billion without rounding issues. | **P1** | Harsha (DB) |
| **AI Assistance Persistence** | No AI tables in local migrations | No AI routes currently in backend | Will display call status / assistance pill | Needs consent, idempotency, call status, retries, outcome, and opt-out tracking | **Create `public.ai_assistance_events` table.** Provide full schema covering consent, phone, status, retries, timestamps, and outcomes. | **P1** | Harsha (DB) & Sanju (AI) |
| **Quotation Templates** | `quotation_templates` + `quotation_template_lines (template_id, product_id, variant_id, quantity)` | Not yet implemented in Express | Sales rep starts quote from template | Specified in official Problem Statement Page 3 | **Retain Harsha's Quotation Template schema.** Add `validity_days`, `plan_id`, and `template_lines`. Ready for Amarnadh's Phase 2 API. | **P1** | Harsha (DB) & Amarnadh (API) |

---

## 2. Priority Classification for Phase 1 Execution

### Priority 0 (P0) — Required for Functional Integrated Vertical Slice
1. **Core Database Schema Unification:**
   - Harmonize Harsha's `001_initial_schema.sql` with Sanju's PR #15 core migration.
   - Align table and column names (`subscriptions.status`, `subscription_lines.variant_adjustment`, `discount_product_mappings`, `plans.product_id`).
   - Retain enterprise catalogue, quotation templates, tax rules, and payments tables.
2. **Auth & Role Synchronization Triggers:**
   - Apply `create_customer_profile()` trigger on `auth.users` insert (default role `'customer'`).
   - Apply `sync_brightloop_profile_role()` trigger on `auth.users.raw_app_meta_data` update to reflect Amarnadh's `roleStore.js` mutations.
   - Insert-only backfill for existing Auth users.
3. **Atomic Billing RPC (`persist_due_billing_invoice`):**
   - Author and harden `persist_due_billing_invoice` PL/pgSQL function.
   - Restrict execution strictly to `service_role` (reject anon and authenticated JWTs).
   - Enforce row locks (`FOR UPDATE`) on `subscriptions` and `discount_rules`.
   - Validate that precomputed line totals reconcile with invoice subtotal, taxes, discounts, and total.
   - Guarantee atomic advance of `next_billing_date`.
4. **Hard Financial Invariants:**
   - Enforce `UNIQUE (subscription_id, billing_period_start)` on `invoices`.
   - Enforce non-negative checks on prices, subtotals, taxes, and totals.
5. **Row Level Security (RLS) Isolation:**
   - Enable RLS on all 15 tables with deny-by-default.
   - Customer isolation: `customer_id = auth.uid()`.
   - Non-recursive staff check via `SECURITY DEFINER` function `is_brightloop_staff()`.

---

### Priority 1 (P1) — Correctness, AI Workflows & Reporting
1. **AI Assistance Call Persistence:**
   - Create `public.ai_assistance_events` table with customer consent, verified phone, confirmed activation trigger, idempotency key, call status, retries, timestamps, and opt-out attributes.
   - Add RLS policy: customer reads own call status; staff manages assistance queue.
2. **Payment Recording & Reconciliation:**
   - Payment entry recording linked to `invoices(id)` with `amount`, `method`, `paid_at`, `note`, and `external_reference`.
   - Partial composite unique index `(invoice_id, external_reference) WHERE external_reference IS NOT NULL`.
3. **Performance & Query Optimization Indexes:**
   - Partial composite index on due subscriptions: `idx_subscriptions_due_billing ON subscriptions(next_billing_date) WHERE status = 'active'`.
   - Foreign key indexes on all join paths.
   - Partial index on overdue unpaid invoices for rapid finance reporting.

---

### Priority 2 (P2) — Performance Benchmarks & Polish
1. **High-Scale Seed & Benchmark Harness:**
   - Seed script generating thousands of synthetic subscriptions to verify the official <2-second page response target.
2. **Quotation Template Lifecycle Helpers:**
   - Helper function or view to instantiate a subscription draft from a quotation template.

