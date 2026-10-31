# Team Handoff: Requirements from Backend for Harsha (DB) & Ravi (Frontend)

> **Context:** Brightloop Subscription Management System (Odoo National Hackathon 2026).
> **Backend State:** Phase 0 (Foundation) & Phase 1 (Auth & RBAC) complete and verified with 29 automated tests.
> **Backend Branch:** `feature/amarnath-backend-setup`

---

## ⏱️ Urgency: Do We Need It RIGHT NOW or Later?

Given the **5:00 PM IST deadline today** (~5 hours remaining), here is the realistic operational timeline:

### 1. From Harsha (Database)
- **Do we need it right now?**
  - **Profiles table:** **NO, NOT BLOCKING RIGHT NOW.** The backend currently uses Supabase Auth `app_metadata.role` as a working fallback. We can proceed to develop Phase 2 (Products/Plans) immediately using service-layer data interfaces and mocks.
  - **When do we strictly need Harsha's SQL migrations?**
    - **By 1:30 PM - 2:00 PM IST:** We need Harsha's database migrations merged into `develop` so we can replace mock persistence with real PostgreSQL queries before integration testing (Phase 5/6 billing engine).
    - **Crucial Rule:** Hand the prompt below to Harsha's agent **NOW** so Harsha can work in parallel on the database while we build Phase 2 backend logic.

### 2. From Ravi (Frontend)
- **Do we need it right now?**
  - **NO, Backend is not blocked by frontend.** The backend exposes REST APIs independently.
  - **Does Ravi need backend right now?**
    - **YES!** Ravi's frontend agent can immediately start wiring the Login, Registration, Forgot Password, and Staff Provisioning UI screens against the exact contract specifications documented below.

---

---

# SECTION 1: PROMPT FOR HARSHA'S AGENT (DATABASE)

*Copy and paste the text block below directly to Harsha or Harsha's AI Agent:*

```markdown
ROLE & TASK:
You are Harsha, Database Engineer for the Brightloop Subscription Management System. 
Create the SQL migrations and Supabase configuration files in `database/migrations/`.

SUPABASE PROJECT REFERENCE:
- Project ID / Ref: `bdmwwpfglltcpagwblmk`
- Region: `ap-southeast-2`
- URL: `https://bdmwwpfglltcpagwblmk.supabase.co`

1. IMMEDIATE MIGRATION: `001_profiles.sql`
Create the profiles table linked to Supabase auth.users:
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff', 'customer')) DEFAULT 'customer',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Customer reads own profile; admin/staff read all; server service role writes all
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Service role full access" ON public.profiles
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');
```

2. PHASE 2 MIGRATION: `002_products_and_plans.sql`
```sql
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'service',
  sales_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  cost_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_adjustment NUMERIC(12,2) NOT NULL DEFAULT 0.00, -- e.g. +560.00 for Odoo brand
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  price NUMERIC(12,2) NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  min_quantity INTEGER NOT NULL DEFAULT 1,
  available_from TIMESTAMPTZ,
  available_until TIMESTAMPTZ,
  auto_close BOOLEAN NOT NULL DEFAULT false,
  allow_early_close BOOLEAN NOT NULL DEFAULT true,
  allow_pause BOOLEAN NOT NULL DEFAULT true,
  allow_renew BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

3. CRITICAL BILLING INVARIANTS (For Phase 5):
- Table `invoices` MUST have: `CONSTRAINT uq_invoice_subscription_period UNIQUE (subscription_id, billing_period_start)`.
- RPC function `create_invoice_with_lines` to atomically generate invoice, record lines, deduct discount usage, and advance next billing date in ONE transaction.
- Indexes on:
  - `invoices(status, due_date)`
  - `subscriptions(status, next_billing_date)`
  - `subscriptions(customer_id)`
  - `invoices(customer_id)`
```

---

---

# SECTION 2: PROMPT FOR RAVI'S AGENT (FRONTEND)

*Copy and paste the text block below directly to Ravi or Ravi's AI Agent:*

```markdown
ROLE & TASK:
You are Ravi, Frontend Engineer for the Brightloop Subscription Management System.
The backend authentication and foundation APIs are fully built and tested at base path `/api/v1`.
CORS is configured for `http://localhost:5173`.

SUPABASE CLIENT CONNECTION (Frontend):
- VITE_SUPABASE_URL: `https://bdmwwpfglltcpagwblmk.supabase.co`
- VITE_SUPABASE_ANON_KEY: `<your-supabase-anon-key-from-env>`

INTEGRATION CONTRACT DETAILS:

1. Response Envelope:
All backend responses use this exact envelope:
{
  "success": true | false,
  "data": { ... } | null,
  "message": "Human readable message",
  "errors": [{ "field": "email", "issue": "reason" }] | null
}

2. Auth Header:
For all protected routes, include:
`Authorization: Bearer <access_token>`

3. Endpoints Ready to Connect:

A. Customer Registration:
- Method & Path: `POST /api/v1/auth/register`
- Request Body:
  {
    "email": "customer@example.com",
    "password": "Password123!",
    "full_name": "Customer Name"
  }
- Validation: Password MUST be >8 characters (minimum 9), containing at least 1 uppercase letter, 1 lowercase letter, and 1 special character.
- Success (201): returns `{ "user": { "id": "...", "email": "...", "full_name": "...", "role": "customer" } }`

B. User Login:
- Method & Path: `POST /api/v1/auth/login`
- Request Body:
  {
    "email": "customer@example.com",
    "password": "Password123!"
  }
- Success (200): returns:
  {
    "access_token": "...",
    "refresh_token": "...",
    "expires_at": 1730370000,
    "user": { "id": "...", "email": "...", "role": "customer" | "staff" | "admin" }
  }

C. Get Current Authenticated User:
- Method & Path: `GET /api/v1/auth/me`
- Headers: `Authorization: Bearer <access_token>`
- Success (200): returns `{ "id": "...", "email": "...", "role": "..." }`

D. Password Reset Link:
- Method & Path: `POST /api/v1/auth/forgot-password`
- Request Body: `{ "email": "customer@example.com" }`
- Success (200): returns message confirming email sent if registered.

E. Admin Add Staff:
- Method & Path: `POST /api/v1/staff` (or `POST /api/v1/admin/staff`)
- Headers: `Authorization: Bearer <admin_token>`
- Request Body: `{ "email": "staff@brightloop.local", "password": "StaffPassword123!", "full_name": "Staff Name" }`
- Success (201): returns `{ "user": { "id": "...", "email": "...", "role": "staff" } }`
```
