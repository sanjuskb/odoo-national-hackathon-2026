# Database Implementation Checklist
## Brightloop Software Subscription Management System
### Odoo National Level Hackathon 2026

**Assigned Engineer:** Harsha (`harsha-1706`), Database Engineer  
**Feature Branch:** `feature/harsha-supabase-setup`  
**Target Dev Project:** `Odoo Hackathon Dev` (`sldgofxhcfswcmcpebwv`)  
**Shared Project (Protected):** `Odoo Hackathon` (`bdmwwpfglitcpagwblmk`)  

---

## Phase 1: Workspace & Foundation Setup (COMPLETED)
- [x] Verify Git repository root (`E:\Projects\Odoo-Team`) and active feature branch (`feature/harsha-supabase-setup`).
- [x] Establish `.gitignore` to track database migrations while excluding secrets.
- [x] Create modular `database/` directory hierarchy (schema, migrations, seeds, rls, diagrams, tests, supabase, history).
- [x] Publish `GEMINI.md` persistent workflow instructions.

---

## Phase 2: Requirements Analysis & Schema Architecture (COMPLETED)
- [x] Deconstruct official problem statement for Brightloop Software (`docs/official/problem-statement.md`).
- [x] Align with team architecture proposals (`docs/architecture/database-design-proposal.md` and `docs/architecture/billing-engine-design.md`).
- [x] Design entity model covering Profiles, Products, Variants (+560 Odoo variant), Plans (daily/weekly/monthly/yearly), Quotes, Subscriptions, Invoices, Discounts, Payments.
- [x] Enforce `NUMERIC(12, 2)` for all currency values to prevent floating-point anomalies.
- [x] Publish Mermaid Entity-Relationship Diagram (`database/diagrams/schema_erd.mmd`).
- [x] Publish comprehensive Data Dictionary and constraints in `docs/DATABASE_DESIGN.md`.

---

## Phase 3: SQL Implementation & Migrations (COMPLETED - AUTHORED)
- [x] Migration `001_initial_schema.sql`: Core 15 relational tables with primary/foreign keys and domain checks.
- [x] Migration `002_constraints_and_functions.sql`: Automated `updated_at` triggers, automated payment reconciliation, next-billing-date calculator, and atomic billing generator `fn_generate_due_invoice()`.
- [x] Migration `003_rls_policies.sql`: Complete Row Level Security policies enforcing strict customer isolation and staff/admin permissions.
- [x] Migration `004_indexes.sql`: Foreign key indexes, partial index for due billing discovery, and composite indexes for overdue invoices and revenue reporting.

---

## Phase 4: Recurring Billing Integrity & Concurrency Control (COMPLETED - DESIGNED & AUTHORED)
- [x] Stable `uq_subscription_billing_period UNIQUE (subscription_id, billing_period_start)` constraint.
- [x] Atomic invoice creation with row-level locking (`FOR UPDATE`).
- [x] Historical snapshotting of line totals, tax, and discounts on `invoice_lines`.
- [x] Atomic discount usage reservation and next billing date progression.

---

## Phase 5: Seed Data & Testing Suites (COMPLETED - AUTHORED)
- [x] Demonstration Seed `001_seed_initial_data.sql`: 1 Admin, 1 Staff, 2 Customers, Products, Odoo Variant (+560), Daily/Weekly/Monthly/Yearly Plans, Draft/Quotation/Confirmed/Active/Closed Subscriptions, Invoices, Discounts, Payments.
- [x] Scalable Benchmark Seed `002_performance_benchmark_seed.sql`: Procedure generating 2,500 subscriptions and invoices.
- [x] Schema integrity test `test_schema.sql`.
- [x] Recurring billing idempotency and uniqueness test `test_billing_integrity.sql`.
- [x] RLS customer isolation test `test_rls.sql`.
- [x] Query benchmark test `test_benchmark.sql` (< 2s target).
- [x] Health check utility `database/supabase/health_check.js`.
- [x] Test runner `database/tests/run_tests.js`.

---

## Phase 6: Remote Connection & Verification (PENDING USER AUTH/CREDENTIALS)
- [x] Inspect workspace MCP config (`.agents/mcp_config.json` targeting `sldgofxhcfswcmcpebwv` in `read_only=true`).
- [x] Verify CLI availability via `npx supabase` (v2.122.0).
- [ ] Authenticate Supabase CLI (`npx supabase login`) or provide PostgreSQL connection string for Dev project.
- [ ] Apply migrations to `Odoo Hackathon Dev` (`sldgofxhcfswcmcpebwv`).
- [ ] Run automated test suite against Dev database.
- [ ] Record test results and benchmark timings.
- [ ] Commit and push feature work to `feature/harsha-supabase-setup`.
