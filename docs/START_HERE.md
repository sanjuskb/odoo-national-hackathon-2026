# START HERE — Subscription Management System

**OFFICIAL PS HAS ARRIVED.** Read the source and contracts before implementing dependent code. This documentation package is a **proposal and requirements baseline**, not evidence of working functionality.

1. [Official problem statement](official/problem-statement.md) and [source register](official/source-register.md)
2. [Requirements IDs and priorities](requirements/requirements.md) and [acceptance criteria](requirements/acceptance-criteria.md)
3. [Problem decomposition](analysis/problem-decomposition.md) and [user workflows](analysis/user-workflows.md)
4. [Recommended solution](solution/recommended-solution.md) and [architecture proposal](architecture/system-architecture-proposal.md)
5. [API proposal](integration/api-contracts.md), [database proposal](architecture/database-design-proposal.md) and [billing safeguards](architecture/billing-engine-design.md)
6. [Task board](team/task-board.md), [integration checkpoints](team/integration-checkpoints.md), [decision log](team/decision-log.md)
7. Team handoffs: [Ravi](team/ravi-frontend-architecture-plan.md), [Amarnadh](team/amarnath-backend-plan.md), [Harsha](team/harsha-database-plan.md), [Sanju](team/sanju-ai-ml-plan.md)
8. [Verification plan](quality/verification-plan.md) and [5-minute video outline](demo/five-minute-demo-blueprint.md)

## First 30 minutes
- **Sanju + Ravi:** approve one end-to-end MVP journey; settle unresolved tax/discount/payment assumptions; assign deadlines.
- **Harsha:** verify team-approved Supabase/PostgreSQL project and existing migration state; publish reviewed schema and RLS decisions.
- **Amarnadh:** confirm Express /api/v1 schema and auth/roles, implement initial endpoints and test with real DB.
- **Ravi:** scaffold actual frontend screens around approved contract and integrate first endpoint immediately.
- **Everyone:** merge small tested slices into `develop`, never wait for end-of-day integration.

The official PDF does **not** require AI; do not let optional AI displace core billing correctness.
