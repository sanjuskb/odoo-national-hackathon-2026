# Solution options — team's comparison

| Approach | Benefits | Risk | Recommendation |
|---|---|---|---|
| Modular monolith with React/TypeScript + Express + Supabase | Fast integration, central business rules, reusable API contracts | Must design billing transactions and auth carefully | Preferred proposal |
| Supabase-only direct client CRUD | Fast simple CRUD and login | Complex server-authoritative billing, permission and cap logic harder to enforce | Not preferred |
| Multiple independent microservices | Clear theoretical isolation | Deployment, consistency and integration overhead in 8-hour competition | Avoid |

The PS mandates functionality, not stack. Team must approve. Focus on complete subscription → invoice → payment with reliable reports before ambitious integrations.
