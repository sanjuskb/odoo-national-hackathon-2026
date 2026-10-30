# Database Design & Data Modeling

> **NOTE:** Specific tables, entities, and relationships will be modeled upon release of the hackathon problem statement.

---

## 1. Data Modeling Strategy
- Relational schema with normalized tables (3NF where practical).
- Primary keys: UUID or auto-incrementing integers.
- Timestamps: `created_at` and `updated_at` on all core tables.
- Soft-delete pattern (`is_deleted` or `deleted_at`) where auditability is required.

## 2. Entity Relationship Overview
```text
[ To be generated using Mermaid ER diagram upon schema finalization ]
```

## 3. Migration & Seeding Guidelines
- All database modifications must be scripted as repeatable migrations located in `database/migrations/`.
- Seed scripts containing representative, non-sensitive demo data must reside in `database/seeds/`.
- Never commit actual production credentials or sensitive data dumps to version control.
