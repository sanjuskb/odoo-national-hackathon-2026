# Database Testing & Verification Suite
## Odoo National Level Hackathon 2026

**Assigned Engineer:** Harsha (`harsha-1706`), Database Engineer  
**Status:** Stage 1 — Workspace Preparation  

---

## 1. Testing Philosophy & Scope

Database reliability is critical to hackathon evaluation. The test suite covers:

1. **Schema & DDL Integrity:** Verification that all tables, columns, indexes, and constraints exist as declared.
2. **Referential Integrity:** Ensuring foreign key constraints block orphaned records and cascade where intended.
3. **Data Validation:** Checking domain constraints (e.g. positive numbers, non-empty strings, valid enum states).
4. **Row Level Security (RLS) Assertions:**
   - Unauthenticated clients receive 0 records on private tables.
   - User A cannot view or mutate User B's records.
   - Admin/Service role can perform system operations.
5. **CRUD & Query Performance:** Execution time and correctness of core transactional queries.
6. **Seed Data Integrity:** Ensuring all approved mock records load cleanly without constraint violations.

---

## 2. Test Execution Harness

The test runner is located at `database/tests/run_tests.js`.

### Running Tests (Stage 2)
```bash
node database/tests/run_tests.js
```

---

## 3. Test Suite Catalog

| Test Category | Test File | Description | Status |
|---|---|---|---|
| Schema Integrity | `database/tests/test_schema.sql` | Table and constraint verification | Pending Stage 2 |
| RLS Security | `database/tests/test_rls.js` | Multi-role access control assertions | Pending Stage 2 |
| CRUD Operations | `database/tests/test_crud.js` | Fundamental entity lifecycle checks | Pending Stage 2 |

---

## 4. Test Results Log

`TO BE INSERTED — PENDING OFFICIAL PROBLEM STATEMENT AND APPROVED MOCK DATA`

