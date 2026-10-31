# Problem decomposition — Brightloop Software

## Officially described problems (pages 1–4)
- Subscriptions in spreadsheets, renewals by memory, manual invoices, payments matched manually, quarterly manual revenue reports (p.2).
- Customer signup and scoped access; admin-managed catalogue/plans/tax/discount; staff quotations/subscriptions; customer self-service; invoice automation and finance visibility (pp.2–4).
- Thousands of subscription records must still allow pages to respond in under two seconds (p.4).

## Primary stakeholders explicitly mentioned
- **Administrator:** sets up products, plans, taxes, discount rules; exclusively adds staff.
- **Internal staff/sales representative:** manages customers, quotes, subscriptions and invoices with limited permissions.
- **Customer:** manages only their subscriptions and invoices.
- **Finance lead:** reviews subscriptions, revenue, payments and overdue invoices.

## Desired outcomes derived from the statement
One source of truth for recurring contract data; repeatable, accurate billing; safe access boundaries; accurate collections and overdue tracking; filtered revenue visibility; responsive UI under realistic scale.

## Major implementation risks
1. Duplicate/missed billing periods (FR-017).
2. Wrong totals when variants, tax and discounts interact (FR-005/014/018–021).
3. Cross-customer data leakage (SEC-002).
4. Ambiguous plan lifecycle and transitions (FR-008/012).
5. Misstated reporting totals / <2-second target unmeasured (FR-024/NFR-001).

## Important unknowns — NOT supplied by the official PDF
Currency; tax inclusive/exclusive ordering; discounts stacking and proration; partial/over-payments; staff action matrix; credit notes on cancellation; exact auto-renewal convention; invoice delivery mechanism; scheduling facility. Record team choices in [decision log](../team/decision-log.md).

## MVP proposal, not official permission to omit features
One functioning path: admin sets product/variant+plan+tax/discount -> staff creates quote/subscription -> due billing creates one invoice -> staff records payment -> customer sees only their data -> finance summary reconciles. Track any unimplemented official requirements explicitly.
