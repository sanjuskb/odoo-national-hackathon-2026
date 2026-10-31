# Database Optimization & Index Proposal for Finance Reports (Phase 6)

**Assigned Engineer Review:** Harsha (`harsha-1706`), Database Engineer  
**Submitted By:** Amarnath (`backend`), Backend Engineer  
**Date:** October 31, 2026  
**Status:** **PROPOSAL ONLY - NOT APPLIED** (Schema changes belong strictly to Harsha)

---

## 1. Executive Summary

In Phase 6, the backend implemented bounded-memory chunking (1,000 rows max per chunk) and batch payment loading ($\le 100$ IDs) as a temporary software fallback. To deliver native sub-100ms analytics and reporting across hundreds of thousands of subscriptions and invoices in production Supabase, the following indexes, views, and stored procedures are proposed for deployment by Harsha.

---

## 2. Recommended Indexes (PROPOSAL)

These B-tree indexes optimize report filters, overdue invoice detection, status counting, and payment reconciliation.

```sql
-- PROPOSAL: Invoices status and overdue queries
CREATE INDEX IF NOT EXISTS idx_invoices_status_due_date 
  ON public.invoices (status, due_date)
  WHERE status = 'confirmed';

-- PROPOSAL: Invoices customer isolation and filtering
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id 
  ON public.invoices (customer_id);

-- PROPOSAL: Invoices revenue invoiced date range filtering
CREATE INDEX IF NOT EXISTS idx_invoices_created_at 
  ON public.invoices (created_at)
  WHERE status IN ('confirmed', 'paid');

-- PROPOSAL: Subscriptions active billing loop
CREATE INDEX IF NOT EXISTS idx_subscriptions_status_next_billing 
  ON public.subscriptions (status, next_billing_date)
  WHERE status = 'active';

-- PROPOSAL: Subscriptions paused vs active counting
CREATE INDEX IF NOT EXISTS idx_subscriptions_status_is_paused 
  ON public.subscriptions (status, is_paused);

-- PROPOSAL: Payments invoice settlement and balance calculation
CREATE INDEX IF NOT EXISTS idx_payments_invoice_payment_date 
  ON public.payments (invoice_id, payment_date);

-- PROPOSAL: Payments revenue collected range and method filtering
CREATE INDEX IF NOT EXISTS idx_payments_date_method 
  ON public.payments (payment_date, method);
```

---

## 3. Recommended Analytical Stored Procedures / RPCs (PROPOSAL)

### A. Summary Aggregates RPC: `get_finance_summary_report`
Computes all financial summary metrics in a single database roundtrip with zero row serialization to Node.js:

```sql
-- PROPOSAL: Stored function for summary aggregation
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
  -- 1. Subscription Counts
  SELECT 
    COUNT(*) FILTER (WHERE status = 'active' AND is_paused = false),
    COUNT(*) FILTER (WHERE status = 'active' AND is_paused = true)
  INTO v_active_subs, v_paused_subs
  FROM public.subscriptions
  WHERE (p_customer_id IS NULL OR customer_id = p_customer_id)
    AND (p_plan_id IS NULL OR plan_id = p_plan_id);

  -- 2. Revenue Invoiced (confirmed & paid within date range)
  SELECT COALESCE(SUM(i.total), 0.00)
  INTO v_revenue_invoiced
  FROM public.invoices i
  LEFT JOIN public.subscriptions s ON s.id = i.subscription_id
  WHERE i.status IN ('confirmed', 'paid')
    AND (p_customer_id IS NULL OR i.customer_id = p_customer_id)
    AND (p_plan_id IS NULL OR s.plan_id = p_plan_id)
    AND (p_from IS NULL OR i.created_at >= (p_from::timestamp AT TIME ZONE 'UTC'))
    AND (p_to IS NULL OR i.created_at <= (p_to::timestamp + interval '1 day' - interval '1 millisecond'));

  -- 3. Revenue Collected (payments within date range)
  SELECT COALESCE(SUM(p.amount), 0.00)
  INTO v_revenue_collected
  FROM public.payments p
  LEFT JOIN public.invoices i ON i.id = p.invoice_id
  WHERE (p_customer_id IS NULL OR i.customer_id = p_customer_id)
    AND (p_from IS NULL OR p.payment_date >= p_from)
    AND (p_to IS NULL OR p.payment_date <= p_to);

  -- 4. Outstanding & Overdue (Confirmed invoices as of now)
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
```

---

## 4. Current Backend Fallback Notice

Until Harsha verifies and applies the above DDL in the official database workstream, the backend operates transparently using `src/repositories/reports.repository.js` with zero dependencies on unapplied RPCs or migrations.
