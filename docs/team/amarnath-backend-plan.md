# Amarnadh — Node/Express backend owner

**Preserve existing convention:** base `/api/v1` and response `{success,data,message,errors}`. Verify Supabase schema and bearer token security with Harsha; coordinate TypeScript shapes with Ravi.

**Build order:**
1. Health, registration/auth/role/ownership and admin staff creation.
2. Products/variants and plans (frequencies, policy settings).
3. Quote templates, subscription unique IDs/lines and valid lifecycle transitions.
4. Integrate **Sanju-owned invoice-generation and recurrence service** into protected Express API; collaborate with Harsha for atomic invoice+lines+discount-redemption+next-billing persistence, unique subscription/period and retry safety.
5. Tax/discount calculation and invoice confirm/cancel/send/print actions.
6. Record payments and compute invoice balance/overdue.
7. Paginated finance dashboard API with filtering.

**Minimum tests:** 401/403, cross-customer access, 8-char invalid password, variants +560, four frequencies, duplicate/concurrent billing, failed DB rollback/retry, discount cap/date, payment reconciliation.

**Critical:** never trust browser-calculated money or role; credentials server-only. If email, scheduled jobs, print or send are not implemented, disclose accurately.
