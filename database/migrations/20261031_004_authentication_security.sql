-- ==============================================================================
-- BRIGHTLOOP MIGRATION 004 — AUTHENTICATION, RBAC & SECURITY ENHANCEMENTS
-- ==============================================================================
-- Project Reference: bdmwwpfglltcpagwblmk (Odoo Hackathon, Sydney ap-southeast-2)
-- Author: Harsha (harsha-1706), Database Engineer
-- Target: develop
--
-- PURPOSE:
-- 1. Add `account_status` ('active', 'suspended') to public.profiles with check constraint.
-- 2. Harden `prevent_role_escalation()` to block unauthorized account_status self-reactivation.
-- 3. Enhance `create_customer_profile()` to be idempotent and honor server-assigned roles on creation.
-- 4. Enhance `sync_brightloop_profile_role()` to support account_status sync and email updates.
-- 5. Add `sync_brightloop_profile_email()` trigger on auth.users email changes.
-- 6. Add security definer helper `public.is_active_account()`.
-- 7. Update customer RLS policies to deny write operations when account is suspended.
-- 8. Backfill existing Auth users with 'active' account_status.
-- ==============================================================================

BEGIN;

-- 1. Add account_status column and index to public.profiles
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'profiles_account_status_check'
    ) THEN
        ALTER TABLE public.profiles
            ADD CONSTRAINT profiles_account_status_check
            CHECK (account_status IN ('active', 'suspended'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS profiles_status_idx ON public.profiles(account_status);

-- 2. Security Definer Helper: is_active_account()
CREATE OR REPLACE FUNCTION public.is_active_account()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.account_status = 'active'
    );
$$;

REVOKE ALL ON FUNCTION public.is_active_account() FROM public;
GRANT EXECUTE ON FUNCTION public.is_active_account() TO authenticated;

-- 3. Hardened Role Escalation & Account Status Guard
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 1. Prevent customer role escalation
    IF coalesce(auth.role(), '') <> 'service_role' AND OLD.role IS DISTINCT FROM NEW.role THEN
        IF NOT public.is_brightloop_staff() THEN
            RAISE EXCEPTION 'Permission denied: customers cannot modify user roles (escalation attempt from % to %)',
                OLD.role, NEW.role
                USING errcode = '42501';
        END IF;
    END IF;

    -- 2. Prevent customer account_status modification (self-reactivation)
    IF coalesce(auth.role(), '') <> 'service_role' AND OLD.account_status IS DISTINCT FROM NEW.account_status THEN
        IF NOT public.is_brightloop_staff() THEN
            RAISE EXCEPTION 'Permission denied: only staff or service_role can modify account_status'
                USING errcode = '42501';
        END IF;
    END IF;

    -- 3. Prevent primary key mutation
    IF OLD.id IS DISTINCT FROM NEW.id THEN
        RAISE EXCEPTION 'Immutable identifier: profile id cannot be modified'
            USING errcode = '42501';
    END IF;

    RETURN NEW;
END;
$$;

-- 4. Idempotent Profile Provisioning on User Creation
CREATE OR REPLACE FUNCTION public.create_customer_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_initial_role TEXT;
BEGIN
    IF NEW.email IS NULL THEN
        RAISE EXCEPTION 'Brightloop requires email registration';
    END IF;

    -- Honor staff/admin if provisioned through server-side Admin API; default to customer
    v_initial_role := NEW.raw_app_meta_data->>'role';
    IF v_initial_role NOT IN ('admin', 'staff', 'customer') OR v_initial_role IS NULL THEN
        v_initial_role := 'customer';
    END IF;

    INSERT INTO public.profiles (id, email, full_name, role, account_status)
    VALUES (
        NEW.id,
        lower(NEW.email),
        NEW.raw_user_meta_data->>'full_name',
        v_initial_role,
        'active'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = coalesce(EXCLUDED.full_name, public.profiles.full_name),
        role = CASE
            WHEN public.profiles.role = 'customer' AND EXCLUDED.role <> 'customer' THEN EXCLUDED.role
            ELSE public.profiles.role
        END,
        updated_at = now();

    RETURN NEW;
END;
$$;

-- 5. Metadata Role & Account Status Synchronization
CREATE OR REPLACE FUNCTION public.sync_brightloop_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role TEXT;
    v_status TEXT;
BEGIN
    v_role := NEW.raw_app_meta_data->>'role';
    IF v_role NOT IN ('admin', 'staff', 'customer') OR v_role IS NULL THEN
        v_role := 'customer';
    END IF;

    v_status := NEW.raw_app_meta_data->>'account_status';
    IF v_status NOT IN ('active', 'suspended') OR v_status IS NULL THEN
        v_status := NULL;
    END IF;

    UPDATE public.profiles
    SET role = v_role,
        account_status = coalesce(v_status, account_status),
        email = lower(NEW.email),
        updated_at = now()
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$;

-- 6. Dedicated Email Synchronization on auth.users Email Update
CREATE OR REPLACE FUNCTION public.sync_brightloop_profile_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.email IS DISTINCT FROM OLD.email THEN
        UPDATE public.profiles
        SET email = lower(NEW.email),
            updated_at = now()
        WHERE id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS brightloop_auth_email_changed ON auth.users;
CREATE TRIGGER brightloop_auth_email_changed
    AFTER UPDATE OF email ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_brightloop_profile_email();

-- 7. Account Status Enforcement across Customer RLS Policies

-- Profiles: Customer can update self only if account is active
DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
CREATE POLICY profiles_update_self ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid() AND account_status = 'active')
    WITH CHECK (id = auth.uid() AND account_status = 'active');

-- Subscriptions: Customer can update only if account is active
DROP POLICY IF EXISTS subscriptions_update_customer ON public.subscriptions;
CREATE POLICY subscriptions_update_customer ON public.subscriptions
    FOR UPDATE
    TO authenticated
    USING (customer_id = auth.uid() AND public.is_active_account())
    WITH CHECK (customer_id = auth.uid() AND public.is_active_account());

-- AI Events: Customer can create events only if account is active
DROP POLICY IF EXISTS ai_events_insert_customer ON public.ai_assistance_events;
CREATE POLICY ai_events_insert_customer ON public.ai_assistance_events
    FOR INSERT
    TO authenticated
    WITH CHECK (customer_id = auth.uid() AND public.is_active_account());

-- 8. Backfill existing Auth users into profiles
INSERT INTO public.profiles (id, email, full_name, role, account_status)
SELECT
    u.id,
    lower(u.email),
    u.raw_user_meta_data->>'full_name',
    CASE
        WHEN u.raw_app_meta_data->>'role' IN ('admin', 'staff', 'customer') THEN u.raw_app_meta_data->>'role'
        ELSE 'customer'
    END,
    'active'
FROM auth.users u
WHERE u.email IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
    account_status = coalesce(public.profiles.account_status, 'active'),
    email = lower(EXCLUDED.email);

COMMIT;
