-- ==============================================================================
-- PROPOSED ALTERs - NOT APPLIED - for Harsha's review
-- Author: Amarnadh (dev_amar75), Backend Engineer
-- Reference Schema: database/schema/01_brightloop_schema.sql
-- Description: Proposed schema enhancements, column additions, indexes, and RPCs
--              identified during Phase 7b Backend Schema Reconciliation.
-- Status: PROPOSED ONLY — DO NOT APPLY WITHOUT HARSHA'S EXPLICIT REVIEW & APPROVAL.
-- ==============================================================================

-- ==============================================================================
-- PRIORITY 0 (P0) — FEATURE & PROBLEM STATEMENT BLOCKERS
-- ==============================================================================

-- 1. Human-readable sequential Invoice Number on public.invoices
-- Problem: Official Odoo workflow and specifications require human-readable
-- sequential numbers (e.g., 'INV-2026-0001') for display, sending, and PDF generation.
-- Currently, public.invoices only contains UUID 'id'.
ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS invoice_number TEXT UNIQUE;

COMMENT ON COLUMN public.invoices.invoice_number IS 'Human-readable sequential invoice reference code (e.g. INV-2026-0001).';

-- 2. Invoice Sent Timestamp on public.invoices
-- Problem: The invoice send action (/api/v1/invoices/:id/send) records when an invoice
-- was officially dispatched to the customer.
ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.invoices.sent_at IS 'Timestamp when the invoice was communicated/sent to the customer.';

-- 3. Quotation Validity Expiration Date on public.subscriptions
-- Problem: Odoo subscription quotations require a 'Valid Until' expiration date
-- distinct from start_date / expiry_date.
ALTER TABLE public.subscriptions
    ADD COLUMN IF NOT EXISTS valid_until DATE;

COMMENT ON COLUMN public.subscriptions.valid_until IS 'Quotation expiration date before which quotation must be confirmed.';

-- 4. Foreign Key to tax_rules on public.subscription_lines
-- Problem: Lines store tax_rate_percent snapshot, but having the tax_id reference
-- preserves auditability and links back to the originating tax_rules record.
ALTER TABLE public.subscription_lines
    ADD COLUMN IF NOT EXISTS tax_id UUID REFERENCES public.tax_rules(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS subscription_lines_tax_idx ON public.subscription_lines(tax_id) WHERE tax_id IS NOT NULL;

-- 5. Active toggle on public.discount_rules
-- Problem: Marketing and sales teams need a quick boolean toggle to enable or disable
-- discounts immediately without altering valid_from / valid_until date spans.
ALTER TABLE public.discount_rules
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS discount_rules_active_idx ON public.discount_rules(is_active);

-- ==============================================================================
-- PRIORITY 1 (P1) — INTEGRITY, CONCURRENCY & PERFORMANCE ENHANCEMENTS
-- ==============================================================================

-- 6. Direct paid_at Timestamp on public.invoices
-- Problem: Improves query performance for paid invoice filtering without joining payments.
ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- 7. Audit Timestamps for payments and invoice_lines
ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.invoice_lines
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Apply updated_at trigger to payments
DROP TRIGGER IF EXISTS trg_payments_updated_at ON public.payments;
CREATE TRIGGER trg_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Apply updated_at trigger to invoice_lines
DROP TRIGGER IF EXISTS trg_invoice_lines_updated_at ON public.invoice_lines;
CREATE TRIGGER trg_invoice_lines_updated_at
    BEFORE UPDATE ON public.invoice_lines
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 8. Atomic Payment Ledger RPC
-- Problem: Prevents concurrent race conditions where two simultaneous payment requests
-- could overpay an invoice. Currently guarded by Node.js in-memory mutex withInvoiceLock.
CREATE OR REPLACE FUNCTION public.record_payment_atomic(
    p_invoice_id UUID,
    p_amount NUMERIC(14, 2),
    p_method TEXT,
    p_paid_at TIMESTAMPTZ,
    p_external_reference TEXT DEFAULT NULL,
    p_note TEXT DEFAULT NULL
)
RETURNS TABLE (
    result_payment_id UUID,
    result_invoice_status TEXT,
    result_balance_due NUMERIC(14, 2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_inv RECORD;
    v_total_paid NUMERIC(14, 2);
    v_new_paid NUMERIC(14, 2);
    v_balance NUMERIC(14, 2);
    v_new_status TEXT;
    v_pmt_id UUID;
BEGIN
    -- Lock target invoice row exclusively
    SELECT id, total, status INTO v_inv
    FROM public.invoices
    WHERE id = p_invoice_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice % not found', p_invoice_id USING ERRCODE = 'P0002';
    END IF;

    IF v_inv.status <> 'confirmed' THEN
        RAISE EXCEPTION 'Cannot record payment on invoice in status %', v_inv.status USING ERRCODE = '23514';
    END IF;

    -- Aggregate existing payments under lock
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
    FROM public.payments
    WHERE invoice_id = p_invoice_id;

    v_new_paid := v_total_paid + p_amount;
    IF v_new_paid > v_inv.total THEN
        RAISE EXCEPTION 'Payment of % exceeds remaining balance of %', p_amount, (v_inv.total - v_total_paid)
            USING ERRCODE = '23514';
    END IF;

    -- Insert payment record
    INSERT INTO public.payments (
        invoice_id, amount, method, paid_at, external_reference, note
    ) VALUES (
        p_invoice_id, p_amount, p_method, p_paid_at, p_external_reference, p_note
    ) RETURNING id INTO v_pmt_id;

    -- Transition status if paid in full
    v_balance := v_inv.total - v_new_paid;
    IF v_balance = 0 THEN
        v_new_status := 'paid';
        UPDATE public.invoices
        SET status = 'paid',
            paid_at = p_paid_at,
            updated_at = now()
        WHERE id = p_invoice_id;
    ELSE
        v_new_status := 'confirmed';
    END IF;

    RETURN QUERY SELECT v_pmt_id, v_new_status, v_balance;
END;
$$;

COMMENT ON FUNCTION public.record_payment_atomic IS 'Atomically inserts payment with overpayment lock and updates invoice status.';

-- 9. Finance Summary Report RPC
-- Problem: Sub-second finance dashboard aggregation without large row scans over network.
CREATE OR REPLACE FUNCTION public.get_finance_summary_report(
    p_from TIMESTAMPTZ DEFAULT NULL,
    p_to TIMESTAMPTZ DEFAULT NULL,
    p_customer_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_active_subs INTEGER;
    v_paused_subs INTEGER;
    v_invoiced_total NUMERIC(14, 2);
    v_collected_total NUMERIC(14, 2);
    v_outstanding_total NUMERIC(14, 2);
    v_overdue_total NUMERIC(14, 2);
    v_overdue_count INTEGER;
BEGIN
    -- Active / Paused Subscriptions
    SELECT
        COUNT(*) FILTER (WHERE status = 'active'),
        COUNT(*) FILTER (WHERE status = 'paused')
    INTO v_active_subs, v_paused_subs
    FROM public.subscriptions
    WHERE (p_customer_id IS NULL OR customer_id = p_customer_id);

    -- Invoiced Revenue
    SELECT COALESCE(SUM(total), 0)
    INTO v_invoiced_total
    FROM public.invoices
    WHERE status IN ('confirmed', 'paid')
      AND (p_customer_id IS NULL OR customer_id = p_customer_id)
      AND (p_from IS NULL OR created_at >= p_from)
      AND (p_to IS NULL OR created_at <= p_to);

    -- Collected Cash
    SELECT COALESCE(SUM(p.amount), 0)
    INTO v_collected_total
    FROM public.payments p
    JOIN public.invoices i ON p.invoice_id = i.id
    WHERE (p_customer_id IS NULL OR i.customer_id = p_customer_id)
      AND (p_from IS NULL OR p.paid_at >= p_from)
      AND (p_to IS NULL OR p.paid_at <= p_to);

    -- Outstanding & Overdue Balances
    WITH inv_balances AS (
        SELECT
            i.id,
            i.total,
            i.due_date,
            i.total - COALESCE(SUM(p.amount), 0) AS balance
        FROM public.invoices i
        LEFT JOIN public.payments p ON i.id = p.invoice_id
        WHERE i.status = 'confirmed'
          AND (p_customer_id IS NULL OR i.customer_id = p_customer_id)
        GROUP BY i.id, i.total, i.due_date
        HAVING (i.total - COALESCE(SUM(p.amount), 0)) > 0
    )
    SELECT
        COALESCE(SUM(balance), 0),
        COALESCE(SUM(balance) FILTER (WHERE due_date < CURRENT_DATE), 0),
        COUNT(*) FILTER (WHERE due_date < CURRENT_DATE)
    INTO v_outstanding_total, v_overdue_total, v_overdue_count
    FROM inv_balances;

    RETURN jsonb_build_object(
        'subscriptions', jsonb_build_object(
            'active', v_active_subs,
            'paused', v_paused_subs
        ),
        'invoiced_total', v_invoiced_total,
        'collected_total', v_collected_total,
        'outstanding_total', v_outstanding_total,
        'overdue_total', v_overdue_total,
        'overdue_count', v_overdue_count
    );
END;
$$;

COMMENT ON FUNCTION public.get_finance_summary_report IS 'Aggregates subscription and invoice financial summary in single database call.';

-- ==============================================================================
-- PRIORITY 2 (P2) — CONVENIENCE VIEWS & INDEX REFINEMENTS
-- ==============================================================================

-- 10. Composite Index for Payment Date Range Searches
CREATE INDEX IF NOT EXISTS payments_paid_at_idx ON public.payments(paid_at DESC);

-- 11. Overdue Invoices View
CREATE OR REPLACE VIEW public.v_overdue_invoices AS
SELECT
    i.id,
    i.subscription_id,
    i.customer_id,
    i.due_date,
    CURRENT_DATE - i.due_date AS days_overdue,
    i.total,
    COALESCE(SUM(p.amount), 0) AS paid_amount,
    i.total - COALESCE(SUM(p.amount), 0) AS balance_due
FROM public.invoices i
LEFT JOIN public.payments p ON i.id = p.invoice_id
WHERE i.status = 'confirmed'
  AND i.due_date < CURRENT_DATE
GROUP BY i.id, i.subscription_id, i.customer_id, i.due_date, i.total
HAVING (i.total - COALESCE(SUM(p.amount), 0)) > 0;

