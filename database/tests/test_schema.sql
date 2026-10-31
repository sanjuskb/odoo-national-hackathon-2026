-- ==============================================================================
-- Brightloop Software Subscription Management System
-- Test Suite: test_schema.sql
-- Description: Asserts existence and integrity of tables, constraints,
--              foreign keys, timestamps, and functions.
-- Author: Harsha (harsha-1706), Database Engineer
-- Status: Module 1 — Foundation Verification
-- ==============================================================================

DO $$
DECLARE
    v_missing_tables TEXT[] := ARRAY[]::TEXT[];
    v_table TEXT;
    v_expected_tables TEXT[] := ARRAY[
        'profiles', 'products', 'product_variants', 'plans',
        'quotation_templates', 'quotation_template_lines', 'subscriptions',
        'subscription_lines', 'tax_rules', 'discount_rules', 'discount_product_mappings',
        'invoices', 'invoice_lines', 'discount_redemptions', 'payments',
        'ai_assistance_events'
    ];
    v_uq_count INTEGER;
    v_fn_count INTEGER;
BEGIN
    RAISE NOTICE '=== TEST 1: Schema Table Verification ===';
    FOREACH v_table IN ARRAY v_expected_tables LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = v_table
        ) THEN
            v_missing_tables := array_append(v_missing_tables, v_table);
        END IF;
    END LOOP;

    IF array_length(v_missing_tables, 1) > 0 THEN
        RAISE EXCEPTION 'TEST FAILED: Missing tables: %', v_missing_tables;
    ELSE
        RAISE NOTICE 'TEST PASSED: All 16 core domain tables exist.';
    END IF;

    RAISE NOTICE '=== TEST 2: Unique Recurring Billing Period Invariant ===';
    SELECT COUNT(*) INTO v_uq_count
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'invoices'
      AND indexdef LIKE '%UNIQUE%'
      AND indexdef LIKE '%billing_period_start%'
      AND indexdef LIKE '%subscription_id%';

    IF v_uq_count = 0 THEN
        RAISE EXCEPTION 'TEST FAILED: Missing UNIQUE(subscription_id, billing_period_start) index on invoices table';
    ELSE
        RAISE NOTICE 'TEST PASSED: Recurring billing uniqueness invariant confirmed.';
    END IF;

    RAISE NOTICE '=== TEST 3: Core Domain Functions Verification ===';
    IF to_regprocedure('public.set_updated_at()') IS NULL THEN
        RAISE EXCEPTION 'TEST FAILED: Function public.set_updated_at() missing';
    END IF;
    IF to_regprocedure('public.is_brightloop_staff()') IS NULL THEN
        RAISE EXCEPTION 'TEST FAILED: Function public.is_brightloop_staff() missing';
    END IF;
    IF to_regprocedure('public.prevent_role_escalation()') IS NULL THEN
        RAISE EXCEPTION 'TEST FAILED: Function public.prevent_role_escalation() missing';
    END IF;
    IF to_regprocedure('public.persist_due_billing_invoice(uuid,date,date,date,numeric,numeric,numeric,numeric,jsonb,jsonb)') IS NULL THEN
        RAISE EXCEPTION 'TEST FAILED: Function public.persist_due_billing_invoice(...) missing';
    END IF;
    RAISE NOTICE 'TEST PASSED: All required PL/pgSQL procedures and triggers confirmed.';

    RAISE NOTICE '=== TEST 4: Row Level Security Invariant on Customer Tables ===';
    IF EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname IN ('profiles', 'subscriptions', 'subscription_lines', 'invoices', 'invoice_lines', 'payments', 'ai_assistance_events')
          AND NOT c.relrowsecurity
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: One or more customer-facing tables lack Row Level Security (RLS)';
    END IF;
    RAISE NOTICE 'TEST PASSED: RLS enabled on all customer-facing tables.';

    RAISE NOTICE '=== ALL MODULE 1 SCHEMA INTEGRITY ASSERTIONS PASSED ===';
END $$;
