# Row Level Security (RLS) & Access Control
## Odoo National Level Hackathon 2026

**Assigned Engineer:** Harsha (`harsha-1706`), Database Engineer  
**Status:** Stage 1 — Workspace Preparation  

---

## 1. Security Architecture & Principles

Supabase PostgreSQL provides enterprise-grade data isolation directly within the database layer using Row Level Security (RLS).

1. **Mandatory RLS Enablement:**
   - Every table created must have RLS turned on:
     ```sql
     ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;
     ```
2. **Deny-by-Default:**
   - Enabling RLS without policies denies all actions (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) to the `anon` and `authenticated` roles.
3. **Explicit Granular Policies:**
   - Separate policies for read (`FOR SELECT`), write (`FOR INSERT`), update (`FOR UPDATE`), and delete (`FOR DELETE`).
   - Use `USING` expressions to filter existing records and `WITH CHECK` expressions to validate newly written rows.
4. **Role Isolation:**
   - User identity mapped using Supabase Auth context (`auth.uid()`).
   - Administrative overrides handled through custom JWT claims, user roles, or server-side service-role client.

---

## 2. Policy Catalog

| Table | Policy Name | Command | Target Role | Using Expression | With Check Expression |
|---|---|---|---|---|---|
| *TO BE INSERTED* | *TO BE INSERTED* | *TO BE INSERTED* | *TO BE INSERTED* | `TO BE INSERTED — PENDING OFFICIAL PROBLEM STATEMENT AND APPROVED MOCK DATA` | *TO BE INSERTED* |

---

## 3. Policy Definitions (Stage 2 Template)

```sql
-- RLS Policy Definitions
-- TO BE INSERTED — PENDING OFFICIAL PROBLEM STATEMENT AND APPROVED MOCK DATA
```

