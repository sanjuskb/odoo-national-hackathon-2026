# Proposed API contracts — pending Ravi/Amarnadh approval

Keep existing repo convention: prefix `/api/v1` and envelope `{success,data,message,errors}`. No endpoints here are claimed implemented.

| Method | Path | Purpose | Access |
|---|---|---|---|
| GET | /api/v1/health | Health | Public |
| POST | /api/v1/auth/register | Customer account | Public |
| POST | /api/v1/staff | Add staff | Admin |
| GET/POST | /api/v1/products | Products/variants | Admin write |
| GET/POST | /api/v1/plans | Plan catalog and policy | Admin write |
| GET/POST | /api/v1/quotation-templates | Quote templates | Staff/admin |
| GET/POST | /api/v1/subscriptions | Subscription list/create | Role/ownership |
| GET | /api/v1/subscriptions/:id | Subscription with lines | Role/ownership |
| POST | /api/v1/subscriptions/:id/transition | Lifecycle | Authorized staff |
| POST | /api/v1/subscriptions/:id/actions | Pause/renew/close | Policy |
| GET/POST | /api/v1/tax-rules | Tax policy | Admin write |
| GET/POST | /api/v1/discount-rules | Discounts | Admin write |
| POST | /api/v1/billing/run-due | Due invoice generation | Trusted worker/admin |
| GET | /api/v1/invoices | Paginated invoice lists | Role/ownership |
| GET | /api/v1/invoices/:id | Invoice details | Role/ownership |
| POST | /api/v1/invoices/:id/actions | Confirm/cancel/send/print | Authorized staff |
| POST | /api/v1/invoices/:id/payments | Record payment | Authorized staff |
| GET | /api/v1/reports/overview | Revenue/overdue summary | Staff/admin |

Validate request bodies and ownership server-side; reject client-supplied financial totals. Use 401, 403, 404, 409 and 422 appropriately. Define exact field types together with database migrations and frontend TypeScript interfaces. Filter and paginate on server. Synthetic payloads only until actual schema approved.
