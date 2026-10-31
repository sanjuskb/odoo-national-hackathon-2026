# Recommended solution — PROPOSED, not yet implemented

Brightloop Subscription Management System: role-aware admin, internal staff and customer portals, with product and priced variants, recurring plans/policies, quotation templates, lifecycle-tracked subscriptions, automatically generated tax/discount invoices, payment matching and fast revenue dashboard.

**Core demo journey:** admin sets product (+560 variant), plan, tax and discount → staff creates quotation/subscription → activates → due billing creates invoice automatically → repeated due billing yields no duplicate → staff records payment → finance summary updates → customer sees only own subscriptions/invoices.

Build order: access model and first API-backed screen; products/plans; subscription; billing/invoices; payments/reporting; remaining plan/quote/discount/invoice actions; end-to-end performance. All explicit PS requirements remain targets; record incomplete behavior honestly.

AI, payment gateway and predictive forecasts are not mandated by the four-page PS. Minimize speculative work.
