# Phase 1 Final Report — Brightloop Backend
**Odoo National Hackathon 2026**
**Owner:** Amarnadh (Backend)
**Date:** 2026-10-31 | **Status:** ✅ Complete & Pushed

---

## 1. Executive Summary & Git Snapshot

| Field | Value |
|---|---|
| **Branch** | `feature/amarnath-backend-setup` |
| **Latest Commit** | `3386721` (`docs(backend): sync snapshot hash with pushed commits`) |
| **Remote Status** | Pushed and up-to-date with `origin/feature/amarnath-backend-setup` |
| **Test Status** | **29/29 Passing (100%)** — Vitest + Supertest |
| **Working Tree** | Clean (`nothing to commit, working tree clean`) |

---

## 2. Endpoints Implemented in Phase 1

All endpoints use prefix `/api/v1` and standard envelope `{ success, data, message, errors }`:

| Method | Path | Allowed Roles | Description | Status |
|---|---|---|---|---|
| `GET` | `/api/v1/health` | Public | Probes uptime, timestamp, and returns documented `status: "healthy"` | ✅ Working |
| `POST` | `/api/v1/auth/register` | Public | Registers customer with strict password rules (>8 chars, upper, lower, special); role is strictly `customer` | ✅ Tested (8 cases) |
| `POST` | `/api/v1/auth/login` | Public | Authenticates credentials; returns tokens and server-verified role | ✅ Tested (2 cases) |
| `POST` | `/api/v1/auth/forgot-password` | Public | Enumeration-safe reset trigger (identical response whether email exists or not) | ✅ Tested (1 case) |
| `GET` | `/api/v1/auth/me` | Authenticated (Any) | Returns current user profile with role resolved server-side from `roleStore` | ✅ Tested (4 cases) |
| `POST` | `/api/v1/staff` | Admin only | Provisions internal staff user (`role: staff`); blocks customer/staff | ✅ Tested (5 cases) |
| `POST` | `/api/v1/admin/staff` | Admin only | Supported alias path for staff creation | ✅ Tested (1 case) |

---

## 3. Key Technical Foundations Built

1. **Security & Middlewares:**
   - `helmet` security headers enabled.
   - Body parser strictly limited to `100kb`.
   - `CORS` restricted to `CORS_ORIGIN` (defaults to `http://localhost:5173`).
   - `requestLogger`: logs method, path, status code, and duration only. **Never logs request bodies, passwords, tokens, or auth headers.**
2. **Strict Validation:**
   - Zod schemas enforce password requirement: minimum 9 characters, at least 1 uppercase letter, 1 lowercase letter, 1 special character.
   - Client-supplied `role` in registration body is completely ignored.
3. **Role & Identity Integrity:**
   - Server-side bearer token authentication via `authenticate.js`.
   - Role is resolved strictly via `services/roleStore.js`. Claims from client `user_metadata` or request bodies are discarded.
   - `requireSelfOrStaff('param')`: ensures Customer A cannot read Customer B's records, while staff and admin can access all.
4. **Environment Fail-Fast:**
   - Outside test mode, `src/config/env.js` fails fast with an explicit error message if Supabase keys are missing.

---

## 4. Test Verification (29 Tests Passing)

```text
 RUN  v5.0.5 /home/dev_amar75/projects/odoo-national-hackathon-2026/backend

 ✓ tests/health.test.js (2 tests) 38ms
 ✓ tests/auth.test.js (27 tests) 123ms

 Test Files  2 passed (2)
      Tests  29 passed (29)
   Duration  627ms
```

- **Health Curl Check:**
  `curl http://localhost:5000/api/v1/health`
  `{"success":true,"data":{"status":"healthy","uptime":1.024311247,"timestamp":"2026-10-31T05:46:30.158Z"},"message":"OK","errors":null}`
- **Supabase Mocking:** Automated tests ran against an in-memory mock harness (`tests/mocks/supabase.mock.js`) to verify logic deterministically.
- **Live Supabase Smoke Check:** Skipped because `.env` with live project keys has not yet been provisioned.

---

## 5. What I Need from Harsha (Database)

We are currently blocked on real database tables for moving forward cleanly. Specifically:

1. **`profiles` Table Migration (Immediate Need):**
   - Currently, user roles are stored temporarily in Supabase Auth `app_metadata.role` because no database tables exist.
   - Need Harsha to provide the migration creating `profiles`:
     - `id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`
     - `email TEXT NOT NULL UNIQUE`
     - `full_name TEXT NOT NULL`
     - `role TEXT NOT NULL CHECK (role IN ('admin', 'staff', 'customer')) DEFAULT 'customer'`
     - `created_at TIMESTAMPTZ DEFAULT NOW()`
     - `updated_at TIMESTAMPTZ DEFAULT NOW()`
   - RLS policies: Users can read their own profile; service role / backend can write and read all.
2. **Phase 2 Schema (Products, Variants, Plans):**
   - `products`: `id`, `name`, `type`, `sales_price NUMERIC(12,2)`, `cost_price NUMERIC(12,2)`, `notes`
   - `product_variants`: `id`, `product_id FK`, `name`, `price_adjustment NUMERIC(12,2)` (e.g. Odoo brand +560.00)
   - `plans`: `id`, `product_id FK`, `price NUMERIC(12,2)`, `frequency` (daily/weekly/monthly/yearly), `min_quantity`, `available_from`, `available_until`, and boolean policy flags (`auto_close`, `allow_early_close`, `allow_pause`, `allow_renew`).
3. **Upcoming Invariants for Billing:**
   - `UNIQUE(subscription_id, billing_period_start)` on `invoices` (critical duplicate-billing guard).
   - Supabase RPC function `create_invoice_with_lines` for atomic invoice creation + discount redemption + next billing date advance.

---

## 6. What I Need from Ravi (Frontend)

The backend authentication contract is implemented and documented in [`backend/API_CONTRACT_PROPOSAL.md`](file:///\\wsl.localhost\Ubuntu\home\dev_amar75\projects\odoo-national-hackathon-2026\backend\API_CONTRACT_PROPOSAL.md). Here is what we need from Ravi:

1. **Auth Integration Alignment:**
   - **Base URL:** `/api/v1`
   - **Register Endpoint:** `POST /api/v1/auth/register` with body `{ email, password, full_name }`. Returns `201 Created` with `{ user: { id, email, full_name, role: "customer" } }`.
   - **Login Endpoint:** `POST /api/v1/auth/login` with body `{ email, password }`. Returns `200 OK` with `{ access_token, refresh_token, expires_at, user: { id, email, role } }`.
   - **Session Verification:** `GET /api/v1/auth/me` with header `Authorization: Bearer <access_token>`.
2. **Password Validation UI Constraints:**
   - The frontend password field should validate:
     - Greater than 8 characters (at least 9 characters)
     - At least 1 uppercase letter (`A-Z`)
     - At least 1 lowercase letter (`a-z`)
     - At least 1 special character (symbol/punctuation)
3. **CORS & Dev Port:**
   - The backend allows origin `http://localhost:5173` by default (Vite standard). If Ravi runs Vite on a different port, let me know.
4. **Staff Management UI:**
   - If Ravi is building the admin portal for staff creation, the endpoint is `POST /api/v1/staff` (or `POST /api/v1/admin/staff`) with the admin Bearer token.
