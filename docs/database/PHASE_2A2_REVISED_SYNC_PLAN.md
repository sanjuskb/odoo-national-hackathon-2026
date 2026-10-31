# Phase 2A.2: Revised Safe Synchronization Execution Plan
## Brightloop Software Subscription Management System — Odoo National Level Hackathon 2026

**Author:** Harsha (`harsha-1706`), Database Engineer  
**Workspace:** `E:\Projects\Odoo-Team`  
**Active Working Branch:** `feature/harsha-supabase-setup`  
**Remote Upstream:** `origin/feature/harsha-supabase-setup`  
**Date:** 2026-10-31  
**Execution Status:** READ-ONLY PLAN & VERIFIED BACKUP MANIFEST (AWAITING APPROVAL)  

---

## 1. Verified Fresh Git State

A fresh forensic verification of the repository state was executed on 31 October 2026 at 12:43 UTC+5:30:

```
Branch:                     feature/harsha-supabase-setup
Local HEAD Commit:          c8963d4f8a741c2dc5ec6d16ed76dc7b8c501280
Remote Tracking HEAD:       45da4a986bb5db1077fc10c5d3537010bddc7722
Divergence Count:           0 ahead, 89 behind
Staged Changes:             None (git diff --cached is clean)
Unstaged Tracked Changes:   6 files modified (database/ and docs/ assets only)
Untracked Files:            database/migrations 001..005, seeds, tests, schemas, ERD, docs/database/, frontend/, backend/
```

### 1.1 Remote Head Update Analysis
The remote tracking branch `origin/feature/harsha-supabase-setup` was updated to `45da4a9` (`fix(db): backfill existing Auth users and honor server-controlled role metadata`).
- This update brought in Sanju's PR #15 proposed migrations (`20261031_001_brightloop_core.sql` and `20261031_002_atomic_billing_rpc.sql`) directly into the remote tracking branch.
- Forensic diff check (`git diff --stat c8963d4..45da4a9 -- database/`) confirmed: **None of Harsha's tracked files (`database/diagrams/README.md`, `database/history/CHANGELOG.md`, `database/supabase/health_check.js`, `database/tests/run_tests.js`, `docs/DATABASE_DESIGN.md`, `docs/DATABASE_IMPLEMENTATION_CHECKLIST.md`) were modified by any of the remote commits.**

### 1.2 Ancestry Verification Result
```bash
git merge-base --is-ancestor HEAD origin/feature/harsha-supabase-setup
# Exit code: 0 (True)
```
- **Finding:** Local HEAD (`c8963d4`) is an **exact direct ancestor** of remote tracking head `45da4a9`.
- **Significance:** A 100% fast-forward synchronization (`git merge --ff-only`) is mathematically possible. Zero merge commits, rebases, or history rewrites are required.

---

## 2. External Backup Manifest (Zero Source Mutation)

In strict accordance with Step 1, an external backup was created in `E:\Projects\Odoo-Team-Backup-Harsha\backend\`.
- All six local backend files were individually copied.
- **Source files in `E:\Projects\Odoo-Team\backend\` were NOT deleted or moved.**
- SHA-256 cryptographic parity was verified bit-for-bit for every file:

| Relative File Path | Original SHA-256 Hash (`backend/`) | Backup SHA-256 Hash (`E:\Projects\Odoo-Team-Backup-Harsha\backend\`) | Bit-for-Bit Match |
|---|---|---|---|
| `package.json` | `A8708AAB1E163129ED10587261414340CD26ED3EDEC637DFA776E4269F93AB54` | `A8708AAB1E163129ED10587261414340CD26ED3EDEC637DFA776E4269F93AB54` | **VERIFIED (`True`)** |
| `src/app.js` | `EAC7D42877E7631A91964AB35C51CE71C358A8FFB649C9DE0D5306B5E43A27FF` | `EAC7D42877E7631A91964AB35C51CE71C358A8FFB649C9DE0D5306B5E43A27FF` | **VERIFIED (`True`)** |
| `src/config/supabase.js` | `7FD13EC875D9B42A65B0179543A41D7B2F6B638C4E31CED442BE7A2D5ACBC271` | `7FD13EC875D9B42A65B0179543A41D7B2F6B638C4E31CED442BE7A2D5ACBC271` | **VERIFIED (`True`)** |
| `src/middleware/auth.js` | `C564BBA404F0DF92E8563D005DCC5DECBC18CD1DDBABFE831A570785DCA4ED4A` | `C564BBA404F0DF92E8563D005DCC5DECBC18CD1DDBABFE831A570785DCA4ED4A` | **VERIFIED (`True`)** |
| `src/routes/authRoutes.js` | `5CEBEE68BF53C92B5B8FA6EB59F11E999D0A9E200534D21A5996AB34A6015318` | `5CEBEE68BF53C92B5B8FA6EB59F11E999D0A9E200534D21A5996AB34A6015318` | **VERIFIED (`True`)** |
| `src/routes/protectedRoutes.js`| `5CB59AE3B2851BE8DA97B0694EAD311A2E07B673576192347C8E883EF94213DE` | `5CB59AE3B2851BE8DA97B0694EAD311A2E07B673576192347C8E883EF94213DE` | **VERIFIED (`True`)** |

---

## 3. Path-Level Collision Analysis & Preservation of Local Work

### 3.1 Path Collision Classification
By comparing `git ls-files --others --exclude-standard backend` against `git ls-tree -r 45da4a9 backend`, the exact collisions were isolated:

| Local Untracked Path | Exists in Remote Tree `45da4a9`? | Collision Status | Minimum Safe Action Proposed |
|---|---|---|---|
| `backend/package.json` | **YES** (`5c5dcc7...`) | **BLOCKING COLLISION** | Temporarily rename to `backend/package.json.harsha-local` |
| `backend/src/app.js` | **YES** (`5be0ef7...`) | **BLOCKING COLLISION** | Temporarily rename to `backend/src/app.js.harsha-local` |
| `backend/src/config/supabase.js` | **NO** (Remote has `src/lib/supabase.js`) | **NON-COLLIDING** | Keep in place untouched |
| `backend/src/middleware/auth.js` | **NO** (Remote has `middleware/authenticate.js`) | **NON-COLLIDING** | Keep in place untouched |
| `backend/src/routes/authRoutes.js` | **NO** (Remote has `routes/auth.routes.js`) | **NON-COLLIDING** | Keep in place untouched |
| `backend/src/routes/protectedRoutes.js`| **NO** (Remote has `admin.routes.js`, etc.)| **NON-COLLIDING** | Keep in place untouched |

> [!NOTE]
> **Minimal Path Mutation:**  
> We do NOT delete files. We do NOT recursively remove `backend/src`.  
> Only the two directly colliding files (`backend/package.json` and `backend/src/app.js`) need temporary side-by-side renaming (`.harsha-local`) during the fast-forward step, ensuring zero overwrite risk.

---

### 3.2 Integration Note for Amarnadh: JWT Forwarding & RLS Scoped Client
Harsha's local exploration in `backend/src/config/supabase.js` authored an architectural pattern critical for Amarnadh:

```javascript
/**
 * Scoped client factory that passes the incoming user's JWT.
 * Ensures all Supabase queries executed by the backend strictly enforce
 * PostgreSQL Row Level Security (RLS) policies as that specific authenticated user.
 */
export function getUserSupabaseClient(token) {
  return createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  });
}
```

#### Why This Matters for Backend Security:
1. `backend/src/lib/supabase.js` currently provides only `getSupabaseAdmin()`, which uses the `SUPABASE_SERVICE_ROLE_KEY`.
2. Queries made with `service_role` completely bypass PostgreSQL Row Level Security.
3. For Customer Portal endpoints (`GET /api/v1/portal/subscriptions`, `GET /api/v1/portal/invoices`), querying via `getUserSupabaseClient(req.token)` forwards the user's JWT directly to PostgreSQL. PostgreSQL then automatically enforces `customer_id = auth.uid()` inside the database engine.
4. **Handoff Action:** In Phase 2B, this factory will be provided to Amarnadh as a CommonJS utility in `backend/src/lib/supabase.js` (`getUserSupabaseClient(token)`).

---

## 4. Exact Fast-Forward Synchronization Commands (Awaiting Approval)

Per your instructions, **no commit is created before synchronization.** The fast-forward is executed directly after resolving only the two blocking paths:

```powershell
# ==============================================================================
# PHASE 2A.2 — FAST-FORWARD SYNCHRONIZATION EXECUTION SEQUENCE
# ==============================================================================

# 1. Temporarily rename ONLY the two blocking colliding files (external backup already verified)
Rename-Item -Path "backend/package.json" -NewName "package.json.harsha-local"
Rename-Item -Path "backend/src/app.js" -NewName "app.js.harsha-local"

# 2. Execute fast-forward only merge using the remote tracking reference
git merge --ff-only origin/feature/harsha-supabase-setup

# 3. Verify that local HEAD now points to 45da4a986bb5db1077fc10c5d3537010bddc7722
git rev-parse HEAD

# 4. Verify branch tracking state (Expect: ahead 0, behind 0)
git status --short --branch
```

---

## 5. Post-Sync Reconciliation & Integrity Checks

Immediately following fast-forward execution:
1. **Remote History Verification:** Verify `git log -1` matches `45da4a9` (`fix(db): backfill existing Auth users...`).
2. **Local Work Availability Check:**
   - Confirm all local migrations (`database/migrations/001..005.sql`) remain present and untracked.
   - Confirm canonical schema (`database/schema/01_brightloop_schema.sql`) remains present.
   - Confirm seeds and test scripts in `database/seeds/` and `database/tests/` remain present.
   - Confirm all 10 audit and plan documents in `docs/database/` remain present.
   - Confirm frontend scaffold in `frontend/src/` remains present.
3. **Schema Reconciliation:**
   - Inspect the remote migrations brought in by PR #15 (`database/migrations/20261031_001_brightloop_core.sql` and `20261031_002_atomic_billing_rpc.sql`).
   - Synthesize Harsha's 15 core entities, triggers, and constraints into the finalized sequential migration suite.

---

## 6. File-by-File Staging Proposal for the First Database PR

To avoid staging broad directories automatically, the first database PR will stage only reviewed database architecture and documentation assets:

### Proposed Staged File List:
| File Path | Git Action | Purpose |
|---|---|---|
| `docs/database/PHASE_0_*.md` (5 files) | **Added (`A`)** | Phase 0 Discovery & Forensic Audit Reports. |
| `docs/database/PHASE_1_*.md` (5 files) | **Added (`A`)** | Phase 1 Contract Freeze, Mapping & Implementation Plans. |
| `docs/database/PHASE_2A*.md` (2 files) | **Added (`A`)** | Phase 2A Safe Synchronization Plans & Manifests. |
| `docs/DATABASE_DESIGN.md` | **Modified (`M`)** | Synchronized 15-entity relational specification. |
| `docs/DATABASE_IMPLEMENTATION_CHECKLIST.md` | **Modified (`M`)** | Updated implementation tracking checklist. |
| `database/diagrams/README.md` | **Modified (`M`)** | Updated ERD documentation and Mermaid specifications. |
| `database/diagrams/schema_erd.mmd` | **Added (`A`)** | Visual Mermaid ERD source. |
| `database/history/CHANGELOG.md` | **Modified (`M`)** | Updated architecture iteration changelog. |
| `database/migrations/001_initial_schema.sql` | **Added (`A`)** | Reconciled 15 core relational tables. |
| `database/migrations/002_constraints_and_functions.sql`| **Added (`A`)** | Triggers + `persist_due_billing_invoice` RPC. |
| `database/migrations/003_rls_policies.sql` | **Added (`A`)** | Hardened Row Level Security policies. |
| `database/migrations/004_indexes.sql` | **Added (`A`)** | Partial indexes for due subscriptions & overdue reporting. |
| `database/migrations/005_auth_trigger.sql` | **Added (`A`)** | Profile creation & role metadata sync triggers. |
| `database/migrations/006_ai_assistance_events.sql` | **Added (`A`)** | Dedicated AI assistance call persistence table. |
| `database/schema/01_brightloop_schema.sql` | **Added (`A`)** | Canonical consolidated DDL. |
| `database/seeds/001_seed_initial_data.sql` | **Added (`A`)** | Verified demonstration seed dataset. |
| `database/seeds/002_performance_benchmark_seed.sql`| **Added (`A`)** | High-scale 2,500-subscription performance seed. |
| `database/tests/test_*.sql` (4 files) | **Added (`A`)** | SQL assertion test suites (schema, RLS, billing, benchmark). |
| `database/tests/run_tests.js` | **Modified (`M`)** | Test runner harness. |
| `database/supabase/health_check.js` | **Modified (`M`)** | Connection health inspection script. |

### Excluded from Staging (Preserved in Working Tree):
- `backend/package.json.harsha-local` & `app.js.harsha-local` (Preserved local exploration).
- `backend/src/config/supabase.js`, `middleware/auth.js`, `routes/authRoutes.js`, `routes/protectedRoutes.js` (Preserved for Amarnadh handoff).
- `frontend/package.json` & `frontend/src/` (Preserved for Ravi handoff).
- `.continue/` (IDE settings).
- `supabase/.temp/` (Local Supabase CLI cache).

---

## 7. Rollback & Disaster Recovery Procedure

1. **If Fast-Forward Fails:**  
   Because `git merge --ff-only` does not alter working tree files when it fails, local state remains 100% intact. Rename `package.json.harsha-local` back to `package.json`.
2. **If External Backup Needs Restoration:**  
   Execute:
   ```powershell
   Copy-Item "E:\Projects\Odoo-Team-Backup-Harsha\backend\package.json" "backend/package.json"
   Copy-Item "E:\Projects\Odoo-Team-Backup-Harsha\backend\src\app.js" "backend/src/app.js"
   ```
3. **Commit Reset (if staged prematurely):**  
   `git reset` without flags un-stages all files without modifying working tree content.

---

### STOP — READY FOR HARSHA'S REVIEW AND APPROVAL

The external backup is complete and cryptographically verified. No source files were deleted.

Please review the proposed minimal fast-forward sequence in Section 4 and provide your explicit authorization to proceed with **fast-forward synchronization**.

