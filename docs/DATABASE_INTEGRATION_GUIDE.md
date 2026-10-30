# Database Integration Guide
## Odoo National Level Hackathon 2026

**Document Purpose:** Technical integration manual for Backend Engineer (Amarnadh) and Frontend Engineer (Ravi) to interact with Supabase PostgreSQL.  
**Author:** Harsha (`harsha-1706`), Database Engineer  
**Feature Branch:** `feature/harsha-supabase-setup`  

---

## 1. Overview & Connection Architecture

The application uses **Supabase PostgreSQL** as its sole primary datastore. There are two primary integration channels:

1. **Supabase Client SDK (`@supabase/supabase-js`):** Recommended for frontend and backend API handlers. Manages auth tokens, query building, and automatic RLS enforcement.
2. **Direct PostgreSQL Connection Pooling (`pg` / Connection URI):** Recommended for high-volume backend transactional operations, complex aggregate SQL queries, and migration runners via Port `6543` (PgBouncer transaction pooler) or Port `5432` (session pooler).

---

## 2. Environment Variables Configuration

Copy `.env.example` to `.env` in the project root. Never commit real credentials to GitHub.

```ini
# Supabase Project Endpoints
SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_public_key_here

# Backend-Only Privileged Key (DO NOT EXPOSE TO FRONTEND)
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# PostgreSQL Direct Connection Strings
DATABASE_URL=postgresql://postgres.[YOUR-PROJECT-REF]:your_password@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[YOUR-PROJECT-REF]:your_password@aws-0-[REGION].pooler.supabase.com:5432/postgres
```

---

## 3. Backend Integration (Amarnadh - Node.js / Express)

### A. Installing the Supabase JavaScript Client
```bash
npm install @supabase/supabase-js
```

### B. Standard Client Initialization (User Context / Respecting RLS)
For endpoints handling user requests where the incoming JWT should govern database permissions:

```javascript
import { createClient } from '@supabase/supabase-js';

// Client that respects incoming user's auth token
export function getUserSupabaseClient(authHeader) {
  const token = authHeader?.replace('Bearer ', '');
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }
  });
}
```

### C. Admin / Service Client (Bypassing RLS for Server Tasks)
For background tasks, system integrations, or cron jobs requiring elevated privileges:

```javascript
import { createClient } from '@supabase/supabase-js';

export const adminSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);
```

### D. Direct SQL Execution via `pg` Pool
If complex raw SQL queries or transactions are needed:
```bash
npm install pg
```

```javascript
import { Pool } from 'pg';

export const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
```

---

## 4. Frontend Integration (Ravi - UI / Client)

### A. Client-Side Supabase Initialization
Only use the public Anon Key on the frontend:

```javascript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
);
```

### B. Access Control & RLS Rules
- Direct database calls from the browser will automatically include the active user session JWT.
- Supabase PostgreSQL evaluates Row Level Security (RLS) on each operation.
- If a query returns empty results `[]` unexpectedly, verify that an appropriate RLS `SELECT` policy exists for the user's role.

---

## 5. Standard Error Handling Pattern

Always inspect errors returned by Supabase queries:

```javascript
const { data, error } = await supabase
  .from('TO BE INSERTED — PENDING OFFICIAL PROBLEM STATEMENT AND APPROVED MOCK DATA')
  .select('*');

if (error) {
  console.error('[Database Error]:', error.message, error.details);
  throw new Error(`Database query failed: ${error.message}`);
}
```

---

## 6. Health Check Utility

A dedicated connection verification utility is provided in `database/supabase/health_check.js`. Run this to verify connectivity during setup:

```bash
node database/supabase/health_check.js
```

