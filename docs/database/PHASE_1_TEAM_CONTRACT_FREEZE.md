# Phase 1: Team Architectural Contract Freeze
## Brightloop Software Subscription Management System — Odoo National Level Hackathon 2026

**Author:** Harsha (`harsha-1706`), Database Engineer  
**Workspace:** `E:\Projects\Odoo-Team`  
**Status:** FROZEN FOR IMPLEMENTATION  
**Date:** 2026-10-31  

---

## 1. Authoritative Roles and Division of Engineering Responsibility

Based on the verified codebase on `develop`, the official Problem Statement, and PR #15 review:

1. **Financial Calculation Authority:**
   - **Node.js Billing Engine (`billing/src/calculator.cjs`, owned by Sanju)** is the sole financial calculation authority. All subtotal, discount, tax, and line total math is computed using minor-unit exact integer arithmetic and converted to exact two-decimal strings (`"99.00"`, `"560.00"`).
   - **PostgreSQL Rule:** The database **never** recalculates, invents, or alters financial ledger amounts. PostgreSQL acts as the **authoritative financial ledger and persistence verifier**: validating snapshot reconciliation, taking row-level locks, preventing duplicate period billing, updating redemption counters, and advancing billing cursors in a single atomic transaction.
2. **API & Orchestration Authority:**
   - **Express API (`backend/`, owned by Amarnadh)** is the trusted middleware layer. It enforces RBAC, authenticates tokens, manages user identities, loads database records using the Supabase Service Role key, invokes Sanju's billing runner, and handles payment recording.
3. **Database Architecture & Data Integrity Authority:**
   - **PostgreSQL / Supabase (`database/`, owned by Harsha)** enforces referential integrity, unique constraints, check constraints, Row Level Security (RLS) customer data isolation, audit triggers, and database-level concurrency control (`FOR UPDATE`).
4. **Presentation Authority:**
   - **React Frontend (`frontend/`, owned by Ravi)** renders the Customer Portal and Admin Dashboard using standard JSON envelopes from `/api/v1` endpoints. The browser client is strictly unprivileged.

---

## 2. Frozen Domain Entities and Contract Signatures

### 2.1 Identity, Profiles & Auth Role Synchronization
- **Primary Auth Source:** Supabase Auth (`auth.users`).
- **Server Role Authority:** Server writes authoritative role (`admin`, `staff`, `customer`) to `auth.users.raw_app_meta_data->>'role'` (Source: [backend/src/services/roleStore.js](file:///E:/Projects/Odoo-Team/backend/src/services/roleStore.js#L26)).
- **Database Projection:** `public.profiles` mirrored via PostgreSQL triggers:
  - Table: `public.profiles (id UUID PK REFERENCES auth.users(id) ON DELETE CASCADE, email TEXT UNIQUE NOT NULL, full_name TEXT, role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'staff', 'customer')), created_at TIMESTAMPTZ NOT NULL DEFAULT now())`.
  - Trigger 1 (`AFTER INSERT ON auth.users`): `create_customer_profile()` automatically creates profile with role `'customer'`.
  - Trigger 2 (`AFTER UPDATE OF raw_app_meta_data ON auth.users`): `sync_brightloop_profile_role()` updates `profiles.role` to match `new.raw_app_meta_data->>'role'`.
  - Trigger 3 (`BEFORE UPDATE ON public.profiles`): `fn_prevent_role_escalation()` strictly forbids client-initiated alterations to `profiles.role`.
- **Definer Helper Function:**
  ```sql
  CREATE OR REPLACE FUNCTION public.is_brightloop_staff()
  RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'));
  $$;
  ```

---

### 2.2 Product Catalogue & Variants
- **`public.products`:**
  - Columns: `id UUID PK DEFAULT gen_random_uuid()`, `name TEXT NOT NULL CHECK (length(trim(name)) > 0)`, `type TEXT NOT NULL`, `sales_price NUMERIC(14,2) NOT NULL CHECK (sales_price >= 0)`, `cost_price NUMERIC(14,2) NOT NULL CHECK (cost_price >= 0)`, `notes TEXT`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`.
  - Evidence: Problem Statement Page 3; [backend/API_CONTRACT_PROPOSAL.md](file:///E:/Projects/Odoo-Team/backend/API_CONTRACT_PROPOSAL.md).
- **`public.product_variants`:**
  - Columns: `id UUID PK DEFAULT gen_random_uuid()`, `product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE`, `name TEXT NOT NULL CHECK (length(trim(name)) > 0)`, `price_adjustment NUMERIC(14,2) NOT NULL DEFAULT 0.00`, `CONSTRAINT uq_product_variant_name UNIQUE (product_id, name)`.
  - Example: "Odoo Brand" variant adds +560.00 to sales price.

---

### 2.3 Subscription Plans
- **`public.plans`:**
  - Columns: `id UUID PK DEFAULT gen_random_uuid()`, `product_id UUID NOT NULL REFERENCES public.products(id)`, `name TEXT NOT NULL`, `price NUMERIC(14,2) NOT NULL CHECK (price >= 0)`, `currency CHAR(3) NOT NULL`, `frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly'))`, `min_quantity INTEGER NOT NULL DEFAULT 1 CHECK (min_quantity > 0)`, `available_from DATE`, `available_until DATE`, `auto_close BOOLEAN NOT NULL DEFAULT false`, `allow_early_close BOOLEAN NOT NULL DEFAULT false`, `allow_pause BOOLEAN NOT NULL DEFAULT false`, `allow_renew BOOLEAN NOT NULL DEFAULT false`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`.
  - Check constraint: `CHECK (available_until IS NULL OR available_from IS NULL OR available_until >= available_from)`.
  - Contract Decision: Direct `plans.product_id` FK is frozen. A plan belongs to a core subscription product. Add-on products are added via subscription lines.

---

### 2.4 Quotation Templates & Lines
- **`public.quotation_templates`:**
  - Columns: `id UUID PK DEFAULT gen_random_uuid()`, `name TEXT NOT NULL`, `plan_id UUID NOT NULL REFERENCES public.plans(id)`, `validity_days INTEGER NOT NULL CHECK (validity_days > 0)`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`.
- **`public.quotation_template_lines`:**
  - Columns: `id UUID PK DEFAULT gen_random_uuid()`, `template_id UUID NOT NULL REFERENCES public.quotation_templates(id) ON DELETE CASCADE`, `product_id UUID NOT NULL REFERENCES public.products(id)`, `variant_id UUID REFERENCES public.product_variants(id)`, `quantity INTEGER NOT NULL CHECK (quantity > 0)`.

---

### 2.5 Subscriptions & Lines
- **`public.subscriptions`:**
  - Columns: `id UUID PK DEFAULT gen_random_uuid()`, `subscription_number TEXT NOT NULL UNIQUE`, `customer_id UUID NOT NULL REFERENCES public.profiles(id)`, `plan_id UUID NOT NULL REFERENCES public.plans(id)`, `status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'quotation', 'confirmed', 'active', 'paused', 'closed'))`, `start_date DATE NOT NULL`, `expiry_date DATE`, `payment_terms TEXT`, `next_billing_date DATE NOT NULL`, `billing_anchor_date DATE`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`.
  - Contract Decision: Column is strictly **`status`** (NOT `state`). Pause is modeled strictly as **`status = 'paused'`** (eliminating redundant `is_paused` flag).
- **`public.subscription_lines`:**
  - Columns: `id UUID PK DEFAULT gen_random_uuid()`, `subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE`, `product_id UUID NOT NULL REFERENCES public.products(id)`, `variant_id UUID REFERENCES public.product_variants(id)`, `description TEXT NOT NULL`, `quantity INTEGER NOT NULL CHECK (quantity > 0)`, `unit_price NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0)`, `variant_adjustment NUMERIC(14,2) NOT NULL DEFAULT 0.00`, `tax_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (tax_rate_percent BETWEEN 0 AND 100)`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`.
  - Contract Decision: Exactly matches `supabaseBillingRepository.cjs` queries (`product_id, description, quantity, unit_price, variant_adjustment, tax_rate_percent`).

---

### 2.6 Tax Rules & Discounts
- **`public.tax_rules`:**
  - Columns: `id UUID PK DEFAULT gen_random_uuid()`, `name TEXT NOT NULL`, `rate_percent NUMERIC(5,2) NOT NULL CHECK (rate_percent BETWEEN 0 AND 100)`, `description TEXT`, `is_active BOOLEAN NOT NULL DEFAULT true`.
- **`public.discount_rules`:**
  - Columns: `id UUID PK DEFAULT gen_random_uuid()`, `name TEXT NOT NULL`, `kind TEXT NOT NULL CHECK (kind IN ('percentage', 'fixed'))`, `value NUMERIC(14,2) NOT NULL CHECK (value > 0)`, `scope TEXT NOT NULL CHECK (scope IN ('subscription', 'product'))`, `min_amount NUMERIC(14,2) CHECK (min_amount IS NULL OR min_amount >= 0)`, `min_quantity INTEGER CHECK (min_quantity IS NULL OR min_quantity > 0)`, `valid_from DATE`, `valid_until DATE`, `max_uses INTEGER CHECK (max_uses IS NULL OR max_uses > 0)`, `used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0)`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`.
- **`public.discount_product_mappings`:**
  - Columns: `discount_rule_id UUID NOT NULL REFERENCES public.discount_rules(id) ON DELETE CASCADE`, `product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE`, `PRIMARY KEY (discount_rule_id, product_id)`.

---

### 2.7 Invoices, Lines & Period Uniqueness Invariant
- **`public.invoices`:**
  - Columns: `id UUID PK DEFAULT gen_random_uuid()`, `invoice_number TEXT NOT NULL UNIQUE`, `subscription_id UUID NOT NULL REFERENCES public.subscriptions(id)`, `customer_id UUID NOT NULL REFERENCES public.profiles(id)`, `billing_period_start DATE NOT NULL`, `billing_period_end_exclusive DATE NOT NULL`, `due_date DATE NOT NULL`, `currency CHAR(3) NOT NULL`, `status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'paid', 'cancelled'))`, `subtotal NUMERIC(14,2) NOT NULL CHECK (subtotal >= 0)`, `discount_total NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (discount_total >= 0)`, `tax_total NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (tax_total >= 0)`, `total NUMERIC(14,2) NOT NULL CHECK (total >= 0)`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`.
  - **NON-NEGOTIABLE INVARIANT:**
    ```sql
    CONSTRAINT uq_subscription_billing_period UNIQUE (subscription_id, billing_period_start)
    ```
    Guarantees no subscription can ever be billed twice for the same billing period start date under any concurrent load.
- **`public.invoice_lines`:**
  - Columns: `id UUID PK DEFAULT gen_random_uuid()`, `invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE`, `product_id UUID NOT NULL REFERENCES public.products(id)`, `description TEXT NOT NULL`, `quantity INTEGER NOT NULL CHECK (quantity > 0)`, `unit_price NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0)`, `variant_adjustment NUMERIC(14,2) NOT NULL DEFAULT 0.00`, `base_amount NUMERIC(14,2) NOT NULL CHECK (base_amount >= 0)`, `discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0)`, `tax_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00`, `tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0)`, `line_total NUMERIC(14,2) NOT NULL CHECK (line_total >= 0)`.
- **`public.discount_redemptions`:**
  - Columns: `id UUID PK DEFAULT gen_random_uuid()`, `discount_rule_id UUID NOT NULL REFERENCES public.discount_rules(id)`, `invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE`, `amount NUMERIC(14,2) NOT NULL CHECK (amount > 0)`, `redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `CONSTRAINT uq_discount_invoice_redemption UNIQUE (discount_rule_id, invoice_id)`.

---

### 2.8 Payments & Reconciliation
- **`public.payments`:**
  - Columns: `id UUID PK DEFAULT gen_random_uuid()`, `invoice_id UUID NOT NULL REFERENCES public.invoices(id)`, `amount NUMERIC(14,2) NOT NULL CHECK (amount > 0)`, `method TEXT NOT NULL CHECK (method IN ('bank_transfer', 'credit_card', 'upi', 'cash', 'other'))`, `paid_at TIMESTAMPTZ NOT NULL`, `note TEXT`, `external_reference TEXT`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`.
  - Partial unique index: `CREATE UNIQUE INDEX uq_payments_external_ref ON public.payments(invoice_id, external_reference) WHERE external_reference IS NOT NULL;`.
  - Automatic Reconciliation Trigger: `fn_reconcile_payment()` advances `invoices.status = 'paid'` when cumulative payments equal or exceed invoice `total`.

---

### 2.9 Atomic Billing Persistence RPC Contract
- **Function Signature:**
  ```sql
  CREATE OR REPLACE FUNCTION public.persist_due_billing_invoice(
    p_subscription_id UUID,
    p_expected_date DATE,
    p_next_date DATE,
    p_due_date DATE,
    p_subtotal NUMERIC,
    p_tax_total NUMERIC,
    p_discount_total NUMERIC,
    p_total NUMERIC,
    p_lines JSONB,
    p_discounts JSONB DEFAULT '[]'::jsonb
  )
  RETURNS TABLE(result_status TEXT, result_invoice_id UUID)
  ```
- **Execution Rules:**
  1. Security: Strictly checks `auth.role() = 'service_role'`. Revoked from public, anon, and authenticated users.
  2. Locking: Locks subscription row via `SELECT * FROM subscriptions WHERE id = p_subscription_id FOR UPDATE;`.
  3. Cursor Check & Idempotency: If `next_billing_date <> p_expected_date`, checks if invoice already exists for `p_expected_date`; if yes, returns `('already-exists', existing_invoice_id)`.
  4. Discount Locks: Locks applied discount rules deterministically in UUID order via `ORDER BY (value->>'id') FOR UPDATE;` to prevent quota exhaustion races.
  5. Snapshot Reconciliation: Validates that line item sums match `p_subtotal`, `p_discount_total`, `p_tax_total`, and `p_total`.
  6. Atomicity: In a single transaction, inserts `invoices`, inserts all `invoice_lines`, increments `used_count` and inserts `discount_redemptions`, advances `subscriptions.next_billing_date = p_next_date`. Returns `('created', new_invoice_id)`.

---

### 2.10 AI Assistance Call Persistence
- **`public.ai_assistance_events`:**
  - Columns:
    - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
    - `customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE`
    - `subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE`
    - `idempotency_key TEXT NOT NULL UNIQUE` (e.g. `sub_act_<subscription_id>`)
    - `has_consented_ai_call BOOLEAN NOT NULL DEFAULT false`
    - `consent_recorded_at TIMESTAMPTZ`
    - `phone_number TEXT`
    - `preferred_call_window TEXT`
    - `status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'queued', 'in-progress', 'completed', 'failed', 'opted-out'))`
    - `retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0)`
    - `max_retries INTEGER NOT NULL DEFAULT 3 CHECK (max_retries > 0)`
    - `scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now()`
    - `initiated_at TIMESTAMPTZ`
    - `completed_at TIMESTAMPTZ`
    - `next_retry_at TIMESTAMPTZ`
    - `telephony_provider TEXT DEFAULT 'mock'`
    - `voice_provider TEXT DEFAULT 'murf'`
    - `provider_call_id TEXT`
    - `outcome_summary TEXT`
    - `transcript_url TEXT`
    - `error_message TEXT`
    - `opted_out_at TIMESTAMPTZ`
    - `opt_out_reason TEXT`
    - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
    - `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
  - RLS Policy:
    - Customer can read own records: `customer_id = auth.uid()`.
    - Internal staff can read/manage all events: `is_brightloop_staff()`.
    - Backend worker manages dispatch via Supabase Service Role key.

