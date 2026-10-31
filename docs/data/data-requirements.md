# Data requirements — subscription management

Required from official PS: account email/password and roles; products with type, sale/cost prices and notes; variants with price additions; plans including price, daily/weekly/monthly/yearly recurrence, min quantity, validity and lifecycle policy; quotation templates and valid-days; subscription identifiers/status/dates/terms/lines; admin-defined taxes; discounts with threshold/validity/usage cap and scope; invoice periods/lines/status; payments with method/amount/date/note; financial reporting metrics.

**Sources:** PS describes behavior but provides no actual customer database, live tax rate or external payment feed. Application records must be created through UI or explicitly labeled synthetic seeds. Never call test fixtures live data.

**Sensitive:** customer email/identity, subscriptions, invoices and payments require authorization, customer ownership and appropriate storage security.

**Unknown PS decisions:** currency, tax jurisdiction, rounding, time zone, proration, partial payments, discount stacking and how revenue is recognized. Document team policy before coding.
