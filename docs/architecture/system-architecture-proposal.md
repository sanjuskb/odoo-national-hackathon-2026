# System architecture — PROPOSED; team review required

The PS requires a single subscription platform, not a particular technology stack. Existing team preference: React/TypeScript frontend (Ravi), Node.js/Express API (Amarnadh), Supabase PostgreSQL/Auth (Harsha), integration/demo (Sanju). AI is optional and is not required by PS.

```mermaid
flowchart TD
 U[Admin, Staff, Customer] --> F[Role-aware Frontend - Ravi]
 F --> AUTH[Supabase Auth]
 F -->|Bearer token, JSON| API[Express /api/v1 - Amarnadh]
 API --> CHECK[Identity, role, ownership, input validation]
 CHECK --> CORE[Products, Plans, Quotations, Subscriptions]
 CHECK --> BILL[Sanju: Deterministic Invoice and Billing]
 CHECK --> PAY[Amarnadh: Payment and Reporting APIs]
 CHECK --> REP[Finance Reports]
 CORE --> DB[(Supabase PostgreSQL - Harsha)]
 BILL --> DB
 PAY --> DB
 REP --> DB
 JOB[Verified scheduled job or protected manual trigger] --> BILL
```

**Trust rules:** client cannot control amounts, roles or paid status; check ownership on each endpoint; server-only privileged credentials; apply RLS to exposed database tables. Use DB transactions and unique invoice-period key. Paginate/filter at server for thousands of subscriptions. Measure page load under two seconds; do not claim without proof.

**Failure:** DB write fails => rollback and safe retry. No email provider => clearly disclose unavailable sending. No scheduler => protected manual demo is not equivalent to automatic recurring execution.
