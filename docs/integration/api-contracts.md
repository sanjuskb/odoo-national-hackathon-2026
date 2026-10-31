# Proposed API contracts — pending Ravi / Amarnadh / Harsha approval

**Detailed working proposal:** [Amarnadh's API proposal](../../backend/API_CONTRACT_PROPOSAL.md). Names are aligned here as candidates, not approved live endpoints. Only `/api/v1/health` is currently implemented and tested.

Keep existing repo convention: prefix `/api/v1` and envelope `{success,data,message,errors}`. No endpoints here are claimed implemented.

| Method | Path | Purpose | Access |
|---|---|---|---|
| GET | /api/v1/health | Health | Public |
| POST | /api/v1/auth/register | Customer account | Public |
| POST | /api/v1/admin/staff | Add staff | Admin |
| GET/POST | /api/v1/products | Products/variants | Admin write |
| GET/POST | /api/v1/plans | Plan catalog and policy | Admin write |
| GET/POST | /api/v1/quotation-templates | Quote templates | Staff/admin |
| GET/POST | /api/v1/subscriptions | Subscription list/create | Role/ownership |
| GET | /api/v1/subscriptions/:id | Subscription with lines | Role/ownership |
| POST | /api/v1/subscriptions/:id/transition | Lifecycle | Authorized staff |
| POST | /api/v1/subscriptions/:id/actions | Pause/renew/close | Policy |
| GET/POST | /api/v1/taxes | Tax policy | Admin write |
| GET/POST | /api/v1/discounts | Discounts | Admin write |
| POST | /api/v1/billing/run | Due invoices: Sanju service, Amarnadh route, Harsha transaction | Trusted worker/admin |
| GET | /api/v1/invoices | Paginated invoice lists | Role/ownership |
| GET | /api/v1/invoices/:id | Invoice details | Role/ownership |
| POST | /api/v1/invoices/:id/confirm, /cancel, /send and GET /print | Invoice actions | Authorized staff |
| POST | /api/v1/invoices/:id/payments | Record payment | Authorized staff |
| GET | /api/v1/reports/overview | Revenue/overdue summary | Staff/admin |

Validate request bodies and ownership server-side; reject client-supplied financial totals. Use 401, 403, 404, 409 and 422 appropriately. Define exact field types together with database migrations and frontend TypeScript interfaces. Filter and paginate on server. Synthetic payloads only until actual schema approved.
