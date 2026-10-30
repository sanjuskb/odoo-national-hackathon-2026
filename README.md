# Odoo National Hackathon 2026

[![Repository Status: Private](https://img.shields.io/badge/visibility-private-red.svg)](https://github.com/sanjuskb/odoo-national-hackathon-2026)
[![Default Branch: main](https://img.shields.io/badge/default%20branch-main-blue.svg)](https://github.com/sanjuskb/odoo-national-hackathon-2026/tree/main)
[![Integration Branch: develop](https://img.shields.io/badge/integration%20branch-develop-green.svg)](https://github.com/sanjuskb/odoo-national-hackathon-2026/tree/develop)

Welcome to the central engineering repository for our team participating in the **Odoo National Level Hackathon 2026**. This repository serves as our single source of truth across all stages of the competition, from requirements discovery and system architecture through the virtual round and national finale.

---

> ### 📢 Official Problem Statement Status: PENDING RELEASE
> The competition problem statement has not yet been officially released. This repository is structured to remain flexible, clean, and immediately adaptable once the problem statement and technological constraints are published.

---

## 👥 Team Roles & Responsibilities

Our team operates with clear ownership across architectural tiers:

| Team Member | GitHub Username | Role | Primary Responsibilities |
|---|---|---|---|
| **Sanju** | [`@sanjuskb`](https://github.com/sanjuskb) | **Team Lead & Architect** | Overall system architecture, cross-module integration, coordination, pull request approvals, release management |
| **Ravi** | [`@donnyravi-alt`](https://github.com/donnyravi-alt) | **Frontend Engineer** | UI/UX development, component state management, API integration, final demo presentation |
| **Amarnadh** | [`@amarnathgaddam75`](https://github.com/amarnathgaddam75) | **Backend Engineer** | Backend architecture, business logic implementation, API contract enforcement, authentication & services |
| **Harsha** | [`@harsha-1706`](https://github.com/harsha-1706) | **Database Engineer** | Schema modeling, database migrations, query optimization, data seeding & integrity |
| **Vivek Pathak** | [`@vivp-odoo`](https://github.com/vivp-odoo) | **Evaluator** | Project evaluation, code review, milestone tracking (*Read-only permissions*) |

---

## 📁 Repository Structure

The repository is organized modularly to enable frictionless parallel development:

```text
odoo-national-hackathon-2026/
│
├── .github/                       # GitHub collaboration and review templates
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── pull_request_template.md  # Standardized PR checklist
│
├── .vscode/                      # Recommended editor extensions
│   └── extensions.json
│
├── docs/                         # Engineering specifications and plans
│   ├── EVENT_BRIEF.md            # Competition overview and timeline
│   ├── REQUIREMENTS.md           # Functional & non-functional requirements
│   ├── ARCHITECTURE.md           # System design & module communication
│   ├── TEAM_WORK_PLAN.md         # Milestone plan & team protocols
│   ├── API_CONTRACTS.md          # REST / JSON API specifications
│   ├── DATABASE_DESIGN.md        # ER models, migrations, & data dictionaries
│   ├── TEST_PLAN.md              # Quality assurance & verification strategy
│   └── DEMO_SCRIPT.md            # Final jury presentation script
│
├── frontend/                     # Client application (UI/UX components)
│   └── .gitkeep
│
├── backend/                      # Application server & business logic
│   └── .gitkeep
│
├── database/                     # Migrations, seed scripts, & SQL definitions
│   └── .gitkeep
│
├── tests/                        # Automated unit, integration, & e2e test suites
│   └── .gitkeep
│
├── .env.example                  # Safe template for environment variables
├── .gitignore                    # Robust exclusion for secrets, logs, & artifacts
└── README.md                     # Project documentation root
```

---

## 🌿 Git Branching Strategy

To maintain stability and facilitate continuous integration under tight hackathon timelines, we enforce a two-tier trunk/integration branch workflow:

```text
  main (Stable, tagged submissions)
   ▲
   │  [Approved Release PR]
   │
  develop (Shared integration branch)
   ▲             ▲             ▲             ▲
   │ [PR]        │ [PR]        │ [PR]        │ [PR]
   │             │             │             │
feature/      feature/      feature/      feature/
sanju-*       ravi-*        amarnadh-*    harsha-*
```

### 1. `main` Branch
- Contains only stable, verified, demo-ready code.
- Represents submission milestones and final deliverables.
- **Direct commits are prohibited.** All additions arrive via tested Pull Requests from `develop`.

### 2. `develop` Branch
- The active integration branch where all individual feature work converges.
- Serves as the target branch for feature pull requests.

### 3. Feature Branches
Each developer works exclusively within their designated feature branch namespace:
- **Sanju:** `feature/sanju-<task-name>` (e.g., `feature/sanju-integration`)
- **Ravi:** `feature/ravi-<task-name>` (e.g., `feature/ravi-dashboard-ui`)
- **Amarnadh:** `feature/amarnadh-<task-name>` (e.g., `feature/amarnadh-auth-api`)
- **Harsha:** `feature/harsha-<task-name>` (e.g., `feature/harsha-schema-migration`)

---

## 🚀 Quickstart: Developer Workflow

### 1. Clone the Repository
```bash
git clone https://github.com/sanjuskb/odoo-national-hackathon-2026.git
cd odoo-national-hackathon-2026
```

### 2. Sync with `develop`
```bash
git checkout develop
git pull origin develop
```

### 3. Create your Task-Specific Feature Branch
```bash
# Pattern: feature/<member-name>-<task>
git checkout -b feature/<your-name>-<feature-description>
```

### 4. Commit Changes Locally
Follow clear, imperative commit messages:
```bash
git add .
git commit -m "feat(module): add initial user authentication endpoints"
```

### 5. Push Feature Branch & Open a Pull Request
```bash
git push -u origin feature/<your-name>-<feature-description>
```
- Open a Pull Request on GitHub targeting **`develop`** (not `main`).
- Fill in the PR template details.
- Request review from teammates.

---

## 🔒 Security & Secret Management

- **NEVER** commit `.env` files, API credentials, private tokens, or database passwords.
- Always use `.env.example` as a template for team environment configuration.
- Local configuration files are strictly ignored by `.gitignore`.
- If an API key or password is leaked by mistake, immediately rotate the credential and notify the Team Lead.

---

## 🏆 Hackathon Submission Checklist

- [ ] Problem statement requirements fully traced in `docs/REQUIREMENTS.md`.
- [ ] End-to-end integration verified on `develop`.
- [ ] Automated tests passing cleanly.
- [ ] Verified build merged into `main`.
- [ ] Submission tag created on `main`.
- [ ] Final demo pitch prepared according to `docs/DEMO_SCRIPT.md`.
