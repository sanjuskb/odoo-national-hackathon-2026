# Phase 1: Architectural Conflict Resolution & Reconciliation
## Brightloop Software Subscription Management System — Odoo National Level Hackathon 2026

**Author:** Harsha (`harsha-1706`), Database Engineer  
**Workspace:** `E:\Projects\Odoo-Team`  
**Status:** FULLY RECONCILED  
**Date:** 2026-10-31  

---

## 1. Resolution of the 8 Architectural Discrepancies

### Conflict 1: Subscription Lifecycle Attribute — `state` vs. `status`
- **Harsha Initial Implementation (`database/migrations/001_initial_schema.sql`):**  
  Used `state TEXT CHECK (state IN ('draft', 'quotation', 'confirmed', 'active', 'closed')) DEFAULT 'draft'`.
- **Teammate Code Evidence:**  
  - Amarnadh's [backend/src/services/supabaseBillingRepository.cjs](file:///E:/Projects/Odoo-Team/backend/src/services/supabaseBillingRepository.cjs#L24) explicitly selects:  
    `.select('id,status,customer_id,plan_id,start_date,next_billing_date,billing_anchor_date').eq('status','active')`.
  - Sanju's [billing/src/runner.cjs](file:///E:/Projects/Odoo-Team/billing/src/runner.cjs#L23) asserts:  
    `while(snapshot && snapshot.status==='active' && ...)`.
  - Sanju's PR #15 migration [database/migrations/20261031_001_brightloop_core.sql](file:///E:/Projects/Odoo-Team/database/migrations/20261031_001_brightloop_core.sql#L104) defines `status text not null check(status in (...))`.
  - Amarnadh's [backend/API_CONTRACT_PROPOSAL.md](file:///E:/Projects/Odoo-Team/backend/API_CONTRACT_PROPOSAL.md#L45) lists `status: "draft" | "quotation" | "confirmed" | "active" | "closed" | "paused"`.
- **Architectural Trade-Off:**  
  Retaining `state` would immediately cause runtime SQL syntax failures in `supabaseBillingRepository.cjs` and break the billing test harness.
- **FINAL RESOLUTION:** Standardize on **`status`**.  
  Constraint: `status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'quotation', 'confirmed', 'active', 'paused', 'closed'))`.

---

### Conflict 2: Paused Subscription Representation — `is_paused` vs. `status = 'paused'`
- **Harsha Initial Implementation (`database/migrations/001_initial_schema.sql`):**  
  Included a standalone boolean flag `is_paused BOOLEAN NOT NULL DEFAULT false`, while maintaining `state IN ('confirmed', 'active')`.
- **Teammate Code Evidence:**  
  - Amarnadh's [backend/API_CONTRACT_PROPOSAL.md](file:///E:/Projects/Odoo-Team/backend/API_CONTRACT_PROPOSAL.md#L45) treats `paused` as a first-class lifecycle state. Endpoint `/portal/subscriptions/:id/pause` transitions `status` directly to `'paused'`.
  - Sanju's [billing/src/runner.cjs](file:///E:/Projects/Odoo-Team/billing/src/runner.cjs#L23) automatically skips any subscription where `status !== 'active'`, natively handling paused subscriptions without needing a boolean check.
- **Architectural Trade-Off:**  
  Maintaining both `status` and `is_paused` introduces split-brain state vulnerabilities (e.g. `status = 'closed'` with `is_paused = true`).
- **FINAL RESOLUTION:** **Eliminate `is_paused`.**  
  Model pause strictly as a state machine transition: `status = 'paused'`. When a customer or staff unpauses, `status` returns to `'active'`.

---

### Conflict 3: Subscription Line Columns & Pricing Structure
- **Harsha Initial Implementation (`database/migrations/001_initial_schema.sql`):**  
  Defined `(product_id, variant_id, quantity, unit_price, tax_rate_percent, discount_percentage, amount)`.
- **Teammate Code Evidence:**  
  - Amarnadh's [backend/src/services/supabaseBillingRepository.cjs](file:///E:/Projects/Odoo-Team/backend/src/services/supabaseBillingRepository.cjs#L33) explicitly queries:  
    `.select('product_id,description,quantity,unit_price,variant_adjustment,tax_rate_percent')`.
  - Sanju's [billing/src/calculator.cjs](file:///E:/Projects/Odoo-Team/billing/src/calculator.cjs#L74) calculates line base as `quantity * (unitPrice + variantAdjustment)`.
  - Sanju's PR #15 migration [database/migrations/20261031_001_brightloop_core.sql](file:///E:/Projects/Odoo-Team/database/migrations/20261031_001_brightloop_core.sql#L117) defines `description, quantity, unit_price, variant_adjustment, tax_rate_percent`.
- **Architectural Trade-Off:**  
  Harsha's local schema stored a precalculated `amount` and a direct `discount_percentage` on lines. The team's tested billing engine calculates discounts centrally through `discount_rules` and computes tax on discounted bases to prevent rounding inaccuracies.
- **FINAL RESOLUTION:** Align strictly with `supabaseBillingRepository.cjs` and `calculator.cjs`:  
  - Columns: `product_id UUID NOT NULL REFERENCES products(id)`, `variant_id UUID REFERENCES product_variants(id)` (optional audit reference), `description TEXT NOT NULL`, `quantity INTEGER NOT NULL CHECK (quantity > 0)`, `unit_price NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0)`, `variant_adjustment NUMERIC(14,2) NOT NULL DEFAULT 0.00`, `tax_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (tax_rate_percent BETWEEN 0 AND 100)`.

---

### Conflict 4: Discount Rules and Product Scoping — `discount_rule_products` vs. `discount_product_mappings`
- **Harsha Initial Implementation (`database/migrations/001_initial_schema.sql`):**  
  Used table `discount_rule_products` with column `applies_to ('entire_subscription', 'specific_products')`.
- **Teammate Code Evidence:**  
  - Amarnadh's [backend/src/services/supabaseBillingRepository.cjs](file:///E:/Projects/Odoo-Team/backend/src/services/supabaseBillingRepository.cjs#L37) explicitly queries:  
    `client.from('discount_rules').select('id,kind,value,scope,min_amount,min_quantity,valid_from,valid_until,max_uses,used_count')` and  
    `client.from('discount_product_mappings').select('discount_rule_id,product_id')`.
  - Sanju's PR #15 migration defines `discount_rules` with `kind IN ('percentage','fixed')`, `scope IN ('subscription','product')`, and join table `discount_product_mappings`.
- **Architectural Trade-Off:**  
  Mismatched table and column names (`applies_to` vs `scope`, `discount_rule_products` vs `discount_product_mappings`) cause queries in `supabaseBillingRepository.cjs` to throw exceptions.
- **FINAL RESOLUTION:** Standardize on **`discount_rules`** and **`discount_product_mappings`**:  
  - `discount_rules`: `id UUID PK`, `name TEXT NOT NULL`, `kind TEXT NOT NULL CHECK (kind IN ('percentage', 'fixed'))`, `value NUMERIC(14,2) NOT NULL CHECK (value > 0)`, `scope TEXT NOT NULL CHECK (scope IN ('subscription', 'product'))`, `min_amount NUMERIC(14,2)`, `min_quantity INTEGER`, `valid_from DATE`, `valid_until DATE`, `max_uses INTEGER`, `used_count INTEGER NOT NULL DEFAULT 0`.  
  - `discount_product_mappings`: `(discount_rule_id UUID REFERENCES discount_rules(id) ON DELETE CASCADE, product_id UUID REFERENCES products(id) ON DELETE CASCADE, PRIMARY KEY (discount_rule_id, product_id))`.

---

### Conflict 5: Plan-Product Relationship — `plan_products` Join Table vs. Direct FK `plans.product_id`
- **Harsha Initial Implementation (`database/migrations/001_initial_schema.sql`):**  
  Created an intermediary many-to-many join table `plan_products (plan_id, product_id, is_primary)`.
- **Teammate Code Evidence:**  
  - Amarnadh's [backend/API_CONTRACT_PROPOSAL.md](file:///E:/Projects/Odoo-Team/backend/API_CONTRACT_PROPOSAL.md#L73) accepts `product_id` in `POST /api/v1/plans`.
  - Sanju's PR #15 migration [database/migrations/20261031_001_brightloop_core.sql](file:///E:/Projects/Odoo-Team/database/migrations/20261031_001_brightloop_core.sql#L72) defines `plans.product_id uuid not null references public.products(id)`.
  - Problem Statement Page 3: "Brightloop is launching a new product... Then comes the plan: what it costs and how often it bills...".
- **Architectural Trade-Off:**  
  A plan in SaaS represents the billing terms for a primary product. Introducing a join table complicates queries for zero functional gain, as add-ons are added as separate `subscription_lines`.
- **FINAL RESOLUTION:** Use direct foreign key **`plans.product_id REFERENCES public.products(id)`**.

---

### Conflict 6: User Role Management & PostgreSQL RLS Synchronization
- **Harsha Initial Implementation (`database/migrations/003_rls_policies.sql` & `005_auth_trigger.sql`):**  
  Used `fn_handle_new_user()` reading `raw_app_meta_data->>'role'`, but lacked an update trigger listening to changes made on `auth.users` by external admin APIs.
- **Teammate Code Evidence:**  
  - Amarnadh's [backend/src/services/roleStore.js](file:///E:/Projects/Odoo-Team/backend/src/services/roleStore.js#L26) updates user roles via:  
    `await supabaseAdmin.auth.admin.updateUserById(userId, { app_metadata: { role } })`.
  - Sanju's PR #15 migration [database/migrations/20261031_001_brightloop_core.sql](file:///E:/Projects/Odoo-Team/database/migrations/20261031_001_brightloop_core.sql#L37) creates a dedicated trigger:  
    `create trigger brightloop_auth_role_metadata_changed after update of raw_app_meta_data on auth.users for each row execute function public.sync_brightloop_profile_role();`.
- **Architectural Trade-Off:**  
  If `auth.users.raw_app_meta_data` changes when an admin promotes a user to staff, but `profiles.role` does not update, PostgreSQL RLS policies will still evaluate the user as `'customer'`, causing 403 Forbidden errors.
- **FINAL RESOLUTION:** Implement two-way synchronization:  
  1. Trigger on `auth.users` insert creates profile with role `'customer'`.  
  2. Trigger `brightloop_auth_role_metadata_changed` on `raw_app_meta_data` update mirrors the server-assigned role into `public.profiles.role`.  
  3. Trigger `fn_prevent_role_escalation()` on `public.profiles` blocks any direct client update to `profiles.role`.  
  4. Non-recursive definer function `is_brightloop_staff()` evaluates staff/admin permissions securely.

---

### Conflict 7: Billing Division of Labor — Internal SQL Generator vs. Deterministic RPC
- **Harsha Initial Implementation (`database/migrations/002_constraints_and_functions.sql`):**  
  Authored `fn_generate_due_invoice(p_subscription_id, p_billing_date)` which computed line sums, taxes, and discounts entirely inside PL/pgSQL.
- **Teammate Code Evidence:**  
  - Sanju built a deterministic financial engine in Node.js [billing/src/calculator.cjs](file:///E:/Projects/Odoo-Team/billing/src/calculator.cjs) with 16 unit tests covering exact minor units, calendar edge cases, and tax modes.
  - Amarnadh's [backend/src/services/supabaseBillingRepository.cjs](file:///E:/Projects/Odoo-Team/backend/src/services/supabaseBillingRepository.cjs#L60) calls:  
    `client.rpc('persist_due_billing_invoice', { p_subscription_id, p_expected_date, p_next_date, p_due_date, p_subtotal, p_tax_total, p_discount_total, p_total, p_lines, p_discounts })`.
  - Sanju's PR #15 migration provides the exact `persist_due_billing_invoice` PL/pgSQL function.
- **Architectural Trade-Off:**  
  Having two independent calculation engines (one in Node.js and one in PL/pgSQL) guarantees financial discrepancies, rounding mismatches, and double-maintenance.
- **FINAL RESOLUTION:** **Adopt `persist_due_billing_invoice` RPC.**  
  Node.js remains the sole financial calculator. PostgreSQL acts as the atomic transactional persistence layer: taking row-level locks, verifying line totals match the snapshot, enforcing billing period uniqueness, updating discount usage counters, and advancing `next_billing_date`.

---

### Conflict 8: AI Assistance Event Persistence
- **Harsha Initial Implementation:** No AI tables existed in local migrations.
- **Sanju's AI Architecture Requirements:** Customer assistant and assistance call workflow require tracking customer consent, phone, confirmed activation trigger, idempotency, call lifecycle status, retries, timestamps, provider IDs, and outcomes.
- **FINAL RESOLUTION:** Add **`public.ai_assistance_events`** as a first-class relational table in the migration suite, fully protected by RLS and foreign key constraints.

