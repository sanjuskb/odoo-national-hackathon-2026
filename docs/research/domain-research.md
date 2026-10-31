# Domain research — grounded in PS and engineering proposals

**PS facts:** Brightloop runs recurring monthly/yearly products, addons and variants. Current subscriptions are spreadsheet-based; invoices manually typed; bank statements manually matched; end-of-quarter revenue reporting manual; renewals missed.

**Technical recommendations, not official mandates:** immutable invoice amount snapshots; exact decimal monetary calculation; DB uniqueness per subscription billing period; atomic billing and invoice-date advancement; transactionally enforced discount usage; ownership-scoped authorization and RLS; pagination and indexed filtering.

**Key definitions:** due invoice = an invoice for a scheduled billing period; overdue = an unpaid invoice past its due date under chosen policy; outstanding = invoice total less allocated valid payments; active subscription = a subscription in Active state. Teams must agree on edge cases and date boundaries.

Do not assert external compliance standards, government taxes, real payment gateway availability, or verified benchmark results without specific sources and tests.
