# Supabase Configuration & Integration Architecture
## Odoo National Level Hackathon 2026

**Assigned Engineer:** Harsha (`harsha-1706`), Database Engineer  
**Status:** Stage 1 — Workspace Preparation  

---

## 1. Supabase Platform Roles & Connection Modes

Supabase PostgreSQL is our single primary database engine. The following connection modes are supported:

| Connection Mode | Port | Protocol | Typical Use Case |
|---|---|---|---|
| Direct Connection | `5432` | TCP / PostgreSQL | DDL migrations, long-running schema updates, local development scripts |
| Transaction Pooler | `6543` | TCP / PgBouncer | Node.js backend API requests, serverless endpoints |
| REST / PostgREST API | `443` | HTTPS / JSON | `@supabase/supabase-js` client SDK, frontend UI data fetching |
| Realtime API | `443` | WSS (WebSockets) | Live table change subscriptions, reactive dashboard updates |

---

## 2. Security & Credentials Management

1. **Zero Secret Exposure Policy:**
   - Database passwords, JWT secrets, and `SUPABASE_SERVICE_ROLE_KEY` must never be hardcoded or checked into Git.
   - All secrets reside in local `.env` which is strictly ignored by `.gitignore`.
2. **Client Key Distinction:**
   - **`SUPABASE_ANON_KEY`:** Safe for frontend distribution. Governed by PostgreSQL RLS.
   - **`SUPABASE_SERVICE_ROLE_KEY`:** Restricted strictly to backend servers. Bypasses RLS. Never ship to client browsers.

---

## 3. Project Configuration Template

```json
{
  "project_name": "odoo-hackathon-2026",
  "database_version": "PostgreSQL 15+",
  "region": "TO BE INSERTED — PENDING OFFICIAL PROBLEM STATEMENT AND APPROVED MOCK DATA",
  "auth_providers": ["email"],
  "rls_enabled": true
}
```

---

## 4. Connection Health Check

A non-destructive health-check script is provided at `database/supabase/health_check.js` to verify credentials and connectivity safely.

