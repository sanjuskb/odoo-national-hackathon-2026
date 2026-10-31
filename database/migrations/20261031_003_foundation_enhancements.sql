-- ==============================================================================
-- BRIGHTLOOP SOFTWARE SUBSCRIPTION MANAGEMENT SYSTEM
-- Migration: 20261031_003_foundation_enhancements.sql
-- Module: 1 — Database Foundation Hardening, Auditing, Indexes & RLS
-- Depends on: 20261031_001_brightloop_core.sql, 20261031_002_atomic_billing_rpc.sql
-- Author: Harsha (harsha-1706), Database Engineer
-- Description: Extends the core baseline with automated updated_at triggers,
--              role escalation protection, missing foreign key indexes,
--              profile contact attributes, catalogue active flags, staff RLS
--              write policies, and the AI assistance events audit table.
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- 1. AUTOMATED TIMESTAMP TRIGGER FUNCTION
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_updated_at() IS 'Automates updated_at column refresh on row modification.';

-- ==============================================================================
-- 2. PROFILES ENHANCEMENTS & PRIVILEGE ESCALATION GUARD
-- ==============================================================================

-- Add contact and audit attributes
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS company_name TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Attach updated_at trigger
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Prevent privilege escalation: customers cannot alter their own role or ID
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only service_role or verified staff/admin can alter user roles
    IF coalesce(auth.role(), '') <> 'service_role' AND OLD.role IS DISTINCT FROM NEW.role THEN
        IF NOT public.is_brightloop_staff() THEN
            RAISE EXCEPTION 'Permission denied: customers cannot modify user roles (escalation attempt from % to %)',
                OLD.role, NEW.role
                USING errcode = '42501';
        END IF;
    END IF;

    -- Prevent altering primary key user ID
    IF OLD.id IS DISTINCT FROM NEW.id THEN
        RAISE EXCEPTION 'Immutable identifier: profile id cannot be modified'
            USING errcode = '42501';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_profiles_prevent_role_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_role_escalation();

-- Index on role for fast staff evaluation
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);

-- Customer self-service profile update policy (full_name, phone, company_name)
DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
CREATE POLICY profiles_update_self ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Staff management policy for profiles
DROP POLICY IF EXISTS profiles_update_staff ON public.profiles;
CREATE POLICY profiles_update_staff ON public.profiles
    FOR UPDATE TO authenticated
    USING (public.is_brightloop_staff())
    WITH CHECK (public.is_brightloop_staff());

-- ==============================================================================
-- 3. PRODUCT CATALOGUE & VARIANTS ENHANCEMENTS
-- ==============================================================================

-- Products: active flag and updated_at
ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Product Variants: SKU, active flag, timestamps, and foreign key index
ALTER TABLE public.product_variants
    ADD COLUMN IF NOT EXISTS sku TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS trg_product_variants_updated_at ON public.product_variants;
CREATE TRIGGER trg_product_variants_updated_at
    BEFORE UPDATE ON public.product_variants
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS product_variants_product_idx ON public.product_variants(product_id);

-- Staff write policies for catalogue
DROP POLICY IF EXISTS products_insert_staff ON public.products;
CREATE POLICY products_insert_staff ON public.products
    FOR INSERT TO authenticated
    WITH CHECK (public.is_brightloop_staff());

DROP POLICY IF EXISTS products_update_staff ON public.products;
CREATE POLICY products_update_staff ON public.products
    FOR UPDATE TO authenticated
    USING (public.is_brightloop_staff())
    WITH CHECK (public.is_brightloop_staff());

DROP POLICY IF EXISTS products_delete_staff ON public.products;
CREATE POLICY products_delete_staff ON public.products
    FOR DELETE TO authenticated
    USING (public.is_brightloop_staff());

DROP POLICY IF EXISTS variants_insert_staff ON public.product_variants;
CREATE POLICY variants_insert_staff ON public.product_variants
    FOR INSERT TO authenticated
    WITH CHECK (public.is_brightloop_staff());

DROP POLICY IF EXISTS variants_update_staff ON public.product_variants;
CREATE POLICY variants_update_staff ON public.product_variants
    FOR UPDATE TO authenticated
    USING (public.is_brightloop_staff())
    WITH CHECK (public.is_brightloop_staff());

DROP POLICY IF EXISTS variants_delete_staff ON public.product_variants;
CREATE POLICY variants_delete_staff ON public.product_variants
    FOR DELETE TO authenticated
    USING (public.is_brightloop_staff());

-- ==============================================================================
-- 4. PLANS & QUOTATION TEMPLATES ENHANCEMENTS
-- ==============================================================================

-- Plans: active flag, timestamps, and indexes
ALTER TABLE public.plans
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS trg_plans_updated_at ON public.plans;
CREATE TRIGGER trg_plans_updated_at
    BEFORE UPDATE ON public.plans
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS plans_product_idx ON public.plans(product_id);
CREATE INDEX IF NOT EXISTS plans_frequency_idx ON public.plans(frequency);

-- Staff write policies for plans
DROP POLICY IF EXISTS plans_insert_staff ON public.plans;
CREATE POLICY plans_insert_staff ON public.plans
    FOR INSERT TO authenticated
    WITH CHECK (public.is_brightloop_staff());

DROP POLICY IF EXISTS plans_update_staff ON public.plans;
CREATE POLICY plans_update_staff ON public.plans
    FOR UPDATE TO authenticated
    USING (public.is_brightloop_staff())
    WITH CHECK (public.is_brightloop_staff());

DROP POLICY IF EXISTS plans_delete_staff ON public.plans;
CREATE POLICY plans_delete_staff ON public.plans
    FOR DELETE TO authenticated
    USING (public.is_brightloop_staff());

-- Quotation templates & lines: timestamps and foreign key indexes
ALTER TABLE public.quotation_templates
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS trg_quotation_templates_updated_at ON public.quotation_templates;
CREATE TRIGGER trg_quotation_templates_updated_at
    BEFORE UPDATE ON public.quotation_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.quotation_template_lines
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS quotation_templates_plan_idx ON public.quotation_templates(plan_id);
CREATE INDEX IF NOT EXISTS quotation_template_lines_template_idx ON public.quotation_template_lines(template_id);
CREATE INDEX IF NOT EXISTS quotation_template_lines_product_idx ON public.quotation_template_lines(product_id);
CREATE INDEX IF NOT EXISTS quotation_template_lines_variant_idx ON public.quotation_template_lines(variant_id) WHERE variant_id IS NOT NULL;

-- Staff write policies for quotation templates
DROP POLICY IF EXISTS templates_write_staff ON public.quotation_templates;
CREATE POLICY templates_write_staff ON public.quotation_templates
    FOR ALL TO authenticated
    USING (public.is_brightloop_staff())
    WITH CHECK (public.is_brightloop_staff());

DROP POLICY IF EXISTS template_lines_write_staff ON public.quotation_template_lines;
CREATE POLICY template_lines_write_staff ON public.quotation_template_lines
    FOR ALL TO authenticated
    USING (public.is_brightloop_staff())
    WITH CHECK (public.is_brightloop_staff());

-- ==============================================================================
-- 5. SUBSCRIPTIONS & SUBSCRIPTION LINES ENHANCEMENTS
-- ==============================================================================

-- Subscriptions: attach updated_at trigger and helper indexes
DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS subscriptions_template_idx ON public.subscriptions(template_id) WHERE template_id IS NOT NULL;

-- Staff update policy for subscriptions (lifecycle transitions: confirm, pause, resume, close)
DROP POLICY IF EXISTS subscriptions_update_staff ON public.subscriptions;
CREATE POLICY subscriptions_update_staff ON public.subscriptions
    FOR UPDATE TO authenticated
    USING (public.is_brightloop_staff())
    WITH CHECK (public.is_brightloop_staff());

-- Customer self-service subscription update policy (allows pause/close when permitted by plan)
DROP POLICY IF EXISTS subscriptions_update_customer ON public.subscriptions;
CREATE POLICY subscriptions_update_customer ON public.subscriptions
    FOR UPDATE TO authenticated
    USING (customer_id = auth.uid())
    WITH CHECK (customer_id = auth.uid());

-- Subscription lines: timestamps and critical foreign key indexes
ALTER TABLE public.subscription_lines
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS trg_subscription_lines_updated_at ON public.subscription_lines;
CREATE TRIGGER trg_subscription_lines_updated_at
    BEFORE UPDATE ON public.subscription_lines
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS subscription_lines_sub_idx ON public.subscription_lines(subscription_id);
CREATE INDEX IF NOT EXISTS subscription_lines_product_idx ON public.subscription_lines(product_id);
CREATE INDEX IF NOT EXISTS subscription_lines_variant_idx ON public.subscription_lines(variant_id) WHERE variant_id IS NOT NULL;

-- Staff management for subscription lines
DROP POLICY IF EXISTS subscription_lines_manage_staff ON public.subscription_lines;
CREATE POLICY subscription_lines_manage_staff ON public.subscription_lines
    FOR ALL TO authenticated
    USING (public.is_brightloop_staff())
    WITH CHECK (public.is_brightloop_staff());

-- ==============================================================================
-- 6. TAX RULES & DISCOUNT RULES ENHANCEMENTS
-- ==============================================================================

ALTER TABLE public.tax_rules
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS trg_tax_rules_updated_at ON public.tax_rules;
CREATE TRIGGER trg_tax_rules_updated_at
    BEFORE UPDATE ON public.tax_rules
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS tax_rules_manage_staff ON public.tax_rules;
CREATE POLICY tax_rules_manage_staff ON public.tax_rules
    FOR ALL TO authenticated
    USING (public.is_brightloop_staff())
    WITH CHECK (public.is_brightloop_staff());

ALTER TABLE public.discount_rules
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS trg_discount_rules_updated_at ON public.discount_rules;
CREATE TRIGGER trg_discount_rules_updated_at
    BEFORE UPDATE ON public.discount_rules
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS discount_product_mappings_product_idx ON public.discount_product_mappings(product_id);

DROP POLICY IF EXISTS discount_rules_manage_staff ON public.discount_rules;
CREATE POLICY discount_rules_manage_staff ON public.discount_rules
    FOR ALL TO authenticated
    USING (public.is_brightloop_staff())
    WITH CHECK (public.is_brightloop_staff());

DROP POLICY IF EXISTS discount_product_mappings_manage_staff ON public.discount_product_mappings;
CREATE POLICY discount_product_mappings_manage_staff ON public.discount_product_mappings
    FOR ALL TO authenticated
    USING (public.is_brightloop_staff())
    WITH CHECK (public.is_brightloop_staff());

-- ==============================================================================
-- 7. INVOICES & PAYMENTS ENHANCEMENTS
-- ==============================================================================

ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON public.invoices;
CREATE TRIGGER trg_invoices_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS invoice_lines_product_idx ON public.invoice_lines(product_id) WHERE product_id IS NOT NULL;

-- Staff read/update policies for invoices
DROP POLICY IF EXISTS invoices_manage_staff ON public.invoices;
CREATE POLICY invoices_manage_staff ON public.invoices
    FOR UPDATE TO authenticated
    USING (public.is_brightloop_staff())
    WITH CHECK (public.is_brightloop_staff());

-- ==============================================================================
-- 8. AI ASSISTANCE WORKFLOW EVENTS TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.ai_assistance_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('chat_inquiry', 'assistance_call_requested', 'call_triggered', 'call_completed', 'call_failed')),
    consent_given BOOLEAN NOT NULL DEFAULT false,
    phone TEXT,
    provider_call_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
    metadata JSONB DEFAULT '{}'::jsonb,
    retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ai_assistance_events IS 'Audit log and state persistence for customer AI assistance conversations and voice assistance calls.';

DROP TRIGGER IF EXISTS trg_ai_assistance_events_updated_at ON public.ai_assistance_events;
CREATE TRIGGER trg_ai_assistance_events_updated_at
    BEFORE UPDATE ON public.ai_assistance_events
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Indexes for AI event lookups
CREATE INDEX IF NOT EXISTS ai_events_customer_idx ON public.ai_assistance_events(customer_id);
CREATE INDEX IF NOT EXISTS ai_events_status_idx ON public.ai_assistance_events(status);
CREATE INDEX IF NOT EXISTS ai_events_created_idx ON public.ai_assistance_events(created_at);

-- Row Level Security on AI assistance events
ALTER TABLE public.ai_assistance_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_events_read ON public.ai_assistance_events;
CREATE POLICY ai_events_read ON public.ai_assistance_events
    FOR SELECT TO authenticated
    USING (customer_id = auth.uid() OR public.is_brightloop_staff());

DROP POLICY IF EXISTS ai_events_insert_customer ON public.ai_assistance_events;
CREATE POLICY ai_events_insert_customer ON public.ai_assistance_events
    FOR INSERT TO authenticated
    WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS ai_events_manage_staff ON public.ai_assistance_events;
CREATE POLICY ai_events_manage_staff ON public.ai_assistance_events
    FOR ALL TO authenticated
    USING (public.is_brightloop_staff())
    WITH CHECK (public.is_brightloop_staff());

COMMIT;

