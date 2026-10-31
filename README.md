# Brightloop Subscription Management System

**Odoo National-Level Hackathon 2026 · Official problem statement released 31 October 2026**

> **Current implementation status:** Engineering documentation and initial repository structure exist. Feature implementation, real Supabase connectivity, automated billing and tests must be verified before marking them complete. **Do not mistake planned architecture for running code.**

## START HERE — ALL FOUR TEAM MEMBERS

1. [Official four-page problem statement transcription](docs/official/problem-statement.md) and [source register](docs/official/source-register.md).
2. [Requirements register](docs/requirements/requirements.md) and [acceptance criteria](docs/requirements/acceptance-criteria.md).
3. [Proposed solution](docs/solution/recommended-solution.md) and [architecture proposal](docs/architecture/system-architecture-proposal.md).
4. [API contracts — proposed](docs/integration/api-contracts.md) and [database design — proposed](docs/architecture/database-design-proposal.md).
5. [Billing correctness](docs/architecture/billing-engine-design.md): one invoice per subscription/billing period; no skipped intervals.
6. [Today's development readiness and Git commands](docs/team/DEVELOPMENT_READINESS.md), [team work board](docs/team/task-board.md), and [integration checkpoints](docs/team/integration-checkpoints.md).
7. [Five-minute evaluator demonstration plan](docs/demo/five-minute-demo-blueprint.md).

The official challenge is a unified platform for **products and product variants, recurring billing plans, quotation templates, subscription lifecycles, taxes, discounts, automatically generated invoices, recorded payments, a customer portal, role-based access and financial reports**. The PDF calls for **under-two-second page responses with thousands of subscriptions**. It does **not** require AI/ML or a live card payment gateway.

## Team ownership

| Team member | GitHub | Ownership |
|---|---|---|
| Sanju | [@sanjuskb](https://github.com/sanjuskb) | Team leadership, integration, presentation and AI only if justified |
| Ravi | [@donnyravi-alt](https://github.com/donnyravi-alt) | Overall architecture coordination, frontend, UX and API client |
| Amarnadh / Amarnath | [@amarnathgaddam75](https://github.com/amarnathgaddam75) | Backend Express APIs, business logic, validation and billing |
| Harsha | [@harsha-1706](https://github.com/harsha-1706) | Supabase PostgreSQL, migrations, RLS, data integrity |

The evaluator is **not** a developer. Confirm their required access level separately.

## Current technology direction

- **Frontend:** React/TypeScript (specific build tool to be finalized by Ravi).
- **Backend:** Node.js/Express, `/api/v1` base route, structured JSON response envelope.
- **Database/Auth:** Supabase PostgreSQL/Auth was the team-approved direction; connection and schema are not automatically complete.
- **AI:** Not required by official statement; Sanju should prioritize integration and evaluator demonstration.

## Repository workflow (do not push directly to protected branches)

```text
feature/ravi-*       feature/amarnath-*       feature/harsha-*       feature/sanju-*
       \                    |                       |                       /
        \---------- Reviewed small PRs into develop ----------------------/
                                      |
                               integrated tests
                                      |
                           release PR to protected main
```

`main` = stable verified release. `develop` = continuously integrated work. `feature/*` = individual experiments and implementation. GitHub's **Active branches** list is a display category, not another branch layer.

### Local quick start (PowerShell)

```powershell
git clone https://github.com/sanjuskb/odoo-national-hackathon-2026.git
cd odoo-national-hackathon-2026
git fetch origin
git switch develop
git pull --ff-only origin develop
git switch -c feature/<your-name>-<small-task>
```

**Existing branch?** Do not recreate it. Fetch and merge `origin/develop` into your feature branch after safeguarding uncommitted work.

```powershell
git status
git fetch origin
git switch feature/<your-existing-branch>
git merge origin/develop
git push origin feature/<your-existing-branch>
```

Only use commands after confirming the branch and a clean working tree. Open a PR into **`develop`**, test, review and merge. Keep all secrets in locally ignored `.env`; use the example file for variable *names*, never actual credentials. Check provider rules for automated tooling.

## Automated quality gates

CI is defined in [GitHub Actions](.github/workflows/ci.yml). It checks repository structure/secret-prone tracked files and conditionally builds/tests frontend or backend **when their `package.json` and lockfiles exist**. CI green on documentation alone **does not mean the app works**. Run manual role-isolation, billing idempotency and end-to-end checks before final release.

## Video and submission

The provided event schedule ends coding at 5:00 PM (31 October) and requests a **five-minute video link by 5:30 PM**. Sanju leads the final explanation. Do not claim incomplete functionality; use [demo acceptance criteria](docs/quality/demo-acceptance-checklist.md).

**For newcomers:** read [docs/START_HERE.md](docs/START_HERE.md) and your named team plan under [docs/team/](docs/team/).
