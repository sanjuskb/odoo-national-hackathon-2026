# Team decisions and open questions

| Item | Status | Owner |
|---|---|---|
| Official PS: Subscription Management System | Confirmed PDF | All |
| Repository `develop` for integration, `main` stable | Confirmed in GitHub | Ravi |
| Primary DB Supabase PostgreSQL/Auth | Previously team-approved; actual connection still to verify | Harsha |
| Node.js/Express backend | Existing team plan | Amarnadh |
| React/TypeScript frontend | Proposed, verify stack | Ravi |
| AI/ML requirement | Not required by official PS, optional | Sanju |
| Invoice service primary owner | **Sanju**: deterministic generation and billing orchestration; Amarnadh: Express integration; Harsha: atomic persistence | Team assignment |
| Currency, tax rules and rounding | Unresolved | Sanju + Harsha |
| Discount stacking/order and partial payments | Unresolved | Sanju + Amarnadh |
| Timezone, month-end/expiry and pause billing | Unresolved | Amarnadh + Harsha |
| Email provider and recurring scheduler | Unresolved | Amarnadh (provider/API), Sanju (billing orchestration) |
| Invoice cancellation/refund policy | Unresolved | Sanju + Amarnadh |

PS facts are not interchangeable with team interpretations. Record reviewer decisions before implementing monetary operations.
