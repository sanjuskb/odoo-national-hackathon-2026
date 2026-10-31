# Acceptance criteria — mapped to official PS

The following test cases derive from the 4-page Subscription Management System PS. They are engineering acceptance proofs, not extra official wording.

| Requirement | Measurable test |
|---|---|
| FR-001/002 + SEC-001 | Valid account registration succeeds; duplicate email rejected; password of eight characters rejected; >8 with upper/lowercase and special accepted. |
| FR-003 | Password reset link can be delivered to registered email. |
| SEC-002/003 | Three role permissions tested; admin can add staff but staff/customer cannot; customer A cannot read B's records. |
| FR-004/005 | Admin creates named product with type, sale/cost price, notes, variant +560. |
| FR-006/007 | Plans support daily/weekly/monthly/yearly, minimum quantity and valid start/end dates. |
| FR-008 | Auto-close/pause/early-close/renew follow per-plan policies. |
| FR-009 | Quotation template prepopulates plan/lines and expiration valid-days. |
| FR-010–012 | Unique subscription number; correct customer/plan/dates/terms/lines; valid lifecycle transitions Draft→Quotation→Confirmed→Active→Closed. |
| FR-013/014/017 | Due invoices created with correct customer/lines/taxes/totals; duplicate triggers do not double bill; missed periods recovered. |
| FR-015/016 | Confirm, cancel, send and print invoice; Draft/Confirmed/Paid statuses represented faithfully. |
| FR-018–021 | Admin-only fixed/percentage discount with min amount/qty, validity and usage cap; product/subscription scope; auto-apply then expire. |
| FR-022/023 | Record payment against invoice with method/amount/date/note; paid/outstanding/overdue view correct. |
| FR-024 | Finance dashboard filters active subscriptions, revenue, payments and overdue. |
| FR-025 | Customer sees and manages own subscription/invoice data only. |
| NFR-001 | Time actual pages with thousands of subscriptions and verify <2 seconds; report test environment and samples. |

Unspecified by PS: tax jurisdiction/formulas, money currency/rounding, discount stacking, proration, partial payments, invoice email provider, automatic job provider. Team chooses and documents reasonable policies.
