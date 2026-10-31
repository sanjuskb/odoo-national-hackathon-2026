# Git branch synchronization and release playbook

## Why branches diverge
Each commit belongs to history. Two branches may have the same starting point but new commits that the other branch doesn't contain. This is normal and does not mean files are corrupted.

Inspect before changing anything:
```powershell
git fetch origin
git branch -vv
git log --oneline --left-right origin/develop...origin/feature/harsha-supabase-setup
git diff --stat origin/develop...origin/feature/harsha-supabase-setup
```
The triple-dot diff is based on the merge base; review the incoming changes.

## Normal feature integration
1. Commit local work, push scoped feature branch.
2. Compare feature against `develop`.
3. Sync `origin/develop` into your feature branch and resolve *all* conflicts consciously.
4. Run any affected tests and open a pull request **feature → develop**.
5. Review and merge via GitHub after checks.
6. Everyone else fetches and synchronizes again.

## Harsha's existing unique commit
`feature/harsha-supabase-setup` already contains its own Supabase scaffolding and docs. It must not be reset to match `develop`. Harsha should merge the latest `origin/develop` into his branch and review overlaps in `.gitignore`, `.env.example` and documentation. Database SQL migrations must be trackable, and privileged server credentials must never be exposed to the frontend.

## Release to main
Only after integrated end-to-end tests: open `develop → main` release PR, review its diff, resolve conflicts and merge with branch protection. Do not release simply because Git reports “No conflicts.”

## After a merged PR
Deleting a *merged, obsolete* feature branch is optional cleanup. GitHub's Active tab is informational. Never delete a teammate's active branch without its owner confirming all work is safely merged.
