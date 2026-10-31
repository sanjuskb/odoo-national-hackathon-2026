# Team Work Plan & Collaboration Protocols

> **31 October update:** Official problem: Subscription Management System. The canonical [requirements](requirements/requirements.md), [new developer readiness](team/DEVELOPMENT_READINESS.md), and [task board](team/task-board.md) replace the previous pre-release schedule assumptions.

## 1. Team Allocation & Responsibilities

| Member | GitHub Username | Hackathon Role | Focus Area |
|---|---|---|---|
| **Sanju** | `sanjuskb` | Team Lead, Integration & Demo | Team decisions, integration, review, demo/presentation and optional justified AI |
| **Ravi** | `donnyravi-alt` | System Architecture Lead + Frontend Engineer | Architecture coordination, UI/UX, API client, frontend implementation |
| **Amarnadh** | `amarnathgaddam75` | Backend Engineer | Business logic, API endpoints, server services, external integrations |
| **Harsha** | `harsha-1706` | Database Engineer | Schema design, migrations, query optimization, data seeding & integrity |
| **Vivek Pathak** | `vivp-odoo` | Evaluator | Evaluation/collaborator access per organizer; personal-repo collaborators may have write access; protect integration branches |

---

## 2. Sprint / Phase Workflow

### Phase 1: Problem Release & Analysis (Hour 0 - Hour 2)
- Team briefing on problem statement.
- Requirement decomposition into `docs/REQUIREMENTS.md`.
- Definition of core API contracts in `docs/API_CONTRACTS.md`.
- Schema draft in `docs/DATABASE_DESIGN.md`.

### Phase 2: Core Development Sprint (Hour 2 - Midpoint)
- Database schema migrations and sample data seeding (`database/`).
- Backend core CRUD and business service endpoints (`backend/`).
- Frontend view scaffolding and state setup (`frontend/`).

### Phase 3: Integration & Testing (Midpoint - Pre-Submission)
- End-to-end integration between frontend and backend.
- Automated API and unit test execution (`tests/`).
- Bug triage and stabilization on `develop`.

### Phase 4: Final Submission & Demonstration Preparation
- Merge validated `develop` into `main`.
- Tag submission release.
- Live demonstration rehearsal based on `docs/DEMO_SCRIPT.md`.

---

## 3. Communication Norms
- Direct sync calls for interface changes.
- Pull Requests mandatory for merging code into `develop`.
- No direct pushes to `main`.
