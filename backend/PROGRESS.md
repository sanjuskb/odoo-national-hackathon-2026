# PROGRESS — Brightloop Backend

## Snapshot

| Field | Value |
|-------|-------|
| Branch | `feature/amarnath-products-plans` |
| Base Used | `origin/develop` (`74a226f`) |
| Current Phase | **Phase 2: Products, Variants, and Plans** |
| Commits | `8cb447c`, `d9d4c3c`, `c674803`, `10a1e2f` |
| Date | 2026-10-31 ~12:20 IST |
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
| ├ Real smoke check | Verified against live Supabase project (Odoo Hackathon): register, login, me all 200/201 | ✅ Done |
| **Phase 2** | Products, variants and plans CRUD | ✅ Completed |
| ├ Money utility | `src/utils/money.js` (exact integer minor arithmetic, parse/format/add/multiply/round) | ✅ Done |
| ├ Repositories | `products.repository.js`, `variants.repository.js`, `plans.repository.js` (Supabase query builder) | ✅ Done |
| ├ Pricing service | `src/services/pricing.service.js` (1000.00 base + 560.00 Odoo variant = 1560.00 proven) | ✅ Done |
| ├ Price endpoint | `GET /api/v1/products/:id/price?variant_id=...` (contract addition) | ✅ Done |
| ├ Product endpoints | `GET /products`, `POST /products` (admin), `GET /products/:id`, `PATCH /products/:id` (admin) | ✅ Done |
| ├ Variant endpoints | `POST /products/:id/variants` (admin), `PATCH /products/:id/variants/:variantId` (admin) | ✅ Done |
| ├ Cost privacy | `cost_price` stripped for customer role; exposed to staff/admin | ✅ Done |
| ├ Plan service | `src/services/plan.service.js` (isPlanAvailable, validateQuantityForPlan, canPerform, shouldAutoClose) | ✅ Done |
| ├ Plan endpoints | `GET /plans`, `POST /plans` (admin), `GET /plans/:id`, `PATCH /plans/:id` (admin) | ✅ Done |
| ├ Plan visibility | Customers restricted to available plans (expired/future return 404); staff/admin see all | ✅ Done |
| ├ Plan validation | Frequencies (daily, weekly, monthly, yearly); merged date & quantity re-validation on PATCH | ✅ Done |
| ├ Automated tests | 88/88 Vitest tests passing across whole suite | ✅ Done |
| ├ Real smoke check | Skipped with reason: tables `public.products`, `public.product_variants`, `public.plans` do not exist in live Supabase (`PGRST205`) | ⚠️ Skipped |
| **Phase 3** | Quotation templates and subscriptions CRUD/lifecycle | ⬜ Next task |
| **Phase 4** | Taxes, discounts, discount-to-product mappings | ⬜ Not started |
| **Phase 5** | Billing engine: idempotent invoice generation | ⬜ Not started |
| **Phase 6** | Invoices & actions (confirm, cancel, send, print) | ⬜ Not started |
| **Phase 7** | Payments & finance reporting dashboard | ⬜ Not started |
| **Phase 8** | Customer self-service portal, load benchmarking (<2s target) | ⬜ Not started |

---

## Database Name Mapping Used

Source: `docs/architecture/database-design-proposal.md`, `docs/requirements/requirements.md`, and `backend/PROGRESS.md` (no migrations exist yet in `database/`).

### 1. `products` Table
| Column Name | Type | API Field | Notes |
|---|---|---|---|
| `id` | UUID | `id` | Primary key |
| `name` | TEXT | `name` | Non-empty, max 200 |
| `type` | TEXT | `type` | Default 'service' |
| `sales_price` | NUMERIC(12,2) | `sales_price` | Formatted as string with 2 decimals |
| `cost_price` | NUMERIC(12,2) | `cost_price` | Hidden from customers |
| `notes` | TEXT | `notes` | Optional notes |
| `created_at` | TIMESTAMPTZ | `created_at` | ISO 8601 string |
| `updated_at` | TIMESTAMPTZ | `updated_at` | ISO 8601 string |

### 2. `product_variants` Table
| Column Name | Type | API Field | Notes |
|---|---|---|---|
| `id` | UUID | `id` | Primary key |
| `product_id` | UUID | `product_id` | Foreign key to `products(id)` |
| `name` | TEXT | `name` | Variant name (e.g. "Odoo Brand") |
| `price_adjustment` | NUMERIC(12,2) | `price_adjustment` | Decimal string (e.g. "560.00") |
| `created_at` | TIMESTAMPTZ | `created_at` | ISO 8601 string |
| `updated_at` | TIMESTAMPTZ | `updated_at` | ISO 8601 string |

### 3. `plans` Table
| Column Name | Type | API Field | Notes |
|---|---|---|---|
| `id` | UUID | `id` | Primary key |
| `product_id` | UUID | `product_id` | Foreign key to `products(id)` |
| `price` | NUMERIC(12,2) | `price` | Formatted as string with 2 decimals |
| `frequency` | TEXT | `frequency` | Enum: daily, weekly, monthly, yearly |
| `min_quantity` | INTEGER | `min_quantity` | Integer >= 1 |
| `available_from` | TIMESTAMPTZ | `available_from` | ISO date or null |
| `available_until` | TIMESTAMPTZ | `available_until` | ISO date or null (must be >= available_from) |
| `auto_close` | BOOLEAN | `auto_close` | Default false |
| `allow_early_close`| BOOLEAN | `allow_early_close` | Default false |
| `allow_pause` | BOOLEAN | `allow_pause` | Default false |
| `allow_renew` | BOOLEAN | `allow_renew` | Default false |
| `created_at` | TIMESTAMPTZ | `created_at` | ISO 8601 string |
| `updated_at` | TIMESTAMPTZ | `updated_at` | ISO 8601 string |

---

## Endpoints Implemented in Phase 2

| Method | Path | Role / Access | Purpose | Tested |
|--------|------|---------------|---------|--------|
| `GET` | `/api/v1/products` | Authenticated | Paginated products list (cost_price hidden from customer) | ✅ 3 test cases |
| `POST` | `/api/v1/products` | Admin only | Create new product | ✅ 6 test cases |
| `GET` | `/api/v1/products/:id` | Authenticated | Retrieve product with variants (cost_price hidden from customer) | ✅ 3 test cases |
| `PATCH` | `/api/v1/products/:id` | Admin only | Partially update product | ✅ 3 test cases |
| `POST` | `/api/v1/products/:id/variants` | Admin only | Create variant for product | ✅ 2 test cases |
| `PATCH` | `/api/v1/products/:id/variants/:variantId` | Admin only | Partially update variant (verifies product ownership) | ✅ 2 test cases |
| `GET` | `/api/v1/products/:id/price` | Authenticated | Compute unit price: base + optional variant (Contract Addition) | ✅ 3 test cases |
| `GET` | `/api/v1/plans` | Authenticated | Paginated plans list (customers restricted to currently available plans) | ✅ 4 test cases |
| `POST` | `/api/v1/plans` | Admin only | Create recurring plan with policy flags and date validation | ✅ 5 test cases |
| `GET` | `/api/v1/plans/:id` | Authenticated | Retrieve plan (customers get 404 if plan is expired or future) | ✅ 3 test cases |
| `PATCH` | `/api/v1/plans/:id` | Admin only | Partially update plan with merged date & quantity re-validation | ✅ 2 test cases |

---

## Temporary or Unverified Items

1. **TEMPORARY - Role storage in `app_metadata.role`:**
   - Harsha owns the database schema and has not yet committed migrations for the `profiles` table.
   - Per Step 5 instructions, role storage currently uses Supabase Auth `app_metadata.role` via admin API calls.
   - When Harsha confirms and migrates the `profiles` table, `services/roleStore.js` will be updated to query `profiles(user_id, role)`.
2. **Real Supabase Auth Verified Live:**
   - Live smoke test executed against the team's active Supabase project (`Odoo Hackathon`, ref `bdmwwpfglltcpagwblmk`, ap-southeast-2).
   - Real registration (`POST /api/v1/auth/register`), login (`POST /api/v1/auth/login`), and token verification (`GET /api/v1/auth/me`) succeeded with real JWT issuance and validation.
3. **In-Memory Mock Test Suite:**
   - Vitest test suite uses the enhanced in-memory query builder mock in `tests/mocks/supabase.mock.js` for deterministic CI execution (88/88 tests pass).
4. **Real Supabase DB Tables Missing:**
   - Real smoke check for Phase 2 was skipped because Harsha has not yet migrated `public.products`, `public.product_variants`, and `public.plans` to the live database (`PGRST205: Could not find table in schema cache`).

---

## Needed from Harsha

| # | Item | Status | Action Needed |
|---|------|--------|---------------|
| 1 | **`profiles` table migration** | Missing | Provide table with role column (`admin`, `staff`, `customer`). |
| 2 | **`products` & `product_variants` migrations** | Missing | Deploy DDL as mapped above. |
| 3 | **`plans` migration** | Missing | Deploy DDL with frequency check constraint and foreign key to `products(id)`. |
| 4 | **UNIQUE(subscription_id, billing_period_start)** | Missing | Needed for billing idempotency (Phase 5). |

---

## Needed from Ravi

1. Review and bind frontend catalog and plan selection views to `/api/v1/products`, `/api/v1/products/:id/price`, and `/api/v1/plans`.
2. Notice that `cost_price` will be `undefined` when customer tokens call `/api/v1/products`.
3. Notice that `GET /api/v1/products/:id/price?variant_id=...` returns `{ product_id, variant_id, base_price, adjustment, unit_price }` as strings for instant UI calculations.

---

## Next Task

**Phase 3: Quotation Templates and Subscriptions**
- Quotation templates CRUD (`GET /api/v1/quotation-templates`, `POST /api/v1/quotation-templates`, lines with validity days)
- Subscriptions CRUD (`GET /api/v1/subscriptions`, `POST /api/v1/subscriptions` with optional template_id)
- Subscription lifecycle state transitions: `draft` → `quotation` → `confirmed` → `active` → `closed`
- Subscription lines math with quantity, price, and amounts
- Customer portal subscriptions read (`GET /portal/subscriptions`)
