# Architecture — Subscription Management System

> Updated after official PS release (31 October 2026). The generic pre-PS diagram in the previous version is superseded by the [architecture proposal](architecture/system-architecture-proposal.md). Ravi coordinates the overall system architecture; all module owners must approve interfaces.

**Start here:**
- [Proposed full-stack topology](architecture/system-architecture-proposal.md)
- [Recurring billing invariants and concurrency](architecture/billing-engine-design.md)
- [Database/ER proposal (Harsha review)](architecture/database-design-proposal.md)
- [API contract (Ravi + Amarnadh review)](integration/api-contracts.md)
- [Contract freeze and handoff](integration/CONTRACT_FREEZE_AND_HANDOFF.md)
- [AI decision — not required by PS](architecture/ai-ml-decision.md)

**Provisional stack based on team decision:** React/TypeScript frontend, Node.js/Express business API, Supabase PostgreSQL/Auth with RLS, optional AI only if justified.

**System boundary:** browser roles and invoice amounts are never authoritative; server validates access and billing totals; database uniqueness and atomic transactions prevent duplicate invoices. Do not present this architecture as deployed or tested until verified.
