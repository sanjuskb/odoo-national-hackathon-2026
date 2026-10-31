# Release readiness — develop → main

**DO NOT merge into main yet.** The repository currently contains documentation scaffolding; working app, database integration and tests are not verified.

## Minimum release checklist
- [ ] `develop` contains all required reviewed feature PRs.
- [ ] GitHub Actions quality checks pass at the release commit, and any skipped module checks are understood.
- [ ] Frontend, Express backend and Supabase PostgreSQL integrate end to end.
- [ ] Registration, roles, unique email/password rule and reset flow tested.
- [ ] Product variant +560, 4 billing frequencies, quotation template, subscription transitions tested.
- [ ] Idempotent invoices, tax and discount rules, payment reconciliation and overdue reporting tested.
- [ ] Customer ownership and admin-only staff/discount permissions tested with two accounts.
- [ ] Thousands-record benchmark records actual <2-second page responses.
- [ ] Environment variables documented, secrets are not in GitHub.
- [ ] Five-minute video prepared with real working flow; link can be opened anonymously if event requires.
- [ ] Evaluator access configured per organizers.

## Process
1. In GitHub: create PR with **base `main`** and **compare `develop`**.
2. Review all file changes/CI, confirm no unexpected deletions or env secrets.
3. Merge only after real integration verification; tag tested release if needed.
4. Do not automatically change GitHub default branch from `main` to `develop`.

No CI check alone guarantees financial correctness or application availability.
