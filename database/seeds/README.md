# Database Seed Data & Mock Dataset Scripts
## Odoo National Level Hackathon 2026

**Assigned Engineer:** Harsha (`harsha-1706`), Database Engineer  
**Status:** Stage 1 — Workspace Preparation  

---

## 1. Overview & Guidelines

This directory houses reproducible data seeding scripts designed to populate the Supabase PostgreSQL database with realistic, approved mock data for development, testing, and live demonstration.

1. **Source of Truth:**
   - Seed data must be strictly derived from the team's approved mock dataset.
   - Fictional or speculative records must not be invented prior to official requirements release.
2. **Referential Order:**
   - Seed scripts must insert parent lookup entities first, followed by primary business records, and finally transactional child records.
3. **Clean Teardown & Reset:**
   - Seed scripts should support idempotency or safe re-runs (`ON CONFLICT DO NOTHING` or explicit truncation/reset in non-production environments).
4. **No Sensitive Data:**
   - Never commit real passwords, personally identifiable information (PII), or private keys in seed files.

---

## 2. Seed Script Registry

| Script Name | Target Tables | Purpose | Status |
|---|---|---|---|
| *TO BE INSERTED* | *TO BE INSERTED* | `TO BE INSERTED — PENDING OFFICIAL PROBLEM STATEMENT AND APPROVED MOCK DATA` | Pending Stage 2 |

---

## 3. Approved Mock Data References

`TO BE INSERTED — PENDING OFFICIAL PROBLEM STATEMENT AND APPROVED MOCK DATA`

