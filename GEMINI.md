# Antigravity Project Instructions — Database Development & GitHub Workflow
## Odoo National Level Hackathon 2026

**Assigned Engineer:** Harsha (`harsha-1706`), Database Engineer  
**Workspace Root:** `E:\Projects\Odoo-Team`  
**Official Repository:** `https://github.com/sanjuskb/odoo-national-hackathon-2026`  
**Dedicated Working Branch:** `feature/harsha-supabase-setup`  
**Integration Branch:** `develop`  
**Production/Release Branch:** `main`  

---

## 1. Role, Scope & Architecture Mandates

1. **Assigned Responsibility:**
   - Harsha (`harsha-1706`) is personally responsible for the complete database workstream: architecture, data modeling, ERD, canonical schema, SQL migrations, seed datasets, Row Level Security (RLS) policies, query optimization, database testing, Supabase integration, and technical documentation.
2. **Approved Technical Stack:**
   - **Primary Datastore:** Supabase PostgreSQL is the sole primary database for this application.
   - **Authentication:** Supabase Auth (`auth.users`) integrated with application user identities.
   - **Access Control:** PostgreSQL Row Level Security (RLS) enabled on all application tables with explicit deny-by-default policies.
   - **Backend Layer:** Node.js and Express APIs interacting via `@supabase/supabase-js` or direct pooled connections (`pg`).
3. **Workspace Isolation Restrictions:**
   - Work exclusively in `E:\Projects\Odoo-Team`.
   - Never inspect, modify, overwrite, delete, or migrate files from `E:\Projects\Odoo` (earlier legacy setup).
   - Never operate on the parent `E:\Projects` Git structure.
   - Never introduce MySQL or any secondary operational database into the team repository.
4. **Authoritative Requirements & Anti-Invention Policy:**
   - The official hackathon problem statement and approved mock dataset are the sole authoritative sources for all application-specific entities, attributes, constraints, business logic, and records.
   - **Never invent** speculative entities, columns, relationships, business rules, mock records, or arbitrary RLS policies.
   - Until official materials are provided, all domain-specific sections must strictly maintain the placeholder:
     `TO BE INSERTED — PENDING OFFICIAL PROBLEM STATEMENT AND APPROVED MOCK DATA`

---

## 2. Standard Workflow: DATABASE REQUIREMENTS INGESTION AND SYNCHRONIZATION

Whenever the user provides the official problem statement, approved mock data, or revised requirements, execute the following 10-step repeatable procedure:

1. **Ingest Supplied Materials:** Read and analyze the complete supplied problem statement, mock datasets, or specification revisions thoroughly. Do not assume external announcements are automatically visible; rely on materials provided in the chat or specified workspace locations.
2. **Deconstruct & Extract Requirements:** Extract entities, attributes, primary/foreign keys, cardinality, actor roles, state machines, business validation rules, and data constraints.
3. **Compare with Existing Workspace:** Systematically cross-reference extracted requirements against existing database documentation (`docs/DATABASE_DESIGN.md`, `docs/DATABASE_REQUIREMENTS_HANDOVER.md`), schema files, migrations, and seeds.
4. **Identify Gaps & Conflicts:** Detect missing fields, conflicting rules, or schema misalignments between new requirements and current files before writing any code.
5. **Formulate Change Proposal:** Present a concise summary of required schema modifications, new migrations, seed adaptations, and RLS adjustments for user alignment.
6. **Synchronize Database Assets:** Update canonical schema (`database/schema/`), author sequential migrations (`database/migrations/`), populate approved seed scripts (`database/seeds/`), configure RLS policies (`database/rls/`), and update ERDs (`database/diagrams/`).
7. **Verify Cross-File Consistency:** Ensure documentation (`docs/DATABASE_DESIGN.md`), integration guides (`docs/DATABASE_INTEGRATION_GUIDE.md`), and checklists (`docs/DATABASE_IMPLEMENTATION_CHECKLIST.md`) match the actual SQL implementation with zero contradictions.
8. **Execute Validation & Test Harness:** Run database health checks (`database/supabase/health_check.js`) and test assertion suites (`database/tests/run_tests.js`). Never report a test as passed unless it was genuinely executed and verified.
9. **Update Tracking & Reporting:** Log changes chronologically in `database/history/CHANGELOG.md` and report a full summary of updates, test results, and any unresolved domain questions.
10. **Await Explicit Approval:** Pause and request user approval before any destructive operation, live database migration execution, or external deployment.

---

## 3. GitHub & Branch Synchronization Protocol

1. **Branch Confinement:**
   - All database development, documentation, and configuration must remain on:
     `feature/harsha-supabase-setup`
   - Never commit directly to `main` or `develop`.
   - Never push to another team member's feature branch.
2. **Pre-Change Verification:**
   - Run `git status --short --branch` prior to initiating substantial file edits to confirm a clean or understood working state.
3. **Reviewed Commit-and-Push Workflow:**
   - **Automatic commits and automatic pushes are strictly disabled.**
   - All commits must be explicitly reviewed and authorized.
   - Commit messages must follow semantic conventions: `feat(db): ...`, `test(db): ...`, `docs(db): ...`, `chore(db): ...`.
4. **Truthful Synchronization Reporting:**
   - Never claim that local files are synchronized with GitHub until a `git push` command has executed successfully and the remote head is verified.
   - Run `git status --short --branch` and verify `## feature/harsha-supabase-setup...origin/feature/harsha-supabase-setup [ahead 0, behind 0]` post-push.
5. **Branch Safety Invariants:**
   - Never execute `git push --force` or `--force-with-lease` on shared or feature branches.
   - Never reset or rewrite branch history.
   - Never overwrite another developer's work.

---

## 4. Supabase Connection & Security Protocol

1. **Secrets Protection:**
   - Real database passwords, `SUPABASE_SERVICE_ROLE_KEY`, and JWT secrets must never be hardcoded or committed to version control.
   - All active credentials must reside solely in `.env` (which is excluded by `.gitignore`).
   - `.env.example` must contain only generic template placeholders (`[YOUR-PROJECT-REF]`, etc.).
2. **Connection Modes:**
   - Port `5432`: Direct connection for schema migrations and DDL.
   - Port `6543`: Transaction pooler (PgBouncer) for application API queries.
3. **Connection Verification:**
   - Use `node database/supabase/health_check.js` to inspect environment readiness safely without leaking secret tokens.
4. **Peer Review Handoff:**
   - Astra (ChatGPT-6) peer review will occur after Harsha completes and pushes the verified database contribution to `feature/harsha-supabase-setup`. Astra recommendations must be evaluated and tested before adoption.

