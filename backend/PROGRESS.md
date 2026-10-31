# PROGRESS — Brightloop Backend

## Snapshot

| Field | Value |
|-------|-------|
| Branch | `feature/amarnath-backend-setup` |
| Latest commit | `92f7ed2` (pushed to origin) |
| Date | 2026-10-31 ~10:30 IST |
| Author | Amarnadh (backend) |

---

## Phase Checklist

| Phase | Description | Status |
|-------|-------------|--------|
| **Phase 0** | Repo inspection, environment, skeleton, contracts | ✅ In progress |
| ├ Repo inspected | Branch correct, tree clean, synced with develop | ✅ Done |
| ├ Documents read | All docs in docs/ read and findings recorded | ✅ Done |
| ├ Environment verified | Node v22.22.1, npm 9.2.0, Git 2.53.0 | ✅ Done |
| ├ .env.example updated | Added PORT, NODE_ENV, CORS_ORIGIN, SUPABASE_*, PASSWORD_RESET_REDIRECT_URL | ✅ Done |
| ├ Backend skeleton | Express app, health route, 404 handler, vitest tests | ✅ Done |
| ├ npm test passes | 2 tests passed (health 200, unknown 404) | ✅ Done |
| ├ curl health verified | Returns expected envelope at localhost:5000 | ✅ Done |
| ├ API_CONTRACT_PROPOSAL.md | Full endpoint table created | ✅ Done |
| ├ PROGRESS.md | This file | ✅ Done |
| ├ Needed-from-Harsha | Listed below with exists/missing status | ✅ Done |
| ├ Git push | Committed and pushed | ✅ Done |
| **Phase 1** | Auth: register, login, forgot-password, me, admin/staff | ⬜ Not started |
| **Phase 2** | Products + variants CRUD | ⬜ Not started |
| **Phase 3** | Plans CRUD with policy flags | ⬜ Not started |
| **Phase 4** | Taxes, discounts, quotation templates | ⬜ Not started |
| **Phase 5** | Subscriptions: CRUD, lifecycle transitions, lines | ⬜ Not started |
| **Phase 6** | Billing engine: idempotent invoice generation | ⬜ Not started |
| **Phase 7** | Invoices, payments, reports | ⬜ Not started |
| **Phase 8** | Customer portal, performance, polish | ⬜ Not started |

---

## Findings from Document Review (Step 2)

### a) Document status

| Document | Status |
|----------|--------|
| README.md | Filled in — repo structure, branching, team roles |
| docs/EVENT_BRIEF.md | Filled in — competition structure, team, PS pending note |
| docs/REQUIREMENTS.md | **Template / placeholder** — all FRs say "TBD" |
| docs/requirements/requirements.md | **Filled in** — 36 traceable requirements from official PS |
| docs/ARCHITECTURE.md | **Template** — stack says "TBD", but principles documented |
| docs/architecture/system-architecture-proposal.md | **Filled in** — React+Express+Supabase, mermaid diagram |
| docs/architecture/database-design-proposal.md | **Filled in** — entity list, ER diagram, integrity rules |
| docs/architecture/billing-engine-design.md | **Filled in** — invariants, transaction design, test list |
| docs/API_CONTRACTS.md | **Partially filled** — envelope, health, template endpoints |
| docs/integration/api-contracts.md | **Filled in** — proposed endpoint table, 25 rows |
| docs/integration/CONTRACT_FREEZE_AND_HANDOFF.md | **Filled in** — contract review checklist (all "No" / TBD) |
| docs/DATABASE_DESIGN.md | **Template** — entity names TBD |
| docs/TEAM_WORK_PLAN.md | Filled in — 4-phase workflow |
| docs/TEST_PLAN.md | Filled in — test pyramid, pre-PR checklist |
| docs/DEMO_SCRIPT.md | Filled in — 5-minute walkthrough plan |
| docs/team/amarnath-backend-plan.md | **Filled in** — 7-step build order for backend |
| docs/team/harsha-database-plan.md | **Filled in** — 6-step DB plan |
| docs/team/decision-log.md | **Filled in** — 10 decisions/open items |
| docs/requirements/acceptance-criteria.md | **Filled in** — measurable tests per requirement |
| docs/official/problem-statement.md | **Filled in** — full transcription of 4-page PDF |
| .env.example | Updated with Supabase vars |
| Subscription_Management_System* file | **Not found** in repo (PDF transcription in docs/official/) |

### b) Decisions already recorded

- **Stack:** Node.js/Express backend, React/TypeScript frontend, Supabase PostgreSQL + Auth
- **API conventions:** Base `/api/v1`, envelope `{success, data, message, errors}`, Bearer token auth
- **Branching:** main (stable) → develop (integration) → feature/* branches
- **Roles:** admin, staff, customer
- **Billing invariant:** UNIQUE(subscription_id, billing_period_start), atomic transactions
- **Subscription lifecycle:** draft → quotation → confirmed → active → closed
- **Invoice lifecycle:** draft → confirmed → paid (cancelled TBD)
- **Billing frequencies:** daily, weekly, monthly, yearly
- **AI/ML:** Not required by official PS

### c) Contradictions and notes

| Topic | Detail |
|-------|--------|
| PORT naming | Root `.env.example` uses `APP_PORT=3000`; prompt specifies `PORT` with default 5000. I used `PORT=5000` for backend to avoid confusion with frontend dev server. No conflict — different processes. |
| Health response | `docs/API_CONTRACTS.md` says `"status": "healthy"`, my implementation uses `"status": "ok"`. Minor — needs alignment. |
| Staff endpoint path | `docs/integration/api-contracts.md` says `/api/v1/staff`; prompt says `/api/v1/admin/staff`. Listed as open decision. |
| Top-level REQUIREMENTS.md | Still template with "TBD" — the real requirements are in `docs/requirements/requirements.md`. |
| Top-level ARCHITECTURE.md | Still template — the real proposal is in `docs/architecture/system-architecture-proposal.md`. |
| No real contradictions | Documents are consistent with each other and with the prompt. Differences are naming/path preferences, not semantic conflicts. |

---

## Environment Results

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | v22.22.1 | Current LTS-compatible ✅ |
| npm | 9.2.0 | ✅ |
| Git | 2.53.0 | ✅ |
| OS | Ubuntu (WSL) | ✅ |

---

## Endpoints Built

| Method | Path | Status | Test |
|--------|------|--------|------|
| GET | /api/v1/health | ✅ Working | ✅ health.test.js |
| * | * (fallback) | ✅ 404 handler | ✅ health.test.js |

---

## Decisions Made

1. **Backend port:** 5000 (avoids conflict with frontend default 5173 and root APP_PORT 3000).
2. **CORS default:** `http://localhost:5173` (Vite default for React dev server).
3. **Test framework:** Vitest + Supertest with ESM imports in test files, CommonJS in app source.
4. **Health response:** `"status": "ok"` — open to change to `"healthy"` if team prefers.
5. **Response envelope:** Matches repo convention exactly.

---

## Temporary / Unverified Items

- Server uses CommonJS (`require`), tests use ESM (`import`) — Vitest handles this. If team prefers full ESM (`"type": "module"` in package.json), will migrate.
- Vitest shows a non-blocking warning about `vitest.config.js` using ESM syntax in a CJS context. Functionally fine.
- No Supabase connection verified yet — placeholder env vars only.

---

## Needed from Harsha

### Schema requirements for backend

| # | Item | What backend needs | Exists in repo? | File reference |
|---|------|--------------------|-----------------|----------------|
| 1 | **User role storage** | Table and columns where a user's role (admin/staff/customer) is stored; how to look up role from Supabase Auth UID | **Partially exists** — `docs/architecture/database-design-proposal.md` mentions "profiles/roles (Supabase Auth reference)" but no migration or column names | `docs/architecture/database-design-proposal.md` |
| 2 | **products table** | id, name, type, sales_price (NUMERIC(12,2)), cost_price (NUMERIC(12,2)), notes, created_at, updated_at | **Missing** — proposed entity only | `docs/architecture/database-design-proposal.md` |
| 3 | **product_variants table** | id, product_id (FK), name, price_adjustment (NUMERIC(12,2)), created_at, updated_at | **Missing** — mentioned but no migration | `docs/architecture/database-design-proposal.md` |
| 4 | **plans table** | id, product_id (FK), price (NUMERIC(12,2)), frequency (enum: daily/weekly/monthly/yearly), min_quantity, available_from, available_until, auto_close (bool), allow_early_close (bool), allow_pause (bool), allow_renew (bool), created_at, updated_at | **Missing** — proposed only | `docs/architecture/database-design-proposal.md` |
| 5 | **tax_rules table** | id, name, rate (NUMERIC(5,2)), description, is_active, created_at, updated_at | **Missing** | — |
| 6 | **discount_rules table** | id, type (fixed/percentage), value (NUMERIC(12,2)), min_amount (NUMERIC(12,2)), min_quantity, start_date, end_date, max_uses, used_count (default 0), scope (product/subscription), created_at, updated_at | **Missing** — entity proposed | `docs/architecture/database-design-proposal.md` |
| 7 | **discount_product_mappings table** | discount_id (FK), product_id (FK) — junction table for product-scoped discounts | **Missing** | — |
| 8 | **quotation_templates + template_lines** | Template: id, name, plan_id (FK), validity_days. Lines: id, template_id (FK), product_id (FK), variant_id (FK nullable), quantity | **Missing** — entity proposed | `docs/architecture/database-design-proposal.md` |
| 9 | **subscriptions table** | id, number (UNIQUE), customer_id (FK to profiles), plan_id (FK), start_date, expiry_date, payment_terms, status (enum), next_billing_date, created_at, updated_at | **Missing** — entity proposed | `docs/architecture/database-design-proposal.md` |
| 10 | **subscription_lines table** | id, subscription_id (FK), product_id (FK), variant_id (FK nullable), quantity, unit_price (NUMERIC(12,2)), tax_amount (NUMERIC(12,2)), subtotal (NUMERIC(12,2)) | **Missing** | — |
| 11 | **invoices table** | id, subscription_id (FK), customer_id (FK), billing_period_start, billing_period_end, due_date, status (enum), subtotal, tax_total, discount_total, total, created_at, updated_at | **Missing** — entity proposed | `docs/architecture/database-design-proposal.md` |
| 12 | **invoice_lines table** | id, invoice_id (FK), product_id, variant_id, description, quantity, unit_price, tax_rate, tax_amount, discount_amount, line_total — all money as NUMERIC(12,2); these are **snapshots** (not FK lookups at read time) | **Missing** | — |
| 13 | **payments table** | id, invoice_id (FK), method, amount (NUMERIC(12,2)), payment_date, note, created_at | **Missing** — entity proposed | `docs/architecture/database-design-proposal.md` |
| 14 | **discount_redemptions table** | id, discount_id (FK), invoice_id (FK), amount (NUMERIC(12,2)), created_at | **Missing** — entity proposed | `docs/architecture/database-design-proposal.md` |

### Constraints needed

| # | Constraint | Exists? |
|---|-----------|---------|
| 1 | UNIQUE email on profiles | **Missing** — mentioned in PS but no migration |
| 2 | UNIQUE subscription number | **Missing** — mentioned in proposal |
| 3 | UNIQUE(subscription_id, billing_period_start) on invoices — **critical duplicate-billing guard** | **Missing** — mentioned in `billing-engine-design.md` and `CONTRACT_FREEZE_AND_HANDOFF.md` |
| 4 | All money columns NUMERIC(12,2) | **Missing** — mentioned in proposal |
| 5 | Foreign keys: payments→invoices, invoice_lines→invoices, subscription_lines→subscriptions, etc. | **Missing** |
| 6 | CHECK constraints: positive quantities, valid date ranges | **Missing** |

### Database functions needed

| # | Function | Purpose | Exists? |
|---|----------|---------|---------|
| 1 | `create_invoice_with_lines` (Supabase RPC) | Atomically: create invoice + lines, consume discount usage, advance next_billing_date — in ONE transaction | **Missing** — design described in `docs/architecture/billing-engine-design.md` |

### Indexes needed

| # | Index | Purpose | Exists? |
|---|-------|---------|---------|
| 1 | invoices(status, due_date) | Overdue invoice queries | **Missing** |
| 2 | subscriptions(status, next_billing_date) | Billing run: find due subscriptions | **Missing** |
| 3 | subscriptions(customer_id) | Customer portal queries | **Missing** |
| 4 | invoices(customer_id) | Customer portal queries | **Missing** |
| 5 | payments(invoice_id) | Payment reconciliation | **Missing** |

### Seed data needed

| # | Item | Exists? |
|---|------|---------|
| 1 | Admin user, staff user, 2+ customer users | **Missing** |
| 2 | Products with variants (including Odoo brand +560 example) | **Missing** |
| 3 | Plans across all 4 frequencies | **Missing** |
| 4 | Tax rules | **Missing** |
| 5 | Discount rules (fixed + percentage, various scopes) | **Missing** |
| 6 | Thousands of subscriptions with invoices for performance testing | **Missing** — required by NFR-001 |

---

## Needed from Ravi

1. Confirm base path `/api/v1` — agreed in docs, just need explicit ACK.
2. Confirm response envelope shape — agreed in docs.
3. Confirm auth header `Authorization: Bearer <access_token>`.
4. Confirm subscription status enum values: `draft, quotation, confirmed, active, closed`.
5. Confirm invoice status enum values: `draft, confirmed, paid` (+ `cancelled`?).
6. Confirm CORS origin for dev: `http://localhost:5173` (Vite default).
7. Review `backend/API_CONTRACT_PROPOSAL.md` — flag any endpoint paths, request/response shapes that don't work for the frontend.

---

## Needed from Sanju

1. **Approve** `backend/API_CONTRACT_PROPOSAL.md` as the contract baseline.
2. Resolve open business rules:
   - Invoice cancellation: add `cancelled` status?
   - Discount stacking: multiple discounts per line?
   - Partial payments: allow or require full?
   - Currency: single, and which?
   - Tax inclusive/exclusive?
   - Proration on mid-cycle changes?
3. Confirm billing trigger approach: cron, Supabase Edge Function, or manual-only for demo?
4. Confirm email provider decision (or mark as "not implemented, disclosed").

---

## Next Task

**Phase 1: Authentication**
- Supabase Auth integration (register, login, forgot-password)
- GET /auth/me with role lookup from profiles table
- POST /admin/staff (admin-only)
- Middleware: `requireAuth`, `requireRole(['admin'])`, `requireOwnership`
- Tests: 401/403, duplicate email, password validation, role checks

**Blocked on:** Harsha providing the `profiles` table migration with role column and RLS rules.

---

## Handoff Notes for Another Model

1. **The repository is the source of truth.** Always `git fetch origin` and inspect before changing anything.
2. Do not edit files in `frontend/`, `database/`, or `docs/` — those belong to other team members.
3. The official problem statement is transcribed in `docs/official/problem-statement.md`. The real requirements table is in `docs/requirements/requirements.md` (not the template at `docs/REQUIREMENTS.md`).
4. The backend uses CommonJS (`require`/`module.exports`). Tests use ESM (`import`) because Vitest requires it. This is intentional.
5. All money values must be decimal strings with 2 places in API, NUMERIC(12,2) in DB. Never use floats.
6. The billing engine **must** use UNIQUE(subscription_id, billing_period_start) as the duplicate guard — this is a critical invariant.
7. Never commit secrets. Never open `.env` files. Use `.env.example` with placeholders only.
