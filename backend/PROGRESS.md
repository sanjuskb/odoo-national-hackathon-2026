# PROGRESS — Brightloop Backend

## Snapshot

| Field | Value |
|-------|-------|
| Branch | `feature/amarnath-backend-setup` |
| Latest commit | `eebbaa3` (pushed to origin) |
| Current Phase | **Phase 1: Foundation Hardening & Authentication** |
| Date | 2026-10-31 ~11:15 IST |
| Author | Amarnadh (backend) |

---

## Phase Checklist

| Phase | Description | Status |
|-------|-------------|--------|
| **Phase 0** | Repo inspection, environment, skeleton, contracts | ✅ Completed |
| ├ Repo inspected | Branch correct, tree clean, synced with develop | ✅ Done |
| ├ Documents read | All docs in docs/ read and findings recorded | ✅ Done |
| ├ Environment verified | Node v22.22.1, npm 9.2.0, Git 2.53.0 | ✅ Done |
| ├ .env.example updated | Added PORT, NODE_ENV, CORS_ORIGIN, SUPABASE_*, PASSWORD_RESET_REDIRECT_URL | ✅ Done |
| ├ Backend skeleton | Express app, health route, 404 handler, vitest tests | ✅ Done |
| ├ npm test passes | 2 tests passed (health 200, unknown 404) | ✅ Done |
| ├ curl health verified | Returns expected envelope at localhost:5000 | ✅ Done |
| ├ API_CONTRACT_PROPOSAL.md | Full endpoint table created | ✅ Done |
| ├ PROGRESS.md | Progress tracker initialized | ✅ Done |
| ├ Needed-from-Harsha | Listed with exists/missing status | ✅ Done |
| ├ Git push | Committed and pushed | ✅ Done |
| **Phase 1** | Express foundation hardening and authentication | ✅ Completed |
| ├ Dependencies | Installed zod, @supabase/supabase-js, helmet | ✅ Done |
| ├ Config & env | `config/env.js` with fail-fast outside test | ✅ Done |
| ├ Supabase client | `lib/supabase.js` with injectable admin/public clients | ✅ Done |
| ├ Error handling | `AppError`, `errorHandler`, `notFound`, standard envelope | ✅ Done |
| ├ Security & logging | `helmet`, `100kb` body limit, safe `requestLogger` (no secrets logged) | ✅ Done |
| ├ Validation | Zod schemas with strict password rules (>8 chars, upper, lower, special) | ✅ Done |
| ├ Role store | `services/roleStore.js` using `app_metadata` (TEMPORARY until Harsha profiles) | ✅ Done |
| ├ Auth service | `services/auth.service.js` (register, login, forgotPassword, createStaff) | ✅ Done |
| ├ Middleware | `authenticate`, `requireRole`, `requireSelfOrStaff` | ✅ Done |
| ├ Routes & controllers | `/auth`, `/staff`, `/admin/staff`, `/health` aligned to `"healthy"` | ✅ Done |
| ├ Admin script | `backend/scripts/create-admin.js` created | ✅ Done |
| ├ Automated tests | 29/29 Vitest + Supertest passing (mocked Supabase) | ✅ Done |
| ├ Health curl | Live server verified returning `status: "healthy"` | ✅ Done |
| ├ Real smoke check | Skipped with reason: no live `backend/.env` credentials present | ⚠️ Skipped |
| **Phase 2** | Products, variants and plans CRUD | ⬜ Next task |
| **Phase 3** | Taxes, discounts, quotation templates | ⬜ Not started |
| **Phase 4** | Subscriptions: CRUD, lifecycle transitions, lines | ⬜ Not started |
| **Phase 5** | Billing engine: idempotent invoice generation | ⬜ Not started |
| **Phase 6** | Invoices & actions (confirm, cancel, send, print) | ⬜ Not started |
| **Phase 7** | Payments & finance reporting dashboard | ⬜ Not started |
| **Phase 8** | Customer self-service portal, load benchmarking (<2s target) | ⬜ Not started |

---

## Findings from Step 0 Inspection

### a) Documented Health Status Value
- In `docs/API_CONTRACTS.md` (baseline contract) and tracked in Phase 0 notes, GET `/api/v1/health` data is documented as `{"status": "healthy", "timestamp": "ISO-8601"}`.
- Updated `health.routes.js` and `tests/health.test.js` to return and assert `status: "healthy"`.

### b) Documented Staff Creation Path
- In `docs/integration/api-contracts.md` (line 9), the documented endpoint is `POST /api/v1/staff` (Admin access).
- Prompt mentioned fallback `POST /api/v1/admin/staff`.
- Both paths are implemented and mounted to the exact same handler (`POST /api/v1/staff` as primary, `POST /api/v1/admin/staff` as alias).

### c) Profiles / Roles Table Existence
- Checked `database/`: contains only `.gitkeep`. No SQL migrations exist.
- Checked `docs/architecture/database-design-proposal.md`: `profiles/roles` is listed as a proposed entity, not an implemented table.
- Checked `docs/integration/CONTRACT_FREEZE_AND_HANDOFF.md`: Auth/role DB entity marked "TBD", approved "No".
- Conclusion: No profiles/roles table exists yet. Implemented temporary role storage using Supabase Auth `app_metadata.role`.

---

## Environment Results

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | v22.22.1 | Current LTS-compatible ✅ |
| npm | 9.2.0 | ✅ |
| Git | 2.53.0 | ✅ |
| OS | Ubuntu (WSL) | ✅ |

---

## Endpoints Implemented in Phase 1

| Method | Path | Role / Access | Purpose | Tested |
|--------|------|---------------|---------|--------|
| GET | `/api/v1/health` | Public | Service health probe (`status: "healthy"`, uptime, timestamp) | ✅ Mocked & Live Curl |
| POST | `/api/v1/auth/register` | Public | Customer registration with strict password rules; role is always `customer` | ✅ 8 test cases |
| POST | `/api/v1/auth/login` | Public | User authentication returning session tokens and verified role | ✅ 2 test cases |
| POST | `/api/v1/auth/forgot-password` | Public | Password reset trigger (enumeration-safe) | ✅ 1 test case |
| GET | `/api/v1/auth/me` | Authenticated (Any) | Current user identity and role from server-side roleStore | ✅ 4 test cases |
| POST | `/api/v1/staff` | Admin only | Create staff member (role `staff`) | ✅ 5 test cases |
| POST | `/api/v1/admin/staff` | Admin only | Alias for staff creation | ✅ 1 test case |

---

## Temporary / Unverified Items

1. **TEMPORARY - Role storage in `app_metadata.role`:**
   - Harsha owns the database schema and has not yet committed migrations for the `profiles` table.
   - Per Step 5 instructions, role storage currently uses Supabase Auth `app_metadata.role` via admin API calls.
   - When Harsha confirms and migrates the `profiles` table, `services/roleStore.js` will be updated to query `profiles(user_id, role)`.
2. **Mocked Supabase Client in Tests:**
   - All 29 Vitest tests run against an in-memory injectable mock of Supabase Admin and Public auth APIs (`tests/mocks/supabase.mock.js`).
   - These tests prove Express middleware, RBAC, input validation, error handling, and security invariants, but do NOT prove real live Supabase Auth network behavior.
3. **Real Smoke Check Skipped:**
   - No `backend/.env` file exists with active Supabase project credentials.
   - Fail-fast verification was executed and confirmed: running `node src/server.js` outside test mode cleanly throws `[CONFIG ERROR] Missing required environment variable(s)`.

---

## Needed from Harsha

| # | Item | Status | Action Needed |
|---|------|--------|---------------|
| 1 | **`profiles` table migration** | Missing | Provide table with columns: `id (UUID FK auth.users)`, `email`, `full_name`, `role (enum: admin, staff, customer)`. |
| 2 | **RLS policies on profiles** | Missing | Users can read own profile; service role can manage all profiles. |
| 3 | **Product, Variant, Plan tables** | Missing | Needed immediately for Phase 2. |
| 4 | **UNIQUE(subscription_id, billing_period_start)** | Missing | Needed for billing idempotency (Phase 5). |
| 5 | **`create_invoice_with_lines` RPC** | Missing | Needed for atomic billing transactions (Phase 5). |

---

## Needed from Ravi

1. Confirm frontend auth integration against `/api/v1/auth/login`, `/register`, `/me`.
2. Confirm request/response payloads in `backend/API_CONTRACT_PROPOSAL.md`.
3. Confirm tokens are sent as `Authorization: Bearer <access_token>`.

---

## Needed from Sanju

1. Architectural sign-off on Phase 1 implementation.
2. Resolution of open business rules (discounts stacking, tax inclusive/exclusive, proration).

---

## Next Task

**Phase 2: Products, Variants, and Plans CRUD**
- `GET /api/v1/products` (public/authenticated)
- `POST /api/v1/products` (admin)
- `GET /api/v1/products/:id` (authenticated)
- `PATCH /api/v1/products/:id` (admin)
- `POST /api/v1/products/:id/variants` (admin, with price_adjustment e.g. Odoo brand +560)
- `PATCH /api/v1/products/:id/variants/:variantId` (admin)
- `GET /api/v1/plans` (authenticated)
- `POST /api/v1/plans` (admin, with frequencies: daily, weekly, monthly, yearly, and policy flags)
- `GET /api/v1/plans/:id` (authenticated)
- `PATCH /api/v1/plans/:id` (admin)
