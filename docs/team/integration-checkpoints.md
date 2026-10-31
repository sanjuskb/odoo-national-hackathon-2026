# Integration checkpoints — every 30–45 minutes

Do not merge four finished independent modules at the end. For each checkpoint:

1. Note `develop` commit and each member's PR/branch status.
2. Check exact API paths, request/response fields and TypeScript types.
3. Check Harsha migration names against backend queries.
4. Check auth/roles/customer ownership and expected CORS/env configuration.
5. Run smoke flows: health, login/role, subscription, due billing, payment, dashboard.
6. Log each blocker with owner and next repair step; merge small verified slices.
7. Stop merging billing-corrupting, authorization-leaking, or incompatible code; other unrelated safe work may continue.

| Time | Integrated commit | Working slice | Failure/owner | Next action |
|---|---|---|---|---|
| First checkpoint | TBD | Unverified | TBD | Agree API+schema |
| Next checkpoint | TBD | Unverified | TBD | First E2E flow |

Contracts are agreed first, but real API integration and tests are the proof. Automations are not a guarantee of semantic compatibility.
