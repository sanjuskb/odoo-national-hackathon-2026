# Personas and access boundaries

These actors appear in the official PDF, pages 1–4; their detailed action matrices are **team proposals** until approved.

| Actor | Direct source | Typical intended activities | Must not assume |
|---|---|---|---|
| Administrator | PDF pp.1–4 | Create products/plans/taxes/discount rules; add staff; manage system | Admin cannot bypass auditability |
| Internal staff/sales rep | PDF pp.2–4 | Work with customer subscriptions, quotations, invoices and payments | Staff can create tax/discount rules or invite staff |
| Customer | PDF pp.1–2 | Sign up, reset password, view/manage own subscriptions/invoices | Access to other customer records |
| Finance lead | PDF p.4 | Review active subscriptions, revenue, payments, overdue items with filters | Separate login role is mandatory |

**Customer identity:** one unique email per account; strong password rule (>8 chars, uppercase/lowercase/special); recovery link to registered email.

**Authorization:** backend validates user and permissions, DB RLS applies where directly exposed. Decide and test staff privileges and finance access before coding.
