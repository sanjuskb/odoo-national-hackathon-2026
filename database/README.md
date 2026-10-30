# Database Workspace & Architecture Repository
## Odoo National Level Hackathon 2026

**Assigned Engineer:** Harsha (`harsha-1706`), Database Engineer  
**Feature Branch:** `feature/harsha-supabase-setup`  
**Primary Database Engine:** Supabase PostgreSQL  
**Current Phase:** Stage 1 — Workspace Preparation & Infrastructure Foundation  

---

## 1. Directory Structure

```text
database/
├── README.md               # Master database architecture & workflow manual
├── schema/                 # Canonical DDL and schema definitions
│   └── README.md
├── migrations/             # Sequential, version-controlled SQL migration scripts
│   └── README.md
├── seeds/                  # Approved mock dataset seeding scripts
│   └── README.md
├── rls/                    # PostgreSQL Row Level Security (RLS) policies
│   └── README.md
├── diagrams/               # Entity-Relationship Diagrams (ERD) & architecture visual assets
│   └── README.md
├── tests/                  # Database integrity, constraint, and RLS test suites
│   ├── README.md
│   └── run_tests.js        # Test runner harness
├── supabase/               # Supabase configuration, connection health checks, client helpers
│   ├── README.md
│   └── health_check.js     # Non-destructive connection check script
└── history/                # Change logs and Architecture Decision Records (ADRs)
    ├── README.md
    └── CHANGELOG.md        # Comprehensive database change tracking
```

---

## 2. Responsibilities & Collaboration

- **Database Engineering (Harsha):** Schema design, SQL migrations, index tuning, seed data scripts, RLS policies, database health checks, and database documentation.
- **Backend Integration (Amarnadh):** Node.js / Express services communicating with Supabase PostgreSQL via `@supabase/supabase-js` or pooled `pg` drivers.
- **Frontend Integration (Ravi):** Client UI consuming Supabase SDK queries and Supabase Auth sessions.
- **Review & Enhancement (Astra / Team Lead Sanju):** Peer architecture review and optimization recommendations conducted after delivery and push to `feature/harsha-supabase-setup`.

---

## 3. Core Standards & Conventions

1. **PostgreSQL / Supabase as Single Primary Datastore:**
   - All persistence requirements must be served by Supabase PostgreSQL.
   - No external secondary SQL engines (e.g. MySQL) are part of this hackathon stack.
2. **Version-Controlled Migrations:**
   - Direct manual schema edits in the Supabase web dashboard are prohibited without a corresponding migration script in `database/migrations/`.
   - Migration naming convention: `001_initial_schema.sql`, `002_rls_policies.sql`, etc.
3. **Security by Default:**
   - RLS is mandatory for all production application tables.
   - All credentials and API keys reside exclusively in `.env` (derived from `.env.example`).
   - Never commit secrets or connection strings containing passwords to Git.
4. **Placeholder Standard:**
   - All domain-specific definitions prior to official prompt release use the exact marker:
     `TO BE INSERTED — PENDING OFFICIAL PROBLEM STATEMENT AND APPROVED MOCK DATA`

