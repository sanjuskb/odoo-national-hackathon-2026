# Database Requirements Handover Specification
## Odoo National Level Hackathon 2026

**Document Purpose:** Defines the exact inputs and artifacts required from the official hackathon problem statement and approved mock dataset to initiate Stage 2 implementation.  
**Receiver:** Harsha (`harsha-1706`), Database Engineer  
**Feature Branch:** `feature/harsha-supabase-setup`  

---

## 1. Required Problem Statement Inputs

Upon release of the hackathon prompt, the following domain specifics must be extracted and documented:

### A. Business Domain & Core Workflow
- Clear summary of the application problem domain (e.g. inventory, procurement, POS, CRM, manufacturing, ticketing).
- High-level business process flows: What starts a transaction? What transitions its state? What completes it?
- Actor/Role identification: What distinct user types interact with the system (e.g., Administrator, Staff, Customer, Auditor)?

### B. Entity Identification & Attributes
- Complete list of candidate business entities.
- For each entity:
  - Required descriptive fields.
  - Mandatory vs. optional attributes (nullability).
  - Data types and formatting expectations (e.g., currency, timestamps, status enums, barcodes).
  - Natural keys or business identifiers (e.g., invoice numbers, SKU codes).

### C. Relationship & Cardinality Mapping
- Precise mapping of entity connections:
  - One-to-One (1:1)
  - One-to-Many (1:N)
  - Many-to-Many (M:N) (junction/associative table requirements)
- Deletion rules: What happens to child records when a parent record is removed (`CASCADE`, `RESTRICT`, `SET NULL`)?

### D. Business Constraints & Validation Rules
- Numerical constraints (e.g., quantity > 0, discount between 0 and 100, price >= cost).
- State transition rules (e.g., status can only move `draft` -> `confirmed` -> `fulfilled` -> `cancelled`).
- Uniqueness requirements (e.g., unique email per tenant, unique product code per category).

---

## 2. Approved Mock Data Specifications

The database schema and seed scripts will be directly driven by the team's approved mock dataset. The following must be provided:

1. **Format:** Structured JSON, CSV, or spreadsheet data representing realistic application scenarios.
2. **Coverage:** Data for all core tables, including parent entities (lookups, users, categories) and transactional child records (orders, line items, audit logs).
3. **Volume:** Representative dataset size adequate for demo presentation without overwhelming query performance.
4. **Consistency:** Referential consistency across foreign key relationships (all foreign keys in child records must exist in parent tables).

---

## 3. Security, Authentication & Access Control Inputs

1. **Supabase Auth Integration:**
   - Are users authenticated via email/password, magic links, or OAuth?
   - Is there a `profiles` or `users` table linked to Supabase's `auth.users` via `id REFERENCES auth.users(id)`?
2. **Row Level Security (RLS) Requirements:**
   - Which tables are strictly private to the creating user?
   - Which tables are shared across a team/organization/tenant?
   - Which tables are publicly readable (unauthenticated)?
   - Which operations require administrative privileges?

---

## 4. Handover Sign-off Template (To Be Completed in Stage 2)

```markdown
### Problem Statement Review
- Problem Domain: TO BE INSERTED — PENDING OFFICIAL PROBLEM STATEMENT AND APPROVED MOCK DATA
- Identified Entities: TO BE INSERTED — PENDING OFFICIAL PROBLEM STATEMENT AND APPROVED MOCK DATA
- Identified User Roles: TO BE INSERTED — PENDING OFFICIAL PROBLEM STATEMENT AND APPROVED MOCK DATA

### Approved Mock Data Review
- Mock Data Files Provided: TO BE INSERTED — PENDING OFFICIAL PROBLEM STATEMENT AND APPROVED MOCK DATA
- Total Tables Seeded: TO BE INSERTED — PENDING OFFICIAL PROBLEM STATEMENT AND APPROVED MOCK DATA
- Data Quality & Integrity Confirmed: [ ] YES / [ ] NO
```

