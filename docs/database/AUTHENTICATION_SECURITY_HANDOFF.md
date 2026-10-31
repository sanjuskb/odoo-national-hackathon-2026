# Authentication & Database Security Architecture Handoff
## Brightloop Software Subscription Management System
### Odoo National Level Hackathon 2026

**Author:** Harsha (`harsha-1706`), Database Engineer  
**Target Integration Branch:** `develop`  
**Recipients:** Sanjay Kumar (Team Lead), Amarnadh (Backend Engineer), Ravi (Frontend Engineer)  
**Date:** 2026-10-31  

---

## 1. Profiles Table Schema & Entity Contract

The canonical `public.profiles` table is defined as follows:

```sql
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'staff', 'customer')),
    account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'suspended')),
    phone TEXT,
    company_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX profiles_role_idx ON public.profiles(role);
CREATE INDEX profiles_status_idx ON public.profiles(account_status);
```

### Supported Attributes & Types:
- `id` (`UUID`): Matches `auth.users(id)` 1:1 with cascading deletion.
- `email` (`TEXT`): Verified email address synchronized from `auth.users`.
- `role` (`TEXT`): Restricted to `'admin'`, `'staff'`, `'customer'`. Default: `'customer'`.
- `account_status` (`TEXT`): Restricted to `'active'`, `'suspended'`. Default: `'active'`.
- `full_name` (`TEXT`): Nullable; populated from user metadata if provided.
- `phone` (`TEXT`): Nullable contact phone number.
- `company_name` (`TEXT`): Nullable customer organization name.
- `created_at` / `updated_at` (`TIMESTAMPTZ`): Automatically managed by `set_updated_at()` trigger.

---

## 2. Role Governance & Synchronization Mechanism

1. **Authoritative Role Store:**
   - User roles are stored server-side in Supabase Auth `app_metadata.role`.
   - Client applications **cannot modify** `app_metadata`.
   - `user_metadata.role` supplied by frontend registration forms is **strictly ignored**.
2. **Automated Synchronization Trigger:**
   - Trigger `brightloop_auth_role_metadata_changed` executes `public.sync_brightloop_profile_role()` upon `raw_app_meta_data` updates on `auth.users`.
   - Automatically synchronizes `app_metadata.role` and `app_metadata.account_status` into `public.profiles`.
3. **Privilege Escalation Protection:**
   - Trigger `trg_profiles_prevent_role_escalation` executes `public.prevent_role_escalation()` on `public.profiles`.
   - **Customer role self-elevation is blocked** (raises PostgreSQL error `42501`).
   - **Customer account_status reactivation is blocked** (raises PostgreSQL error `42501`).
   - **Profile ID mutation is blocked** (`Immutable identifier`).

---

## 3. Verified API Endpoints & Request/Response Contracts

All API endpoints follow the agreed standard envelope:
```json
{
  "success": true,
  "data": { ... },
  "message": "Human-readable status",
  "errors": null
}
```

### 3.1 Customer Registration: `POST /api/v1/auth/register`
- **Request Body:**
  ```json
  {
    "email": "customer@example.com",
    "password": "SecurePassword123!",
    "full_name": "Jane Doe"
  }
  ```
- **Password Rules:**
  - Length: `> 8` characters
  - At least 1 uppercase letter (`[A-Z]`)
  - At least 1 lowercase letter (`[a-z]`)
  - At least 1 special character (`[!@#$%^&*...]`)
- **Success Response (HTTP 201):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "c0a80123-4567-89ab-cdef-0123456789ab",
        "email": "customer@example.com",
        "full_name": "Jane Doe",
        "role": "customer"
      }
    },
    "message": "User registered successfully"
  }
  ```

### 3.2 User Login: `POST /api/v1/auth/login`
- **Request Body:**
  ```json
  {
    "email": "customer@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Success Response (HTTP 200):**
  ```json
  {
    "success": true,
    "data": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "def50200...",
      "expires_at": 1730386800,
      "user": {
        "id": "c0a80123-4567-89ab-cdef-0123456789ab",
        "email": "customer@example.com",
        "role": "customer"
      }
    },
    "message": "Login successful"
  }
  ```
- **Invalid Credentials (HTTP 401):** Returns `Invalid email or password` (prevents account enumeration).

### 3.3 Current User Profile: `GET /api/v1/auth/me`
- **Headers:** `Authorization: Bearer <access_token>`
- **Success Response (HTTP 200):**
  ```json
  {
    "success": true,
    "data": {
      "id": "c0a80123-4567-89ab-cdef-0123456789ab",
      "email": "customer@example.com",
      "role": "customer",
      "account_status": "active",
      "user": {
        "id": "c0a80123-4567-89ab-cdef-0123456789ab",
        "email": "customer@example.com",
        "role": "customer"
      }
    },
    "message": "Current user profile"
  }
  ```

### 3.4 Forgot Password: `POST /api/v1/auth/forgot-password`
- **Request Body:**
  ```json
  {
    "email": "customer@example.com"
  }
  ```
- **Success Response (HTTP 200):**
  ```json
  {
    "success": true,
    "data": null,
    "message": "If your email is registered, you will receive a password reset link."
  }
  ```

### 3.5 Admin Staff Provisioning: `POST /api/v1/staff` (Alias: `/api/v1/admin/staff`)
- **Headers:** `Authorization: Bearer <admin_access_token>`
- **Request Body:**
  ```json
  {
    "email": "support.staff@brightloop.com",
    "password": "StaffPassword2026!",
    "full_name": "Operations Support"
  }
  ```
- **Access Control:** Strictly restricted via `requireRole('admin')`. Returns HTTP 403 (`FORBIDDEN`) for customer or staff callers.
- **Success Response (HTTP 201):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
        "email": "support.staff@brightloop.com",
        "full_name": "Operations Support",
        "role": "staff"
      }
    },
    "message": "Staff user created successfully"
  }
  ```

---

## 4. Token Lifecycle & Session Management

- **Storage:** Frontend stores access token in memory/auth context and user profile in `brightloop_user_session` in `localStorage`.
- **JWT Expiration:** Managed via `expires_at` Unix epoch timestamp.
- **Refresh Flow:** Handled via Supabase Auth `auth.refreshSession()`.
- **Logout:** Handled client-side via `authApi.logout()`, clearing active token and `localStorage` session state.

---

## 5. Account Suspension Governance & RLS Rules

1. **State Machine:** `account_status` has two values: `'active'` and `'suspended'`.
2. **Administrative Mutation:** Only staff/admin (or backend `service_role`) can update `account_status`.
3. **Database RLS Invariant:**
   - `profiles_update_self`: Restricts customer profile updates to `account_status = 'active'`.
   - `subscriptions_update_customer`: Restricts customer subscription updates to `is_active_account()`.
   - `ai_events_insert_customer`: Restricts AI requests to `is_active_account()`.
4. **Historical Preservation:** Account suspension **never deletes** records. Invoices, subscriptions, line items, and payments remain completely intact for accounting auditability.

---

## 6. Table-by-Table Row Level Security (RLS) Status

All 16 application tables have Row Level Security enabled (`rowsecurity: true`):

| Table Name | Customer Access | Staff / Admin Access | Active Status Required? |
|---|---|---|---|
| `public.profiles` | Read self (`id = auth.uid()`), update self contact fields | Read all, update role and account status | Yes (Writes blocked if suspended) |
| `public.products` | Read all active catalogue items | Full CRUD management | Read-only for customers |
| `public.product_variants`| Read all active catalogue variants | Full CRUD management | Read-only for customers |
| `public.plans` | Read all active published plans | Full CRUD management | Read-only for customers |
| `public.tax_rules` | Read-only (via subscription/quotation lines) | Full CRUD management | Staff managed |
| `public.quotation_templates` | Read active templates | Full CRUD management | Staff managed |
| `public.quotation_template_lines`| Read active template lines | Full CRUD management | Staff managed |
| `public.subscriptions` | Read own subscriptions (`customer_id = auth.uid()`), update own | Full CRUD management | Yes (Updates blocked if suspended) |
| `public.subscription_lines`| Read lines belonging to own subscriptions | Full CRUD management | Inherits parent subscription check |
| `public.discount_rules` | Read active discount rules | Full CRUD management | Staff managed |
| `public.discount_product_mappings`| Read product discount scopes | Full CRUD management | Staff managed |
| `public.invoices` | Read own invoices (`customer_id = auth.uid()`) | Read all, manage invoice states | Customer read-only |
| `public.invoice_lines` | Read own invoice lines | Full CRUD management | Customer read-only |
| `public.payments` | Read own payments (linked via invoice) | Full operational record creation | Customer read-only |
| `public.discount_redemptions`| Read own redemptions (linked via invoice) | Audit and manage redemptions | Customer read-only |
| `public.ai_assistance_events`| Read own events, insert new request | Full operational triage and review | Yes (Insert blocked if suspended) |

---

## 7. Action Items for Teammates

### For Ravi (Frontend Engineer):
1. **Pull Latest `develop`:** Run `git checkout develop && git pull origin develop`.
2. **Account Status Inspection:** In `useAuth.tsx` / `AuthContext.jsx`, handle `account_status === 'suspended'` by redirecting to a dedicated suspended-account notice screen.
3. **Password Validation:** Ensure frontend registration form matches backend validation (`> 8` characters, upper, lower, special character).
4. **Password Reset Screen:** Ensure route `/reset-password` handles token callback and calls Supabase password update API.

### For Amarnadh (Backend Engineer):
1. **Pull Latest `develop`:** Run `git checkout develop && git pull origin develop`.
2. **Account Status in `/auth/me`:** Ensure `GET /api/v1/auth/me` returns `account_status` in its response payload (read from `profiles.account_status` or `app_metadata.account_status`).
3. **Suspended Status Check in Protected Middleware:** In `backend/src/middleware/authenticate.js`, verify `user.account_status === 'active'` before granting access to business routes (returning HTTP 403 `ACCOUNT_SUSPENDED` if suspended).
4. **Vitest Scripts:** Confirm `vitest` dependency is pinned in `backend/package.json` for CI test runs.

---

## 8. Known Open Items & Verification Status

- **Database Foundations:** **100% Deployed & Live Verified** on Supabase `bdmwwpfglltcpagwblmk`.
- **Module 2 Security Migration (`20261031_004`):** Ready in `database/migrations/` and canonical schema.
- **Automated Validation:** Passed **84 / 84 checks** across `validate_module_1.js` and `validate_auth_security.js`.
- **Live SMTP Delivery:** Requires team credentials for production mail server (Supabase Auth default template active for demo).
