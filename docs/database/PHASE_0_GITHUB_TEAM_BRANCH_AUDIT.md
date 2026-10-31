# Phase 0: GitHub Team Branch and Remote Audit
## Brightloop Software Subscription Management System — Odoo National Level Hackathon 2026

**Auditor:** Harsha (`harsha-1706`), Database Engineer  
**Workspace:** `E:\Projects\Odoo-Team`  
**Repository:** `https://github.com/sanjuskb/odoo-national-hackathon-2026`  
**Audit Date:** 2026-10-31  
**Audit Mode:** READ-ONLY Verification  

---

## 1. Remote Branch Enumeration and Tracking Status

All remote tracking branches were fetched from `origin` via `git fetch origin --prune` (without modifying local working files). Divergence was computed relative to `origin/develop` (`74a226f`).

| Remote Branch | Latest Commit SHA | Commit Date (UTC/Local) | Author | Commit Message | Behind develop | Ahead develop | Status / Activity |
|---|---|---|---|---|---|---|---|
| `origin/main` | `b442b19` | 2026-10-31 06:07:53 UTC | sanjay kumar | `chore(main): bootstrap release workflow checks without shipping unfinished app` | 57 | 9 | Active (Release Gate) |
| `origin/develop` | `74a226f` | 2026-10-31 06:06:34 UTC | sanjay kumar | `docs: publish verified integration status to all developers` | 0 | 0 | Baseline / Active |
| `origin/feature/harsha-supabase-setup` | `97bddbc` | 2026-10-31 05:56:55 UTC | sanjay kumar | `chore(db): synchronize Harsha branch with verified shared baseline` | 31 | 5 | Active (Harsha Remote Head, PR #4 merged) |
| `origin/chore/harsha-safe-sync` | `c7695bb` | 2026-10-31 05:56:33 UTC | sanjay kumar | `chore(sync): reconcile Harsha Supabase scaffold with tested backend and billing develop` | 31 | 4 | Merged into `feature/harsha-supabase-setup` (PR #4) |
| `origin/feature/database-migration-baseline-review` | `a78c224` | 2026-10-31 06:04:35 UTC | sanjay kumar | `fix(db): backfill existing Auth users and honor server-controlled role metadata` | 31 | 8 | Open Review (PR #15 to `develop`) |
| `origin/feature/amarnath-backend-setup` | `de3e54a` | 2026-10-31 06:31:47 UTC | Amar | `docs(backend): add Supabase project ref and frontend anon key to handoff` | 46 | 2 | Active (Amarnadh latest commit) |
| `origin/feature/amarnath-backend` | `6d07f79` | 2026-10-31 05:50:35 UTC | sanjay kumar | `fix(integration): align contracts and merge tested deterministic billing module` | 31 | 0 | Merged / Synchronized |
| `origin/chore/amarnadh-phase1-integration` | `a5e3258` | 2026-10-31 06:00:56 UTC | sanjay kumar | `docs(api): align Amarnadh Phase 1 route proposal with Sanju billing ownership` | 18 | 0 | Merged into develop (PR #19) |
| `origin/feature/ravi-frontend` | `6d07f79` | 2026-10-31 05:50:35 UTC | sanjay kumar | `fix(integration): align contracts and merge tested deterministic billing module` | 31 | 0 | Stale / Scaffold only (Merged PR #11) |
| `origin/feature/ravi-architecture` | `6d07f79` | 2026-10-31 05:50:35 UTC | sanjay kumar | `fix(integration): align contracts and merge tested deterministic billing module` | 31 | 0 | Stale (Open PR #24 incorrectly targeting `main`) |
| `origin/feature/sanju-integration` | `b9ef254` | 2026-10-31 05:05:32 UTC | sanjay kumar | `docs: clarify Sanju invoice generation ownership` | 57 | 4 | Merged into `main` via PR #20 |
| `origin/feature/billing-express-adapter-review` | `6d98565` | 2026-10-31 06:03:18 UTC | sanjay kumar | `docs(billing): document Amarnadh Phase 1 middleware and SDK integration` | 5 | 0 | Merged into develop (PR #16) |
| `origin/chore/integration-repairs-31oct` | `8d614b7` | 2026-10-31 05:50:05 UTC | sanjay kumar | `docs(billing): package metadata and safe DB/Express integration contract` | 32 | 0 | Merged into develop (PR #14) |
| `origin/chore/integration-status-31oct` | `5dea0a3` | 2026-10-31 06:05:24 UTC | sanjay kumar | `docs(readme): link verified live integration status and blockers` | 1 | 0 | Merged into develop (PR #21) |
| `origin/chore/ci-security-gates-31oct` | `9fc6f1f` | 2026-10-31 05:59:05 UTC | sanjay kumar | `docs(git): explain CI release gate and required branch rule setting` | 27 | 0 | Merged into develop (PR #17) |
| `origin/chore/main-release-gate-bootstrap` | `401b673` | 2026-10-31 06:06:52 UTC | sanjay kumar | `fix(ci): allow only bootstrap PR #23, block all future feature-to-main merges` | 57 | 8 | Merged into main (PR #23) |
| `origin/chore/development-readiness` | `9b07a28` | 2026-10-31 04:06:21 UTC | sanjay kumar | `chore: make repository development-ready with CI, branch runbook and accurate PS docs` | 60 | 0 | Merged into develop (PR #3) |
| `origin/chore/personal-repo-permission-clarity` | `6d11e2f` | 2026-10-31 04:10:42 UTC | sanjay kumar | `docs: clarify personal-repo evaluator collaborator permissions and team ownership` | 58 | 0 | Merged into develop (PR #10) |
| `origin/chore/problem-statement-baseline` | `1cdbff4` | 2026-10-31 03:42:33 UTC | sanjay kumar | `docs(ps): establish traceable subscription management engineering baseline` | 65 | 0 | Merged into develop (PR #1) |

---

## 2. Branch Ownership and Workstream Mapping

Evidence sources used to assign ownership: Git author identities, commit signatures, PR descriptions and authors, file paths modified, and architectural role assignments.

| Developer | Assigned Workstream | Primary Branches | Latest Discovered Commit | Work Completed on Remote | Unmerged Work | Upstream Dependencies |
|---|---|---|---|---|---|---|
| **Harsha** (`harsha-1706`) | PostgreSQL, schema, migrations, RLS, indexes, billing integrity | `feature/harsha-supabase-setup` (local & remote), `chore/harsha-safe-sync` | `97bddbc` (remote head) / `c8963d4` (local commit) | PR #4 merged into remote branch, synchronizing develop baseline | Local untracked SQL migrations `001..005`, seeds, tests, ERD; Remote PR #15 review proposed by Sanju | Express API contracts (Amarnadh), billing calculation schemas (Sanju), Supabase Auth (`auth.users`) |
| **Amarnadh** (`amarnathgaddam75`) | Backend APIs, Express, Auth/RBAC, billing integration | `feature/amarnath-backend-setup`, `feature/amarnath-backend`, `chore/amarnadh-phase1-integration` | `de3e54a` (`docs(backend): add Supabase project ref...`) | Express server, Auth controllers/routes, RBAC middleware, 29 Vitest tests, handoff documentation | `de3e54a` & `354400f` on `feature/amarnath-backend-setup` (handoff docs & live smoke check) not yet PR'd to develop | Supabase `profiles` table and role synchronization trigger (Harsha), billing runner (Sanju) |
| **Ravi** (`donnyravi-alt`) | Architecture leadership, Frontend UI, Customer Portal | `feature/ravi-frontend`, `feature/ravi-architecture` | `6d07f79` (`fix(integration): align contracts...`) | Architecture and frontend plan docs; PR #11 merged into `main` | No React frontend code has been committed to remote repository (scaffold only); PR #24 open to `main` | Backend API routes `/api/v1` (Amarnadh), Supabase anon credentials, Auth cookies/JWT |
| **Sanju** (`sanjuskb`) | Team leadership, billing calculations, integration QA, AI | `develop`, `chore/integration-*`, `feature/billing-express-adapter-review`, `feature/database-migration-baseline-review` | `74a226f` (`docs: publish verified integration status...`) | Deterministic billing calculator (`calculator.cjs`, `runner.cjs`, `recurrence.cjs`) with 16 tests; Express billing trigger route; CI workflows; PR #15 database proposal | PR #15 (proposed database migrations `20261031_001` & `002`); AI module code is uncommitted on remote | Atomic database billing RPC `persist_due_billing_invoice` (Harsha), Auth user identity |

---

## 3. GitHub Pull Request Audit

Full audit of repository pull requests performed via GitHub API:

| PR # | State | Title | Author | Source Branch -> Target Branch | Merged At | Status & Harsha Impact Analysis |
|---|---|---|---|---|---|---|
| **#4** | **CLOSED (MERGED)** | `chore(sync): safely bring latest develop into Harsha's Supabase branch` | `sanjuskb` | `chore/harsha-safe-sync` -> `feature/harsha-supabase-setup` | `2026-10-31T05:56:56Z` (Commit `97bddbc`) | **MERGED.** Resolves divergence by bringing official PS, CI, and contract handoff into Harsha's remote branch. Local branch is 39 commits behind origin because local has uncommitted files. **DO NOT re-merge PR #4.** |
| **#15** | **OPEN** | `feat(db): proposed Brightloop schema, RLS and atomic billing RPC — Harsha review` | `sanjuskb` | `feature/database-migration-baseline-review` -> `develop` | Open | **CRITICAL REVIEW NEEDED.** Proposes `20261031_001_brightloop_core.sql` and `20261031_002_atomic_billing_rpc.sql`. Designed specifically to satisfy Sanju's billing runner and Amarnadh's backend. Requires Harsha's architectural validation before any database execution. |
| **#24** | **OPEN** | `Feature/ravi architecture` | `sanjuskb` | `feature/ravi-architecture` -> `main` | Open | **INVALID TARGET.** Targets `main` directly instead of `develop`. Contains no actual React frontend code (only docs & billing merge). Violates branch release flow rules. |
| **#22** | **OPEN** | `Develop` | `sanjuskb` | `develop` -> `main` | Open | Release candidate PR. Blocked by CI until integrated vertical slice is verified. |
| **#23** | **CLOSED (MERGED)** | `chore(main): install branch-flow and secret gates without shipping unfinished app` | `sanjuskb` | `chore/main-release-gate-bootstrap` -> `main` | `2026-10-31T06:07:53Z` | Merged bootstrap CI gate into main. |
| **#21** | **CLOSED (MERGED)** | `docs: publish verified Brightloop integration snapshot and remaining blockers` | `sanjuskb` | `chore/integration-status-31oct` -> `develop` | `2026-10-31T06:06:35Z` | Merged integration status tracking. |
| **#20** | **CLOSED (MERGED)** | `Feature/sanju integration` | `sanjuskb` | `feature/sanju-integration` -> `main` | `2026-10-31T06:04:54Z` | Merged invoice ownership doc update into main. |
| **#19** | **CLOSED (MERGED)** | `feat(backend): merge Amarnadh Phase 1 authentication/RBAC without losing shared billing changes` | `sanjuskb` | `chore/amarnadh-phase1-integration` -> `develop` | `2026-10-31T06:01:37Z` | Integrated Amarnadh's Auth/RBAC into develop with 29 passing Vitest tests. |
| **#18** | **CLOSED (MERGED)** | `feat(backend): Phase 1 Supabase Auth, RBAC, security middleware and tests` | `sanjuskb` | `feature/amarnath-backend-setup` -> `develop` | `2026-10-31T06:01:40Z` | Backend foundation merged into develop. |
| **#17** | **CLOSED (MERGED)** | `chore(ci): verify tracked credentials and enforce feature -> develop -> main flow` | `sanjuskb` | `chore/ci-security-gates-31oct` -> `develop` | `2026-10-31T05:59:24Z` | CI pipeline installed for secret detection and PR gating. |
| **#16** | **CLOSED (MERGED)** | `feat(backend): protected billing Express route and Supabase adapter — review before live use` | `sanjuskb` | `feature/billing-express-adapter-review` -> `develop` | `2026-10-31T06:04:03Z` | Express route `POST /api/v1/billing/run` and `supabaseBillingRepository.cjs` merged into develop. |
| **#14** | **CLOSED (MERGED)** | `fix(integration): align owners/contracts, enforce CI and add deterministic billing unit` | `sanjuskb` | `chore/integration-repairs-31oct` -> `develop` | `2026-10-31T05:50:36Z` | Deterministic billing calculator added to develop with 16 tests. |
| **#13** | **CLOSED (MERGED)** | `docs: assign Sanju deterministic billing ownership and AI integration scope` | `sanjuskb` | `feature/sanju-integration` -> `develop` | - | Merged documentation. |
| **#12** | **CLOSED (MERGED)** | `feat(backend): integrate Amarnadh Phase 0 Express scaffold and health tests` | `sanjuskb` | `feature/amarnath-backend-setup` -> `develop` | `2026-10-31T05:45:50Z` | Phase 0 backend Express app and health test merged. |
| **#11** | **CLOSED (MERGED)** | `Feature/ravi frontend` | `sanjuskb` | `feature/ravi-frontend` -> `main` | `2026-10-31T04:18:33Z` | Merged initial frontend docs/structure into main. |
| **#10** | **CLOSED (MERGED)** | `docs: clarify personal-account collaborator access and architecture ownership` | `sanjuskb` | `chore/personal-repo-permission-clarity` -> `develop` | `2026-10-31T04:11:34Z` | Team collaborator policy clarified. |
| **#3** | **CLOSED (MERGED)** | `chore: development-ready Git workflow, CI and official PS documentation` | `sanjuskb` | `chore/development-readiness` -> `develop` | `2026-10-31T04:06:58Z` | Initial repository structure and official PS ingestion. |
| **#2** | **CLOSED (MERGED)** | `chore: reconcile main README-only history into develop` | `sanjuskb` | `main` -> `develop` | `2026-10-31T04:03:35Z` | Git history reconciliation. |
| **#1** | **CLOSED (MERGED)** | `docs: official Subscription Management System PS and implementation baseline` | `sanjuskb` | `chore/problem-statement-baseline` -> `develop` | `2026-10-31T03:51:28Z` | Transcription of official problem statement. |

---

## 4. Assigned Issue #7 Audit

- **Issue:** `#7 — [P0][Harsha] Shared Supabase schema, RLS and recurring invoice uniqueness`
- **Assigned To:** `harsha-1706` (Harsha)
- **Status:** Open
- **Key Mandates:**
  1. Review official subscription PS and DB proposal.
  2. Confirm shared Supabase project connectivity (`bdmwwpfglltcpagwblmk`).
  3. Implement migrations: products/variants, plans, quote templates, subscriptions/lines, invoices/lines, discounts, payments, and profiles/roles.
  4. Enforce unique invoice per `(subscription_id, billing_period_start)`.
  5. Enforce decimal money (`NUMERIC(14,2)` or `NUMERIC(12,2)`), foreign keys, and transactionally safe billing.
  6. Configure and test RLS: ensure customer isolation (cannot read other customer subscriptions/invoices).
  7. Generate synthetic demo seed data and benchmark thousands of subscriptions.
  8. Do NOT force-push or reset branch history.
  9. Deliver verified schema via a dedicated feature PR targeting `develop`.

