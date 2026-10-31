-- ==============================================================================
-- BRIGHTLOOP SUBSCRIPTION MANAGEMENT SYSTEM — BACKEND SCHEMA DRAFT
-- Target: PostgreSQL 15+ / Supabase
-- Status: UNREVIEWED DRAFT FOR HARSHA REVIEW ONLY — NOT APPLIED TO ANY DATABASE
-- Submitted by: Amarnath (Backend Engineer)
-- Reference: backend/PROGRESS.md, backend/REPORTS_SQL_PROPOSAL.md
-- ==============================================================================

-- ==============================================================================
-- 1. PROFILES & AUTHENTICATION INTEGRATION
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

-- ==============================================================================
-- 2. PRODUCTS & PRODUCT VARIANTS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    base_price NUMERIC(12,2) NOT NULL CHECK (base_price >= 0),
    category TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sku TEXT UNIQUE,
    price_adjustment NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 3. PLANS & QUOTATION TEMPLATES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    billing_frequency TEXT NOT NULL CHECK (billing_frequency IN ('weekly', 'monthly', 'quarterly', 'yearly')),
    billing_interval INTEGER NOT NULL DEFAULT 1 CHECK (billing_interval > 0),
    trial_period_days INTEGER NOT NULL DEFAULT 0 CHECK (trial_period_days >= 0),
    auto_renew BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quotation_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    plan_id UUID NOT NULL REFERENCES public.plans(id),
    validity_days INTEGER NOT NULL CHECK (validity_days > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quotation_template_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.quotation_templates(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    variant_id UUID REFERENCES public.product_variants(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0)
);

-- ==============================================================================
-- 4. SUBSCRIPTIONS & SUBSCRIPTION LINES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_number TEXT NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES public.profiles(id),
    plan_id UUID NOT NULL REFERENCES public.plans(id),
    template_id UUID REFERENCES public.quotation_templates(id),
    start_date DATE NOT NULL,
    expiry_date DATE,
    valid_until DATE,
    payment_terms TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'quotation', 'confirmed', 'active', 'paused', 'closed')),
    is_paused BOOLEAN NOT NULL DEFAULT false,
    next_billing_date DATE,
    billing_anchor_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (expiry_date IS NULL OR expiry_date >= start_date),
    CHECK (next_billing_date IS NULL OR next_billing_date >= start_date)
);

CREATE TABLE IF NOT EXISTS public.subscription_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    variant_id UUID REFERENCES public.product_variants(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    description TEXT NOT NULL,
    unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    variant_adjustment NUMERIC(12,2) NOT NULL DEFAULT 0.00
);

-- ==============================================================================
-- 5. TAXES & DISCOUNTS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.tax_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    rate_percent NUMERIC(5,2) NOT NULL CHECK (rate_percent BETWEEN 0 AND 100),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.discount_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('fixed', 'percentage')),
    value NUMERIC(12,2) NOT NULL CHECK (value >= 0),
    scope TEXT NOT NULL CHECK (scope IN ('product', 'subscription')),
    min_amount NUMERIC(12,2) CHECK (min_amount >= 0),
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

CREATE TABLE IF NOT EXISTS public.discount_product_mappings (
    discount_rule_id UUID NOT NULL REFERENCES public.discount_rules(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    PRIMARY KEY (discount_rule_id, product_id)
);

-- ==============================================================================
-- 6. INVOICES, LINES, PAYMENTS, & REDEMPTIONS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES public.subscriptions(id),
    customer_id UUID NOT NULL REFERENCES public.profiles(id),
    billing_period_start DATE NOT NULL,
    billing_period_end_exclusive DATE NOT NULL,
    due_date DATE NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'paid', 'cancelled')),
    subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0),
    discount_total NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (discount_total >= 0),
    tax_total NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (tax_total >= 0),
    total NUMERIC(12,2) NOT NULL CHECK (total >= 0),
    sent_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (subscription_id, billing_period_start),
    CHECK (billing_period_end_exclusive > billing_period_start)
);

CREATE TABLE IF NOT EXISTS public.invoice_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id),
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    variant_adjustment NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    base_amount NUMERIC(12,2) NOT NULL CHECK (base_amount >= 0),
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    tax_percent NUMERIC(5,2) NOT NULL CHECK (tax_percent BETWEEN 0 AND 100),
    tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0),
    line_total NUMERIC(12,2) NOT NULL CHECK (line_total >= 0)
);

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id),
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    method TEXT NOT NULL CHECK (method IN ('cash', 'bank_transfer', 'upi', 'card', 'cheque', 'other')),
    paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    note TEXT,
    external_reference TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS payments_external_ref_unique 
    ON public.payments(invoice_id, external_reference) 
    WHERE external_reference IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.discount_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discount_rule_id UUID NOT NULL REFERENCES public.discount_rules(id),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    UNIQUE (discount_rule_id, invoice_id)
);

-- ==============================================================================
-- 7. PERFORMANCE INDEXES (From REPORTS_SQL_PROPOSAL.md)
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_invoices_status_due_date 
    ON public.invoices (status, due_date) WHERE status = 'confirmed';

CREATE INDEX IF NOT EXISTS idx_invoices_customer_id 
    ON public.invoices (customer_id);

CREATE INDEX IF NOT EXISTS idx_invoices_created_at 
    ON public.invoices (created_at) WHERE status IN ('confirmed', 'paid');

CREATE INDEX IF NOT EXISTS idx_subscriptions_status_next_billing 
    ON public.subscriptions (status, next_billing_date) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_subscriptions_status_is_paused 
    ON public.subscriptions (status, is_paused);

CREATE INDEX IF NOT EXISTS idx_payments_invoice_payment_date 
    ON public.payments (invoice_id, paid_at);

CREATE INDEX IF NOT EXISTS idx_payments_date_method 
    ON public.payments (paid_at, method);

-- ==============================================================================
-- 8. ANALYTICAL & ATOMIC STORED PROCEDURES (PROPOSAL)
-- ==============================================================================

-- Atomic Payment Ledger RPC
CREATE OR REPLACE FUNCTION public.record_payment_atomic(
    p_invoice_id UUID,
    p_amount NUMERIC(12,2),
    p_method TEXT,
    p_paid_at TIMESTAMPTZ DEFAULT now(),
    p_external_reference TEXT DEFAULT NULL,
    p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invoice RECORD;
    v_total_paid NUMERIC(12,2);
    v_balance_due NUMERIC(12,2);
    v_new_payment_id UUID;
    v_will_pay_in_full BOOLEAN;
BEGIN
    -- 1. Lock invoice row FOR UPDATE
    SELECT * INTO v_invoice 
    FROM public.invoices 
    WHERE id = p_invoice_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found' USING errcode = 'P0002';
    END IF;

    IF v_invoice.status <> 'confirmed' THEN
        RAISE EXCEPTION 'Cannot record payment on invoice with status %', v_invoice.status
            USING errcode = '22000';
    END IF;

    -- 2. Lock & aggregate existing payments
    SELECT COALESCE(SUM(amount), 0.00) INTO v_total_paid
    FROM public.payments
    WHERE invoice_id = p_invoice_id;

    v_balance_due := v_invoice.total - v_total_paid;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be positive' USING errcode = '22003';
    END IF;

    IF p_amount > v_balance_due THEN
        RAISE EXCEPTION 'Overpayment rejected: payment amount (%) exceeds outstanding balance (%)', p_amount, v_balance_due
            USING errcode = '22003';
    END IF;

    -- 3. Insert payment
    INSERT INTO public.payments (
        invoice_id, amount, method, paid_at, external_reference, note
    ) VALUES (
        p_invoice_id, p_amount, p_method, p_paid_at, p_external_reference, p_note
    ) RETURNING id INTO v_new_payment_id;

    v_will_pay_in_full := (p_amount = v_balance_due);

    -- 4. Transition invoice to paid if fully settled
    IF v_will_pay_in_full THEN
        UPDATE public.invoices
        SET status = 'paid', paid_at = p_paid_at, updated_at = now()
        WHERE id = p_invoice_id;
    END IF;

    RETURN jsonb_build_object(
        'payment_id', v_new_payment_id,
        'invoice_id', p_invoice_id,
        'amount', TO_CHAR(p_amount, 'FM999999990.00'),
        'will_pay_in_full', v_will_pay_in_full,
        'remaining_balance', TO_CHAR(v_balance_due - p_amount, 'FM999999990.00')
    );
END;
$$;

-- Analytical Summary Report RPC
CREATE OR REPLACE FUNCTION public.get_finance_summary_report(
    p_from DATE DEFAULT NULL,
    p_to DATE DEFAULT NULL,
    p_customer_id UUID DEFAULT NULL,
    p_plan_id UUID DEFAULT NULL,
    p_as_of DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_active_subs INT;
    v_paused_subs INT;
    v_revenue_invoiced NUMERIC(15,2);
    v_revenue_collected NUMERIC(15,2);
    v_outstanding NUMERIC(15,2);
    v_overdue_count INT;
    v_overdue_amount NUMERIC(15,2);
BEGIN
    -- Subscriptions counts
    SELECT 
        COUNT(*) FILTER (WHERE status = 'active' AND is_paused = false),
        COUNT(*) FILTER (WHERE status = 'active' AND is_paused = true)
    INTO v_active_subs, v_paused_subs
    FROM public.subscriptions
    WHERE (p_customer_id IS NULL OR customer_id = p_customer_id)
      AND (p_plan_id IS NULL OR plan_id = p_plan_id);

    -- Revenue Invoiced
    SELECT COALESCE(SUM(i.total), 0.00)
    INTO v_revenue_invoiced
    FROM public.invoices i
    LEFT JOIN public.subscriptions s ON s.id = i.subscription_id
    WHERE i.status IN ('confirmed', 'paid')
      AND (p_customer_id IS NULL OR i.customer_id = p_customer_id)
      AND (p_plan_id IS NULL OR s.plan_id = p_plan_id)
      AND (p_from IS NULL OR i.created_at >= (p_from::timestamp AT TIME ZONE 'UTC'))
      AND (p_to IS NULL OR i.created_at <= (p_to::timestamp + interval '1 day' - interval '1 millisecond'));

    -- Revenue Collected
    SELECT COALESCE(SUM(p.amount), 0.00)
    INTO v_revenue_collected
    FROM public.payments p
    LEFT JOIN public.invoices i ON i.id = p.invoice_id
    WHERE (p_customer_id IS NULL OR i.customer_id = p_customer_id)
      AND (p_from IS NULL OR p.paid_at::date >= p_from)
      AND (p_to IS NULL OR p.paid_at::date <= p_to);

    -- Outstanding & Overdue Balances
    WITH confirmed_balances AS (
        SELECT 
            i.id,
            i.due_date,
            i.total - COALESCE(SUM(p.amount), 0.00) AS balance_due
        FROM public.invoices i
        LEFT JOIN public.subscriptions s ON s.id = i.subscription_id
        LEFT JOIN public.payments p ON p.invoice_id = i.id
        WHERE i.status = 'confirmed'
          AND (p_customer_id IS NULL OR i.customer_id = p_customer_id)
          AND (p_plan_id IS NULL OR s.plan_id = p_plan_id)
        GROUP BY i.id, i.due_date, i.total
        HAVING (i.total - COALESCE(SUM(p.amount), 0.00)) > 0
    )
    SELECT 
        COALESCE(SUM(balance_due), 0.00),
        COUNT(*) FILTER (WHERE due_date < p_as_of),
        COALESCE(SUM(CASE WHEN due_date < p_as_of THEN balance_due ELSE 0.00 END), 0.00)
    INTO v_outstanding, v_overdue_count, v_overdue_amount
    FROM confirmed_balances;

    RETURN jsonb_build_object(
        'active_subscriptions', v_active_subs,
        'paused_subscriptions', v_paused_subs,
        'revenue_invoiced', TO_CHAR(v_revenue_invoiced, 'FM999999990.00'),
        'revenue_collected', TO_CHAR(v_revenue_collected, 'FM999999990.00'),
        'outstanding_balance', TO_CHAR(v_outstanding, 'FM999999990.00'),
        'overdue_count', v_overdue_count,
        'overdue_amount', TO_CHAR(v_overdue_amount, 'FM999999990.00'),
        'as_of', p_as_of
    );
END;
$$;
