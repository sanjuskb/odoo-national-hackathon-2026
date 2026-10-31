# 31 October — Team development readiness checklist

**Status:** This file documents repository setup, not proof that application features are implemented. Official PS: [Subscription Management System](../official/problem-statement.md). Main requirement: unified product/plan/subscription/invoice/payment platform, role control and <2-second pages with thousands of subscriptions.

## Branch roles
- `main`: verified stable release; do **not** code directly here.
- `develop`: shared integration; merge small reviewed PRs only.
- `feature/ravi-frontend` (or Ravi's active scoped branch): UI and frontend API client.
- `feature/amarnath-backend`: Express, business rules and billing APIs.
- `feature/harsha-supabase-setup`: schema, Supabase integration and RLS; contains Harsha's work and must not be reset or overwritten.
- `feature/sanju-integration`: integration, optional justified AI and demo assets.
- `chore/problem-statement-baseline`: previously merged documentation branch; can be deleted later, but not an error.

**GitHub's "Active" tab groups recently updated branches. It is NOT a second layer of Git.** Behind/ahead on the Branches page normally compares to default `main`; for feature sync, compare specifically with `develop`.

## First ten minutes for ALL members
1. Clone or open the existing **one** shared repository. Never run `git init` inside it.
2. Run `git status`, `git remote -v`, `git fetch origin`, `git branch -a`.
3. Ensure each has own working feature branch. Worktrees must be clean before merges/rebases.
4. Read [official PS](../official/problem-statement.md), [requirements](../requirements/requirements.md), [API proposals](../integration/api-contracts.md), and [billing design](../architecture/billing-engine-design.md).
5. Agree frontend ↔ backend JSON types and backend ↔ database schema BEFORE dependent code is written.
6. Test a vertical slice early: account/role → subscription → invoice → payment → dashboard.
7. Report actual working tests and unavailable dependencies; never label fixtures live.

## New developer branch commands — Windows PowerShell
```powershell
git fetch origin
git switch develop
git pull --ff-only origin develop
git switch -c feature/<member>-<task>
git status
git add <only-your-files>
git commit -m "feat(module): implement scoped change"
git push -u origin feature/<member>-<task>
```
If `develop` does not exist locally: `git switch --track origin/develop`. If the feature branch already exists, switch to it instead of recreating. Open PR targeting `develop`.

## Existing branch synchronization
```powershell
git status                     # commit/stash work first
git fetch origin
git switch <your-existing-feature-branch>
git merge origin/develop
git status                     # resolve conflicts and run tests if necessary
git push origin <your-existing-feature-branch>
```
Never use `git reset --hard`, force pushes or the GitHub “Discard changes” button to solve a branch mismatch. Harsha's active Supabase branch has unique work; preserve its commit and allow Harsha to resolve any `.gitignore` or configuration conflict. Feature code changes do not reach `develop` merely by pushing.

## Integration cadence — every 30–45 minutes
At each checkpoint check PR statuses, exact request/response names, auth role/ownership, database migrations, state transitions, invoice correctness and actual UI-backend functionality. Merge one small tested slice, not four large branches at the end. Fix critical authorization/billing failures **before integrating affected code**; unrelated work can continue.

## What must be validated, not assumed
- [ ] Actual Supabase project, credentials and roles accessible (Harsha).
- [ ] Database migrations and RLS deployed and tested (Harsha).
- [ ] Express health, auth, transaction and billing endpoints work (Amarnadh).
- [ ] Browser uses actual API and handles errors (Ravi).
- [ ] Same billing period cannot invoice twice even with concurrent requests.
- [ ] Another customer cannot see someone else's invoice.
- [ ] Response under two seconds with thousands of subscriptions is measured.
- [ ] Background billing job and email delivery are configured *if claimed*.
- [ ] GitHub Actions run and show success **for code**.
- [ ] Evaluator GitHub collaborator role and access verified by repository owner.
- [ ] Five-minute demonstration link tested by 5:30 PM.

## Repo administration checks (owner)
Open **Settings → Rules → Rulesets** (or **Branches**) and confirm `main` and `develop` require PR reviews and essential passing checks *after the first successful CI workflow run*. The GitHub app may not be able to inspect or change admin-only rules. Do not enforce nonexistent check names before the workflow first runs. Require the actual named `Repository integrity and secret-file guard` check once available. Consider module checks as required when apps exist.

**Evaluator access on personal repositories:** GitHub personal-account repositories offer an owner and collaborators; a collaborator has read/write access rather than a separately selectable Read-only role. The evaluator's observed Write permission is therefore normal for a personal repository collaborator. Confirm organizer instructions and keep `main` / `develop` protected rather than transferring the repository during the event. See [GitHub personal repo permissions](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/repository-access-and-collaboration/permission-levels-for-a-personal-account-repository).

## Scope discipline
- `docs/official/` is official PS transcription. Do not change it to match an implementation preference.
- `docs/architecture/` and `docs/integration/` are proposals until module owners agree.
- One shared Supabase project is the existing team decision; production availability is unverified.
- AI/ML is **not** mandated by the supplied PS. Prioritize deterministic finance correctness.
