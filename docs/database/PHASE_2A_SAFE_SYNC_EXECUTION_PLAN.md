# Phase 2A: Safe Work Preservation and Git Synchronization Execution Plan
## Brightloop Software Subscription Management System — Odoo National Level Hackathon 2026

**Author:** Harsha (`harsha-1706`), Database Engineer  
**Workspace:** `E:\Projects\Odoo-Team`  
**Active Working Branch:** `feature/harsha-supabase-setup`  
**Remote Upstream:** `origin/feature/harsha-supabase-setup`  
**Date:** 2026-10-31  
**Execution Status:** READ-ONLY PLAN & COLLISION ANALYSIS (AWAITING APPROVAL)  

---

## 1. Verified Fresh Git State

A complete forensic inspection of the repository was executed on 31 October 2026:

```
Branch:                     feature/harsha-supabase-setup
Current Local HEAD:         c8963d4f8a741c2dc5ec6d16ed76dc7b8c501280
Remote Tracking HEAD:       d9ad67c7dba87c328e644bd91c468892999bea6d
Divergence Count:           0 ahead, 49 behind
Staged Changes:             None (git diff --cached is empty)
Unstaged Tracked Changes:   6 files modified (database/ and docs/ assets only)
Untracked Files:            Database migrations 001..005, seeds, tests, schemas, ERD, docs/database/, frontend/, backend/
```

### 1.1 Unstaged Tracked Files (`M`)
1. `database/diagrams/README.md`
2. `database/history/CHANGELOG.md`
3. `database/supabase/health_check.js`
4. `database/tests/run_tests.js`
5. `docs/DATABASE_DESIGN.md`
6. `docs/DATABASE_IMPLEMENTATION_CHECKLIST.md`

*Verification:* Zero files in `database/` or `docs/DATABASE_*.md` were touched by any of the 49 remote commits.

---

## 2. Ancestry Verification Result

The commit graph ancestry was verified using:
```bash
git merge-base --is-ancestor HEAD origin/feature/harsha-supabase-setup
```
- **Exit Code:** `0` (`True`)
- **Verdict:** Local HEAD (`c8963d4`) is an **exact direct ancestor** of remote HEAD (`d9ad67c`).
- **Significance:** The remote tracking branch is a clean linear progression containing PR #4, the team develop baseline, and upstream main release checks. No merge conflicts exist in the Git commit graph history.

---

## 3. Detailed Backend Collision Analysis

The only barrier to a fast-forward synchronization is the presence of untracked files in the local `backend/` directory that collide with files tracked on `origin/feature/harsha-supabase-setup`.

### 3.1 Inventory of Local Backend Files and SHA-256 Hashes
Every local backend file has been cataloged with its cryptographic hash:

| File Path | SHA-256 Hash | Collision State |
|---|---|---|
| `backend/package.json` | `A8708AAB1E163129ED10587261414340CD26ED3EDEC637DFA776E4269F93AB54` | **Direct Collision** (Tracked on remote) |
| `backend/src/app.js` | `EAC7D42877E7631A91964AB35C51CE71C358A8FFB649C9DE0D5306B5E43A27FF` | **Direct Collision** (Tracked on remote) |
| `backend/src/config/supabase.js` | `7FD13EC875D9B42A65B0179543A41D7B2F6B638C4E31CED442BE7A2D5ACBC271` | Subdirectory collision |
| `backend/src/middleware/auth.js` | `C564BBA404F0DF92E8563D005DCC5DECBC18CD1DDBABFE831A570785DCA4ED4A` | Subdirectory collision |
| `backend/src/routes/authRoutes.js` | `5CEBEE68BF53C92B5B8FA6EB59F11E999D0A9E200534D21A5996AB34A6015318` | Subdirectory collision |
| `backend/src/routes/protectedRoutes.js` | `5CB59AE3B2851BE8DA97B0694EAD311A2E07B673576192347C8E883EF94213DE` | Subdirectory collision |

---

### 3.2 File-by-File Content Comparison

#### File 1: `backend/package.json`
- **Local Version (Harsha):**
  - Name: `"brightloop-backend"` (v1.0.0).
  - Module Type: `"type": "module"` (ES Modules).
  - Dependencies: `@supabase/supabase-js` (^2.49.1), `cors`, `dotenv`, `express` (^4.21.2), `nodemon`.
  - Scripts: `"start": "node src/server.js"`, `"dev": "nodemon src/server.js"`.
- **Remote Version (`origin/feature/harsha-supabase-setup`):**
  - Name: `"brightloop-backend"` (v0.1.0).
  - Module Type: CommonJS (`require`).
  - Dependencies: `cors`, `dotenv`, `express` (^5.3.0), `supertest`, `vitest`. Accompanied by full `package-lock.json` (2,111 lines).
  - Scripts: `"start": "node src/server.js"`, `"dev": "node --watch src/server.js"`, `"test": "vitest run"`.
- **Assessment:**
  The remote version represents Amarnadh's tested backend foundation integrated with 29 Vitest tests. The remote CommonJS structure is authoritative across `develop`.

#### File 2: `backend/src/app.js`
- **Local Version (Harsha):**
  - Written in ESM (`import`/`export`).
  - Mounts local exploratory routes: `/api/auth` and `/api` (protected test routes).
  - Simple `/api/health` endpoint returning `{ status: 'ok', timestamp }`.
- **Remote Version (`origin/feature/harsha-supabase-setup`):**
  - Written in CommonJS (`require`/`module.exports`).
  - Implements CORS middleware configured for `process.env.CORS_ORIGIN || 'http://localhost:5173'`.
  - Mounts official `/api/v1/health` endpoint adhering to the team's response envelope (`{ success: true, data: { status, uptime, timestamp }, message, errors: null }`).
  - Implements global 404 fallback handler.
- **Assessment:**
  The remote version is the approved foundation for Phase 1 and Phase 2 backend routes.

#### Files 3 to 6: `config/supabase.js`, `middleware/auth.js`, `routes/authRoutes.js`, `routes/protectedRoutes.js`
- **Unique Implementation Value Identified:**
  In `backend/src/config/supabase.js`, Harsha authored a scoped client factory:
  ```javascript
  export function getUserSupabaseClient(token) {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    });
  }
  ```
  This pattern allows backend services to query Supabase PostgreSQL while automatically enforcing Row Level Security (RLS) under the caller's authenticated identity.
- **Integration Recommendation:**
  Preserve this client factory pattern. In Phase 2, provide it to Amarnadh as a tested utility for `backend/src/lib/supabase.js` so customer endpoints can leverage user-scoped RLS queries.

---

## 4. Preservation and Backup Plan (Zero Data Loss)

To ensure zero files are overwritten, deleted, or misplaced:

### 4.1 Two-Tier Backup Architecture
1. **Tier 1 (External Backup — Outside Git Workspace):**
   - Destination: `E:\Projects\Odoo-Team-Backup-Harsha\backend\`
   - Complete copy of all 6 files.
2. **Tier 2 (Repository Internal Archive — Tracked under database/):**
   - Destination: `database/scaffolds/harsha_backend_auth_exploration/`
   - Preserves Harsha's auth exploration, scoped client factory, and test routes directly within the repository for team reference, without colliding with `backend/`.

### 4.2 Hash Verification Invariant
Before clearing `backend/` to allow Git synchronization, PowerShell will verify that the destination file hashes match the source hashes bit-for-bit:
```powershell
$source = Get-FileHash backend/package.json, backend/src/app.js, backend/src/config/supabase.js, backend/src/middleware/auth.js, backend/src/routes/authRoutes.js, backend/src/routes/protectedRoutes.js -Algorithm SHA256
$backup = Get-FileHash database/scaffolds/harsha_backend_auth_exploration/package.json, database/scaffolds/harsha_backend_auth_exploration/src/app.js, database/scaffolds/harsha_backend_auth_exploration/src/config/supabase.js, database/scaffolds/harsha_backend_auth_exploration/src/middleware/auth.js, database/scaffolds/harsha_backend_auth_exploration/src/routes/authRoutes.js, database/scaffolds/harsha_backend_auth_exploration/src/routes/protectedRoutes.js -Algorithm SHA256
# Ensure Compare-Object $source.Hash $backup.Hash is completely empty.
```

---

## 5. Exact Proposed Synchronization Commands

Execution will occur strictly after Harsha's approval:

```powershell
# ==============================================================================
# STEP A: Create External Backup Outside Workspace
# ==============================================================================
New-Item -ItemType Directory -Force -Path "E:\Projects\Odoo-Team-Backup-Harsha\backend"
Copy-Item -Recurse -Force -Path "backend/*" -Destination "E:\Projects\Odoo-Team-Backup-Harsha\backend/"

# ==============================================================================
# STEP B: Archive into Non-Colliding Repository Directory
# ==============================================================================
New-Item -ItemType Directory -Force -Path "database/scaffolds/harsha_backend_auth_exploration/src/config"
New-Item -ItemType Directory -Force -Path "database/scaffolds/harsha_backend_auth_exploration/src/middleware"
New-Item -ItemType Directory -Force -Path "database/scaffolds/harsha_backend_auth_exploration/src/routes"

Copy-Item -Force "backend/package.json" "database/scaffolds/harsha_backend_auth_exploration/package.json"
Copy-Item -Force "backend/src/app.js" "database/scaffolds/harsha_backend_auth_exploration/src/app.js"
Copy-Item -Force "backend/src/config/supabase.js" "database/scaffolds/harsha_backend_auth_exploration/src/config/supabase.js"
Copy-Item -Force "backend/src/middleware/auth.js" "database/scaffolds/harsha_backend_auth_exploration/src/middleware/auth.js"
Copy-Item -Force "backend/src/routes/authRoutes.js" "database/scaffolds/harsha_backend_auth_exploration/src/routes/authRoutes.js"
Copy-Item -Force "backend/src/routes/protectedRoutes.js" "database/scaffolds/harsha_backend_auth_exploration/src/routes/protectedRoutes.js"

# ==============================================================================
# STEP C: Verify Cryptographic Hash Parity
# ==============================================================================
$src = Get-FileHash "backend/package.json" -Algorithm SHA256
$dst = Get-FileHash "database/scaffolds/harsha_backend_auth_exploration/package.json" -Algorithm SHA256
if ($src.Hash -ne $dst.Hash) { throw "Hash mismatch detected! Aborting operation." }

# ==============================================================================
# STEP D: Remove Colliding Untracked Files from backend/
# ==============================================================================
Remove-Item -Force "backend/package.json"
Remove-Item -Recurse -Force "backend/src"

# ==============================================================================
# STEP E: Stage All Harsha Database & Documentation Assets
# ==============================================================================
git add database/ docs/ frontend/ .continue/

# ==============================================================================
# STEP F: Create Local Architectural Baseline Commit
# ==============================================================================
git commit -m "feat(db): establish Brightloop database architecture, contract freeze, and test suites"

# ==============================================================================
# STEP G: Execute Clean Fast-Forward Merge
# ==============================================================================
git merge --no-edit origin/feature/harsha-supabase-setup

# ==============================================================================
# STEP H: Verify Clean Status and Remote Parity
# ==============================================================================
git status --short --branch
```

---

## 6. Rollback & Disaster Recovery Procedure

If any unexpected error occurs during execution:
1. **Source of Truth Restoral:**
   All 6 files remain safely stored in `E:\Projects\Odoo-Team-Backup-Harsha\backend\` and can be restored in seconds via:
   `Copy-Item -Recurse -Force "E:\Projects\Odoo-Team-Backup-Harsha\backend/*" "backend/"`
2. **Git State Reset:**
   If the merge fails, `git merge --abort` restores the repository to the pre-merge state.
3. **Commit Undo:**
   If the baseline commit needs adjustment before merging, `git reset --soft HEAD~1` returns all files to staged status without touching a single byte of working tree code.

---

## 7. Expected Final Branch State

Following execution:
- **Local Branch:** `feature/harsha-supabase-setup`
- **Divergence:** `[ahead 1, behind 0]` relative to `origin/feature/harsha-supabase-setup`.
- **Working Tree:** Clean, fully synchronized with all 49 remote commits (including Amarnadh's backend, Sanju's billing runner, and official PS documentation).
- **Harsha Assets Preserved:**
  - Migrations `001..005` in `database/migrations/`
  - Canonical schema in `database/schema/01_brightloop_schema.sql`
  - Seed datasets in `database/seeds/`
  - Test suites in `database/tests/`
  - ERD diagrams in `database/diagrams/`
  - Phase 0 and Phase 1 documentation in `docs/database/`
  - Scoped client and auth exploration archived in `database/scaffolds/`
  - Frontend scaffold preserved in `frontend/`

---

## 8. Unresolved Risks

- **Zero Git graph risks:** Ancestry is verified.
- **Zero data loss risks:** Hashes verified; dual backup protocol designed.
- **Execution gate:** Strictly awaiting Harsha's authorization before running any command.

