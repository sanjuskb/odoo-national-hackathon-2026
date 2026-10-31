# Database Migrations
## Odoo National Level Hackathon 2026

**Assigned Engineer:** Harsha (`harsha-1706`), Database Engineer  
**Dedicated Branch:** `feature/harsha-supabase-setup`  
**Status:** Module 1 — Database Foundation Ready  

---

## 1. Migration Standards & Principles

All database schema evolutions must be performed via sequential, reproducible SQL migration files in this directory.

1. **Ordering & Prefixing:**
   - Timestamp and sequence numbered prefixes: `YYYYMMDD_NNN_<description>.sql`.
   - Migration numbering reflects strict dependency order (core tables -> RPC functions -> enhancements, indexes, and triggers).
2. **Idempotency & Safety:**
   - Use `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `DROP TRIGGER IF EXISTS`, `DROP POLICY IF EXISTS`, etc., to allow safe re-execution.
   - Every migration must be wrapped in a transaction block (`BEGIN; ... COMMIT;`).
3. **Execution Records:**
   - Maintain a record of executed migrations both in the database and in `database/history/CHANGELOG.md`.

---

## 2. Migration Registry

| Sequence / File Name | Description | Author | Dependencies | Scope & Status |
|---|---|---|---|---|
| `20261031_001_brightloop_core.sql` | Core schema: 14 domain tables, Auth customer profile trigger, Auth app_metadata role sync trigger, basic indexes, read RLS policies. | Sanju / Team | None | Foundation Core Baseline |
| `20261031_002_atomic_billing_rpc.sql` | Transactional billing RPC `persist_due_billing_invoice` for atomic invoice creation, line snapshots, discount redemptions, and cursor advance. | Sanju / Team | `20261031_001` | Atomic Billing Transaction |
| `20261031_003_foundation_enhancements.sql` | Module 1 Foundation Hardening: automated `set_updated_at()` trigger, `prevent_role_escalation()` guard, missing foreign key indexes, profile contact attributes, catalogue active flags/SKU, staff RLS write policies, and AI assistance events table. | Harsha | `20261031_001`, `20261031_002` | Module 1 — Foundation Hardening |

---

## 3. Planned Subsequent Modules

- **Module 2:** Constraints, Functions & Billing Procedure Hardening (Concurrency stress tests, reconciliation procedures).
- **Module 3:** Row Level Security (RLS) Complete Access Control (Multi-role matrix verification, anonymous blocks).
- **Module 4:** Query Performance Optimization & Benchmark Indexes (Composite query execution plan acceleration for `< 2s` SLA).
- **Module 5:** Seed Datasets & Production Demonstration Data (Demo scenarios, multi-variant subscriptions, benchmark data).
