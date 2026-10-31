-- ==============================================================================
-- BRIGHTLOOP SOFTWARE SUBSCRIPTION MANAGEMENT SYSTEM
-- CANONICAL CONSOLIDATED REFERENCE SCHEMA (DDL)
-- Target Engine: PostgreSQL 15+ / Supabase
-- Author: Harsha (harsha-1706), Database Engineer
-- Status: Module 1 — Canonical Architecture Baseline
-- Description: Complete consolidated reference schema containing all 15 domain
--              tables, integrity constraints, triggers, indexes, and RLS policies.
-- ==============================================================================

-- ==============================================================================
-- 1. EXTENSIONS
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. CORE UTILITY FUNCTIONS
-- ==============================================================================

-- Universal updated_at timestamp refresher
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- ==============================================================================
-- 3. PROFILES & AUTHENTICATION INTEGRATION
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'staff', 'customer')),
    phone TEXT,
    company_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger: auto-create customer profile on auth.users sign-up
CREATE OR REPLACE FUNCTION public.create_customer_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.email IS NULL THEN
        RAISE EXCEPTION 'Brightloop requires email registration';
    END IF;
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (NEW.id, lower(NEW.email), NEW.raw_user_meta_data->>'full_name', 'customer');
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS brightloop_auth_profile_created ON auth.users;
CREATE TRIGGER brightloop_auth_profile_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.create_customer_profile();

-- Trigger: synchronize server-controlled app_metadata role into profiles
CREATE OR REPLACE FUNCTION public.sync_brightloop_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role TEXT;
BEGIN
    v_role := NEW.raw_app_meta_data->>'role';
    IF v_role NOT IN ('admin', 'staff', 'customer') OR v_role IS NULL THEN
        v_role := 'customer';
    END IF;
    UPDATE public.profiles SET role = v_role WHERE id = NEW.id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS brightloop_auth_role_metadata_changed ON auth.users;
CREATE TRIGGER brightloop_auth_role_metadata_changed
    AFTER UPDATE OF raw_app_meta_data ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_brightloop_profile_role();

-- Staff verification function (security definer, avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_brightloop_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('admin', 'staff')
    );
$$;

REVOKE ALL ON FUNCTION public.is_brightloop_staff() FROM public;
GRANT EXECUTE ON FUNCTION public.is_brightloop_staff() TO authenticated;

-- Trigger: prevent privilege escalation (customers cannot modify role or id)
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF coalesce(auth.role(), '') <> 'service_role' AND OLD.role IS DISTINCT FROM NEW.role THEN
        IF NOT public.is_brightloop_staff() THEN
            RAISE EXCEPTION 'Permission denied: customers cannot modify user roles (escalation attempt from % to %)',
                OLD.role, NEW.role
                USING errcode = '42501';
        END IF;
    END IF;

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

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);

-- ==============================================================================
-- 4. PRODUCT CATALOGUE & VARIANTS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    type TEXT NOT NULL,
    sales_price NUMERIC(14, 2) NOT NULL CHECK (sales_price >= 0),
    cost_price NUMERIC(14, 2) NOT NULL CHECK (cost_price >= 0),
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    price_adjustment NUMERIC(14, 2) NOT NULL DEFAULT 0,
    sku TEXT UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(product_id, name)
);

DROP TRIGGER IF EXISTS trg_product_variants_updated_at ON public.product_variants;
CREATE TRIGGER trg_product_variants_updated_at
    BEFORE UPDATE ON public.product_variants
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS product_variants_product_idx ON public.product_variants(product_id);

-- ==============================================================================
-- 5. PLANS & QUOTATIONS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id),
    name TEXT NOT NULL,
    price NUMERIC(14, 2) NOT NULL CHECK (price >= 0),
    currency CHAR(3) NOT NULL,
    frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
    min_quantity INTEGER NOT NULL DEFAULT 1 CHECK (min_quantity > 0),
    available_from DATE,
    available_until DATE,
    auto_close BOOLEAN NOT NULL DEFAULT false,
    allow_early_close BOOLEAN NOT NULL DEFAULT false,
    allow_pause BOOLEAN NOT NULL DEFAULT false,
    allow_renew BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (available_until IS NULL OR available_from IS NULL OR available_until >= available_from)
);

DROP TRIGGER IF EXISTS trg_plans_updated_at ON public.plans;
CREATE TRIGGER trg_plans_updated_at
    BEFORE UPDATE ON public.plans
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS plans_product_idx ON public.plans(product_id);
CREATE INDEX IF NOT EXISTS plans_frequency_idx ON public.plans(frequency);

CREATE TABLE IF NOT EXISTS public.tax_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    rate_percent NUMERIC(5, 2) NOT NULL CHECK (rate_percent BETWEEN 0 AND 100),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_tax_rules_updated_at ON public.tax_rules;
CREATE TRIGGER trg_tax_rules_updated_at
    BEFORE UPDATE ON public.tax_rules
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.quotation_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    plan_id UUID NOT NULL REFERENCES public.plans(id),
    validity_days INTEGER NOT NULL CHECK (validity_days > 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_quotation_templates_updated_at ON public.quotation_templates;
CREATE TRIGGER trg_quotation_templates_updated_at
    BEFORE UPDATE ON public.quotation_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS quotation_templates_plan_idx ON public.quotation_templates(plan_id);

CREATE TABLE IF NOT EXISTS public.quotation_template_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.quotation_templates(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    variant_id UUID REFERENCES public.product_variants(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quotation_template_lines_template_idx ON public.quotation_template_lines(template_id);
CREATE INDEX IF NOT EXISTS quotation_template_lines_product_idx ON public.quotation_template_lines(product_id);
CREATE INDEX IF NOT EXISTS quotation_template_lines_variant_idx ON public.quotation_template_lines(variant_id) WHERE variant_id IS NOT NULL;

-- ==============================================================================
-- 6. SUBSCRIPTIONS & SUBSCRIPTION LINES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_number TEXT NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES public.profiles(id),
    plan_id UUID NOT NULL REFERENCES public.plans(id),
    template_id UUID REFERENCES public.quotation_templates(id),
    start_date DATE NOT NULL,
    expiry_date DATE,
    payment_terms TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'quotation', 'confirmed', 'active', 'paused', 'closed')),
    next_billing_date DATE,
    billing_anchor_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (expiry_date IS NULL OR expiry_date >= start_date),
    CHECK (next_billing_date IS NULL OR next_billing_date >= start_date)
);

DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS subscription_due_idx ON public.subscriptions(next_billing_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS subscriptions_customer_idx ON public.subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS subscriptions_plan_idx ON public.subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS subscriptions_template_idx ON public.subscriptions(template_id) WHERE template_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.subscription_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    variant_id UUID REFERENCES public.product_variants(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    description TEXT NOT NULL,
    unit_price NUMERIC(14, 2) NOT NULL CHECK (unit_price >= 0),
    variant_adjustment NUMERIC(14, 2) NOT NULL DEFAULT 0,
    tax_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (tax_rate_percent BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (unit_price + variant_adjustment >= 0)
);

DROP TRIGGER IF EXISTS trg_subscription_lines_updated_at ON public.subscription_lines;
CREATE TRIGGER trg_subscription_lines_updated_at
    BEFORE UPDATE ON public.subscription_lines
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS subscription_lines_sub_idx ON public.subscription_lines(subscription_id);
CREATE INDEX IF NOT EXISTS subscription_lines_product_idx ON public.subscription_lines(product_id);
CREATE INDEX IF NOT EXISTS subscription_lines_variant_idx ON public.subscription_lines(variant_id) WHERE variant_id IS NOT NULL;

-- ==============================================================================
-- 7. DISCOUNT RULES & PRODUCT MAPPINGS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.discount_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('fixed', 'percentage')),
    value NUMERIC(14, 2) NOT NULL CHECK (value >= 0),
    scope TEXT NOT NULL CHECK (scope IN ('product', 'subscription')),
    min_amount NUMERIC(14, 2) CHECK (min_amount >= 0),
    min_quantity INTEGER CHECK (min_quantity > 0),
    valid_from DATE,
    valid_until DATE,
    max_uses INTEGER CHECK (max_uses >= 0),
    used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until >= valid_from),
    CHECK (kind <> 'percentage' OR value <= 100),
    CHECK (max_uses IS NULL OR used_count <= max_uses)
);

DROP TRIGGER IF EXISTS trg_discount_rules_updated_at ON public.discount_rules;
CREATE TRIGGER trg_discount_rules_updated_at
    BEFORE UPDATE ON public.discount_rules
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.discount_product_mappings (
    discount_rule_id UUID NOT NULL REFERENCES public.discount_rules(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    PRIMARY KEY (discount_rule_id, product_id)
);

CREATE INDEX IF NOT EXISTS discount_product_mappings_product_idx ON public.discount_product_mappings(product_id);

-- ==============================================================================
-- 8. INVOICES, LINES & DISCOUNT REDEMPTIONS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES public.subscriptions(id),
    customer_id UUID NOT NULL REFERENCES public.profiles(id),
    billing_period_start DATE NOT NULL,
    billing_period_end_exclusive DATE NOT NULL,
    due_date DATE NOT NULL,
    currency CHAR(3) NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'paid', 'cancelled')),
    subtotal NUMERIC(14, 2) NOT NULL CHECK (subtotal >= 0),
    discount_total NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (discount_total >= 0),
    tax_total NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (tax_total >= 0),
    total NUMERIC(14, 2) NOT NULL CHECK (total >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (subscription_id, billing_period_start),
    CHECK (billing_period_end_exclusive > billing_period_start)
);

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON public.invoices;
CREATE TRIGGER trg_invoices_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS invoices_customer_idx ON public.invoices(customer_id);
CREATE INDEX IF NOT EXISTS invoices_due_status_idx ON public.invoices(due_date, status);

CREATE TABLE IF NOT EXISTS public.invoice_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id),
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(14, 2) NOT NULL CHECK (unit_price >= 0),
    variant_adjustment NUMERIC(14, 2) NOT NULL DEFAULT 0,
    base_amount NUMERIC(14, 2) NOT NULL CHECK (base_amount >= 0),
    discount_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    tax_percent NUMERIC(5, 2) NOT NULL CHECK (tax_percent BETWEEN 0 AND 100),
    tax_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    line_total NUMERIC(14, 2) NOT NULL CHECK (line_total >= 0)
);

CREATE INDEX IF NOT EXISTS invoice_lines_invoice_idx ON public.invoice_lines(invoice_id);
CREATE INDEX IF NOT EXISTS invoice_lines_product_idx ON public.invoice_lines(product_id) WHERE product_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.discount_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discount_rule_id UUID NOT NULL REFERENCES public.discount_rules(id),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
    UNIQUE (discount_rule_id, invoice_id)
);

CREATE INDEX IF NOT EXISTS discount_redemptions_invoice_idx ON public.discount_redemptions(invoice_id);

-- ==============================================================================
-- 9. PAYMENTS & RECONCILIATION
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id),
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    method TEXT NOT NULL,
    paid_at TIMESTAMPTZ NOT NULL,
    note TEXT,
    external_reference TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS payments_external_ref_unique ON public.payments(invoice_id, external_reference) WHERE external_reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS payments_invoice_idx ON public.payments(invoice_id);

-- ==============================================================================
-- 10. AI ASSISTANCE WORKFLOW EVENTS
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

DROP TRIGGER IF EXISTS trg_ai_assistance_events_updated_at ON public.ai_assistance_events;
CREATE TRIGGER trg_ai_assistance_events_updated_at
    BEFORE UPDATE ON public.ai_assistance_events
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS ai_events_customer_idx ON public.ai_assistance_events(customer_id);
CREATE INDEX IF NOT EXISTS ai_events_status_idx ON public.ai_assistance_events(status);
CREATE INDEX IF NOT EXISTS ai_events_created_idx ON public.ai_assistance_events(created_at);

-- ==============================================================================
-- 11. ROW LEVEL SECURITY (RLS) ZERO-TRUST CONFIGURATION
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_template_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_product_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_assistance_events ENABLE ROW LEVEL SECURITY;

-- Read policies
CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated
    USING (id = auth.uid() OR public.is_brightloop_staff());

CREATE POLICY products_read ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY variants_read ON public.product_variants FOR SELECT TO authenticated USING (true);
CREATE POLICY plans_read ON public.plans FOR SELECT TO authenticated USING (true);

CREATE POLICY taxes_read_internal ON public.tax_rules FOR SELECT TO authenticated USING (public.is_brightloop_staff());
CREATE POLICY templates_read_internal ON public.quotation_templates FOR SELECT TO authenticated USING (public.is_brightloop_staff());
CREATE POLICY template_lines_read_internal ON public.quotation_template_lines FOR SELECT TO authenticated USING (public.is_brightloop_staff());
CREATE POLICY discounts_read_internal ON public.discount_rules FOR SELECT TO authenticated USING (public.is_brightloop_staff());
CREATE POLICY discount_product_read_internal ON public.discount_product_mappings FOR SELECT TO authenticated USING (public.is_brightloop_staff());

CREATE POLICY subscription_read ON public.subscriptions FOR SELECT TO authenticated
    USING (customer_id = auth.uid() OR public.is_brightloop_staff());

CREATE POLICY subscription_lines_read ON public.subscription_lines FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.id = subscription_id AND (s.customer_id = auth.uid() OR public.is_brightloop_staff())));

CREATE POLICY invoices_read ON public.invoices FOR SELECT TO authenticated
    USING (customer_id = auth.uid() OR public.is_brightloop_staff());

CREATE POLICY invoice_lines_read ON public.invoice_lines FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND (i.customer_id = auth.uid() OR public.is_brightloop_staff())));

CREATE POLICY payments_read ON public.payments FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND (i.customer_id = auth.uid() OR public.is_brightloop_staff())));

CREATE POLICY discount_redemptions_read_internal ON public.discount_redemptions FOR SELECT TO authenticated
    USING (public.is_brightloop_staff());

CREATE POLICY ai_events_read ON public.ai_assistance_events FOR SELECT TO authenticated
    USING (customer_id = auth.uid() OR public.is_brightloop_staff());

-- Write & Update policies
CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE TO authenticated
    USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY profiles_update_staff ON public.profiles FOR UPDATE TO authenticated
    USING (public.is_brightloop_staff()) WITH CHECK (public.is_brightloop_staff());

CREATE POLICY products_insert_staff ON public.products FOR INSERT TO authenticated WITH CHECK (public.is_brightloop_staff());
CREATE POLICY products_update_staff ON public.products FOR UPDATE TO authenticated USING (public.is_brightloop_staff()) WITH CHECK (public.is_brightloop_staff());
CREATE POLICY products_delete_staff ON public.products FOR DELETE TO authenticated USING (public.is_brightloop_staff());

CREATE POLICY variants_insert_staff ON public.product_variants FOR INSERT TO authenticated WITH CHECK (public.is_brightloop_staff());
CREATE POLICY variants_update_staff ON public.product_variants FOR UPDATE TO authenticated USING (public.is_brightloop_staff()) WITH CHECK (public.is_brightloop_staff());
CREATE POLICY variants_delete_staff ON public.product_variants FOR DELETE TO authenticated USING (public.is_brightloop_staff());

CREATE POLICY plans_insert_staff ON public.plans FOR INSERT TO authenticated WITH CHECK (public.is_brightloop_staff());
CREATE POLICY plans_update_staff ON public.plans FOR UPDATE TO authenticated USING (public.is_brightloop_staff()) WITH CHECK (public.is_brightloop_staff());
CREATE POLICY plans_delete_staff ON public.plans FOR DELETE TO authenticated USING (public.is_brightloop_staff());

CREATE POLICY templates_write_staff ON public.quotation_templates FOR ALL TO authenticated USING (public.is_brightloop_staff()) WITH CHECK (public.is_brightloop_staff());
CREATE POLICY template_lines_write_staff ON public.quotation_template_lines FOR ALL TO authenticated USING (public.is_brightloop_staff()) WITH CHECK (public.is_brightloop_staff());

CREATE POLICY subscriptions_update_staff ON public.subscriptions FOR UPDATE TO authenticated USING (public.is_brightloop_staff()) WITH CHECK (public.is_brightloop_staff());
CREATE POLICY subscriptions_update_customer ON public.subscriptions FOR UPDATE TO authenticated USING (customer_id = auth.uid()) WITH CHECK (customer_id = auth.uid());

CREATE POLICY subscription_lines_manage_staff ON public.subscription_lines FOR ALL TO authenticated USING (public.is_brightloop_staff()) WITH CHECK (public.is_brightloop_staff());

CREATE POLICY tax_rules_manage_staff ON public.tax_rules FOR ALL TO authenticated USING (public.is_brightloop_staff()) WITH CHECK (public.is_brightloop_staff());
CREATE POLICY discount_rules_manage_staff ON public.discount_rules FOR ALL TO authenticated USING (public.is_brightloop_staff()) WITH CHECK (public.is_brightloop_staff());
CREATE POLICY discount_product_mappings_manage_staff ON public.discount_product_mappings FOR ALL TO authenticated USING (public.is_brightloop_staff()) WITH CHECK (public.is_brightloop_staff());

CREATE POLICY invoices_manage_staff ON public.invoices FOR UPDATE TO authenticated USING (public.is_brightloop_staff()) WITH CHECK (public.is_brightloop_staff());

CREATE POLICY ai_events_insert_customer ON public.ai_assistance_events FOR INSERT TO authenticated WITH CHECK (customer_id = auth.uid());
CREATE POLICY ai_events_manage_staff ON public.ai_assistance_events FOR ALL TO authenticated USING (public.is_brightloop_staff()) WITH CHECK (public.is_brightloop_staff());


-- ==============================================================================
-- 12. ATOMIC BILLING TRANSACTION PROCEDURES
-- ==============================================================================

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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sub public.subscriptions%rowtype;
    v_invoice_id UUID;
    v_existing_id UUID;
    v_line JSONB;
    v_discount JSONB;
    v_rule public.discount_rules%rowtype;
    v_amount NUMERIC;
    v_sum_total NUMERIC := 0;
    v_sum_base NUMERIC := 0;
    v_sum_discount NUMERIC := 0;
    v_sum_tax NUMERIC := 0;
BEGIN
    IF coalesce(auth.role(), '') <> 'service_role' THEN
        RAISE EXCEPTION 'Only trusted service_role may execute billing RPC' USING errcode = '42501';
    END IF;
    IF p_expected_date IS NULL OR p_next_date IS NULL OR p_next_date <= p_expected_date OR p_due_date IS NULL THEN
        RAISE EXCEPTION 'Invalid billing dates';
    END IF;
    IF p_subtotal IS NULL OR p_tax_total IS NULL OR p_discount_total IS NULL OR p_total IS NULL
       OR p_subtotal < 0 OR p_tax_total < 0 OR p_discount_total < 0 OR p_total < 0 THEN
        RAISE EXCEPTION 'Invalid invoice monetary totals';
    END IF;
    IF jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0
       OR jsonb_typeof(p_discounts) <> 'array' THEN
        RAISE EXCEPTION 'Invoice lines/discount redemptions must be JSON arrays';
    END IF;

    SELECT * INTO v_sub FROM public.subscriptions
    WHERE id = p_subscription_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Unknown subscription'; END IF;
    IF v_sub.status <> 'active' THEN RAISE EXCEPTION 'Subscription must be active'; END IF;
    IF v_sub.next_billing_date <> p_expected_date THEN
        SELECT id INTO v_existing_id FROM public.invoices
        WHERE subscription_id = p_subscription_id AND billing_period_start = p_expected_date;
        IF v_existing_id IS NOT NULL AND v_sub.next_billing_date > p_expected_date THEN
            RETURN QUERY SELECT 'already-exists'::TEXT, v_existing_id;
            RETURN;
        END IF;
        RAISE EXCEPTION 'Stale billing cursor or unsupported partial billing state';
    END IF;

    FOR v_line IN SELECT value FROM jsonb_array_elements(p_lines) AS item(value) LOOP
        IF (v_line->>'quantity')::integer <= 0
           OR (v_line->>'baseAmount')::numeric < 0
           OR (v_line->>'discountAmount')::numeric < 0
           OR (v_line->>'taxAmount')::numeric < 0
           OR (v_line->>'lineTotal')::numeric < 0 THEN
            RAISE EXCEPTION 'Invalid invoice line values';
        END IF;
        v_sum_total := v_sum_total + (v_line->>'lineTotal')::numeric;
        v_sum_base := v_sum_base + (v_line->>'baseAmount')::numeric;
        v_sum_discount := v_sum_discount + (v_line->>'discountAmount')::numeric;
        v_sum_tax := v_sum_tax + (v_line->>'taxAmount')::numeric;
    END LOOP;
    IF v_sum_total <> p_total OR v_sum_base <> p_subtotal
       OR v_sum_discount <> p_discount_total OR v_sum_tax <> p_tax_total THEN
        RAISE EXCEPTION 'Invoice snapshot totals do not reconcile';
    END IF;

    IF (SELECT count(*) FROM jsonb_array_elements(p_discounts))
       <> (SELECT count(DISTINCT value->>'id') FROM jsonb_array_elements(p_discounts) AS r(value)) THEN
        RAISE EXCEPTION 'Duplicate discount redemption IDs';
    END IF;
    IF coalesce((SELECT sum((value->>'amount')::numeric)
       FROM jsonb_array_elements(p_discounts) AS r(value)), 0) <> p_discount_total THEN
        RAISE EXCEPTION 'Discount redemptions do not reconcile to invoice total';
    END IF;

    FOR v_discount IN
        SELECT value FROM jsonb_array_elements(p_discounts) AS item(value)
        ORDER BY (value->>'id')
    LOOP
        SELECT * INTO v_rule FROM public.discount_rules
        WHERE id = (v_discount->>'id')::uuid FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION 'Unknown discount rule'; END IF;
        IF v_rule.max_uses IS NOT NULL AND v_rule.used_count >= v_rule.max_uses THEN
            RAISE EXCEPTION 'Discount usage cap exhausted';
        END IF;
        IF (v_discount->>'amount')::numeric <= 0 THEN RAISE EXCEPTION 'Invalid discount redemption amount'; END IF;
    END LOOP;

    INSERT INTO public.invoices (
        subscription_id, customer_id, billing_period_start, billing_period_end_exclusive,
        due_date, currency, status, subtotal, discount_total, tax_total, total
    )
    SELECT v_sub.id, v_sub.customer_id, p_expected_date, p_next_date, p_due_date,
           p.currency, 'draft', p_subtotal, p_discount_total, p_tax_total, p_total
    FROM public.plans p WHERE p.id = v_sub.plan_id
    RETURNING id INTO v_invoice_id;

    IF v_invoice_id IS NULL THEN RAISE EXCEPTION 'Subscription plan missing'; END IF;

    FOR v_line IN SELECT value FROM jsonb_array_elements(p_lines) AS item(value) LOOP
        INSERT INTO public.invoice_lines (
            invoice_id, product_id, description, quantity, unit_price, variant_adjustment,
            base_amount, discount_amount, tax_percent, tax_amount, line_total
        ) VALUES (
            v_invoice_id, (v_line->>'productId')::uuid, v_line->>'title',
            (v_line->>'quantity')::integer, (v_line->>'unitPrice')::numeric,
            (v_line->>'variantAdjustment')::numeric,
            (v_line->>'baseAmount')::numeric, (v_line->>'discountAmount')::numeric,
            (v_line->>'taxPercent')::numeric, (v_line->>'taxAmount')::numeric,
            (v_line->>'lineTotal')::numeric
        );
    END LOOP;

    FOR v_discount IN
        SELECT value FROM jsonb_array_elements(p_discounts) AS item(value)
        ORDER BY (value->>'id')
    LOOP
        v_amount := (v_discount->>'amount')::numeric;
        UPDATE public.discount_rules SET used_count = used_count + 1
        WHERE id = (v_discount->>'id')::uuid;
        INSERT INTO public.discount_redemptions (discount_rule_id, invoice_id, amount)
        VALUES ((v_discount->>'id')::uuid, v_invoice_id, v_amount);
    END LOOP;

    UPDATE public.subscriptions SET next_billing_date = p_next_date, updated_at = now()
    WHERE id = p_subscription_id AND next_billing_date = p_expected_date;
    IF NOT FOUND THEN RAISE EXCEPTION 'Billing cursor update failed'; END IF;

    RETURN QUERY SELECT 'created'::TEXT, v_invoice_id;
END;
$$;

REVOKE ALL ON FUNCTION public.persist_due_billing_invoice(uuid, date, date, date, numeric, numeric, numeric, numeric, jsonb, jsonb)
FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.persist_due_billing_invoice(uuid, date, date, date, numeric, numeric, numeric, numeric, jsonb, jsonb)
TO service_role;
