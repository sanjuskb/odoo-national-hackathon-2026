# Database Architecture & Migration Changelog
## Brightloop Software Subscription Management System
### Odoo National Level Hackathon 2026

All notable changes to the database schema, security policies, migrations, and architecture are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.0.0] - 2026-10-31

### Added - Module 1: Database Foundation Hardening, Auditing, Indexes & RLS
- **Foundation Enhancement Migration (`database/migrations/20261031_003_foundation_enhancements.sql`):**
  - **Audit & Timestamps:** Automated `set_updated_at()` trigger function and triggers across all mutable domain tables (`profiles`, `products`, `product_variants`, `plans`, `quotation_templates`, `subscriptions`, `subscription_lines`, `tax_rules`, `discount_rules`, `invoices`, `ai_assistance_events`).
  - **Privilege Escalation Protection:** Implemented `prevent_role_escalation()` trigger on `public.profiles` blocking customer self-elevation and immutable primary key modification.
  - **Profiles Contact Extensions:** Added `phone`, `company_name`, and `profiles_role_idx` index.
  - **Customer Self-Service RLS:** Added `profiles_update_self` policy allowing customers to maintain contact details safely while role elevation is blocked by trigger.
  - **Catalogue & Plans Active Flags:** Added `is_active` flags and `sku` on `product_variants`, with staff-scoped insert, update, and delete RLS policies.
  - **Foreign Key Query Indexes:** Added B-Tree indexes on missing foreign key paths (`product_variants.product_id`, `plans.product_id`, `quotation_templates.plan_id`, `quotation_template_lines.template_id/product_id/variant_id`, `subscription_lines.subscription_id/product_id/variant_id`, `discount_product_mappings.product_id`, `invoice_lines.product_id`).
  - **AI Workflow Persistence:** Created `public.ai_assistance_events` table with check constraints, `updated_at` trigger, status/customer indexes, and customer/staff RLS policies.
- **Canonical Schema Definition (`database/schema/01_brightloop_schema.sql`):**
  - Consolidated complete 16-table canonical reference DDL unifying `20261031_001`, `20261031_002`, and `20261031_003` (15 domain tables + `ai_assistance_events`), triggers, RLS policies, and `persist_due_billing_invoice` RPC.
  - Successfully deployed to live Supabase project `bdmwwpfglltcpagwblmk` (`Odoo Hackathon`, Sydney `ap-southeast-2`) with 100% catalog parity, 49 indexes, 38 RLS policies, and Auth user preservation.
- **Entity-Relationship Diagram (`database/diagrams/schema_erd.mmd`):**
  - Updated Mermaid ERD with all 15 tables, reconciled attributes, foreign keys, and cardinalities.
- **Verification Suites (`database/tests/test_schema.sql`):**
  - Updated schema integrity test suite validating all 16 tables, billing period uniqueness, core functions, and RLS enablement.

---

## [0.3.0] - 2026-10-31

### Added
- **Auth Database Integration (`database/migrations/005_auth_trigger.sql`):**
  - Automated trigger `trg_on_auth_user_created` on `auth.users` provisioning `public.profiles`.
  - Security hardening: Strictly reads role from `raw_app_meta_data` or defaults to `'customer'`, actively preventing privilege escalation via client-editable `raw_user_meta_data`.
  - Synchronization trigger `trg_on_auth_user_updated` maintaining email/phone parity.
- **Backend Auth Architecture (`backend/`):**
  - `backend/src/config/supabase.js`: Factory for standard, admin (`service_role`), and user-scoped (`getUserSupabaseClient`) clients enforcing RLS.
  - `backend/src/middleware/auth.js`: Token authentication via `supabase.auth.getUser()` and role-based access control middleware `requireRole()`.
  - `backend/src/routes/authRoutes.js`: Endpoints for `/register`, `/login`, `/logout`, and `/me`.
  - `backend/src/routes/protectedRoutes.js`: Customer and Staff/Admin protected endpoints demonstrating RLS and RBAC.
- **Frontend Auth Architecture (`frontend/`):**
  - `frontend/src/config/supabaseClient.js`: Browser Supabase client initialization.
  - `frontend/src/context/AuthContext.jsx`: React Auth provider managing user, session, profile, and role state with live `onAuthStateChange` listeners.
  - `frontend/src/components/ProtectedRoute.jsx`: Declarative route protection component supporting authentication verification and role restriction.
  - `frontend/src/AppExample.jsx`: Comprehensive React Router v6 routing harness.

---

## [0.2.0] - 2026-10-31

### Added
- **Core Migrations (`database/migrations/`):**
  - `001_initial_schema.sql`: 15 relational tables across Identity, Catalogue, Plans, Quotations, Subscriptions, Taxes, Discounts, Invoices, and Payments.
  - `002_constraints_and_functions.sql`: Automated `updated_at` triggers, automated payment reconciliation, next-billing-date calculator, and atomic, idempotent recurring billing procedure `fn_generate_due_invoice()`.
  - `003_rls_policies.sql`: Row Level Security policies with strict customer isolation (`customer_id = auth.uid()`), public catalog browsing, and staff/admin role protection.
  - `004_indexes.sql`: Foreign key join indexes, partial index on due subscriptions (`idx_subscriptions_due_billing`), overdue invoice index (`idx_invoices_overdue`), and payment revenue reporting index (`idx_payments_reporting`).
- **Seed Datasets (`database/seeds/`):**
  - `001_seed_initial_data.sql`: 1 Admin, 1 Staff, 2 Customers, Products with Odoo Brand variant (+560.00), Daily/Weekly/Monthly/Yearly plans, Subscriptions across all lifecycle states, Invoices, Discounts, and Payments.
  - `002_performance_benchmark_seed.sql`: Scalable procedure `sp_generate_benchmark_dataset(2500)` generating 2,500 subscriptions and invoices for performance testing.
- **Verification Suites (`database/tests/`):**
  - `test_schema.sql`: Validates table presence and recurring billing uniqueness constraint.
  - `test_billing_integrity.sql`: Asserts idempotency of billing generation, duplicate prevention, and payment reconciliation.
  - `test_rls.sql`: Asserts customer isolation across Customer A and Customer B.
  - `test_benchmark.sql`: Evaluates query execution plans targeting `< 2s` response for due subscriptions, overdue invoices, and revenue summaries.
- **Diagrams & Documentation:**
  - `database/diagrams/schema_erd.mmd`: Updated Mermaid Entity-Relationship Diagram.
  - `docs/DATABASE_DESIGN.md`: Full architectural specification and data dictionary.
  - `docs/DATABASE_IMPLEMENTATION_CHECKLIST.md`: Updated execution status.

### Security & Invariants
- Enforced `NUMERIC(12, 2)` across all financial attributes.
- Established `uq_subscription_billing_period UNIQUE (subscription_id, billing_period_start)` on `invoices`.
- Verified target separation: Dev project (`sldgofxhcfswcmcpebwv`) isolated; Shared project (`bdmwwpfglitcpagwblmk`) protected.

---

## [0.1.0] - 2026-10-30

### Added
- Created complete, professional `database/` directory hierarchy on feature branch `feature/harsha-supabase-setup`.
- Updated `.gitignore` to allow tracked version-controlled SQL files in `database/`.
- Established persistent Antigravity workspace project instructions in `GEMINI.md`.
