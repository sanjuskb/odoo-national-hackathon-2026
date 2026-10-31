# Phase 1: Comprehensive Schema and API Field Mapping
## Brightloop Software Subscription Management System — Odoo National Level Hackathon 2026

**Author:** Harsha (`harsha-1706`), Database Engineer  
**Workspace:** `E:\Projects\Odoo-Team`  
**Status:** MAPPED AND VERIFIED  
**Date:** 2026-10-31  

---

## 1. Backend API to PostgreSQL Entity Mapping

Maps every endpoint in Amarnadh's [backend/API_CONTRACT_PROPOSAL.md](file:///E:/Projects/Odoo-Team/backend/API_CONTRACT_PROPOSAL.md) and [backend/src/services/supabaseBillingRepository.cjs](file:///E:/Projects/Odoo-Team/backend/src/services/supabaseBillingRepository.cjs) to PostgreSQL columns.

### 1.1 Authentication & Profile Projection
| Endpoint | HTTP Method | Request / Trigger Source | PostgreSQL Target | Column Mapping | RLS / Definer Authority |
|---|---|---|---|---|---|
| `/api/v1/auth/register` | `POST` | `{ email, password, full_name }` | `auth.users` -> `public.profiles` | `id = auth.users.id`, `email = lower(email)`, `full_name = full_name`, `role = 'customer'` | Handled by trigger `create_customer_profile()` |
| `/api/v1/auth/login` | `POST` | `{ email, password }` | `auth.users` | Evaluated by Supabase Auth engine | Returns JWT with `sub`, `email`, `role` |
| `/api/v1/auth/me` | `GET` | Bearer Token | `public.profiles` | `.select('id, email, full_name, role')` | `id = auth.uid()` |
| `/api/v1/staff` | `POST` | `{ email, password, full_name }` (Admin only) | `auth.users` + `roleStore.js` | Server writes `app_metadata.role = 'staff'`, mirrored to `profiles.role` | Trigger `sync_brightloop_profile_role()` |

---

### 1.2 Product Catalogue & Variants
| Endpoint | HTTP Method | API Request Body Fields | Target Table | PostgreSQL Column & Type | Constraint / Validation |
|---|---|---|---|---|---|
| `/api/v1/products` | `POST` | `name` | `public.products` | `name TEXT` | `NOT NULL, CHECK (length(trim(name)) > 0)` |
| | | `type` | `public.products` | `type TEXT` | `NOT NULL` (`software`, `addon`, `service`) |
| | | `sales_price` | `public.products` | `sales_price NUMERIC(14,2)` | `NOT NULL, CHECK (sales_price >= 0)` |
| | | `cost_price` | `public.products` | `cost_price NUMERIC(14,2)` | `NOT NULL, CHECK (cost_price >= 0)` |
| | | `notes` | `public.products` | `notes TEXT` | `NULLABLE` |
| `/api/v1/products/:id` | `POST` (Variants) | `name` | `public.product_variants` | `name TEXT` | `NOT NULL` |
| | | `price_adjustment` | `public.product_variants` | `price_adjustment NUMERIC(14,2)` | `NOT NULL DEFAULT 0.00` |
| | | Parent ID | `public.product_variants` | `product_id UUID` | `REFERENCES products(id) ON DELETE CASCADE` |

---

### 1.3 Subscription Plans
| Endpoint | HTTP Method | API Request Body Fields | Target Table | PostgreSQL Column & Type | Constraint / Validation |
|---|---|---|---|---|---|
| `/api/v1/plans` | `POST` | `product_id` | `public.plans` | `product_id UUID` | `REFERENCES products(id)` |
| | | `name` | `public.plans` | `name TEXT` | `NOT NULL` |
| | | `price` | `public.plans` | `price NUMERIC(14,2)` | `CHECK (price >= 0)` |
| | | `currency` | `public.plans` | `currency CHAR(3)` | `NOT NULL` (e.g. `'USD'`, `'INR'`) |
| | | `frequency` | `public.plans` | `frequency TEXT` | `CHECK (frequency IN ('daily','weekly','monthly','yearly'))` |
| | | `min_quantity` | `public.plans` | `min_quantity INTEGER` | `CHECK (min_quantity > 0) DEFAULT 1` |
| | | `available_from` | `public.plans` | `available_from DATE` | `NULLABLE` |
| | | `available_until` | `public.plans` | `available_until DATE` | `CHECK (available_until >= available_from)` |
| | | `auto_close` | `public.plans` | `auto_close BOOLEAN` | `DEFAULT false` |
| | | `allow_early_close` | `public.plans` | `allow_early_close BOOLEAN` | `DEFAULT false` |
| | | `allow_pause` | `public.plans` | `allow_pause BOOLEAN` | `DEFAULT false` |
| | | `allow_renew` | `public.plans` | `allow_renew BOOLEAN` | `DEFAULT false` |

---

### 1.4 Quotation Templates & Template Lines
| Endpoint | HTTP Method | API Request Body Fields | Target Table | PostgreSQL Column & Type | Constraint / Validation |
|---|---|---|---|---|---|
| `/api/v1/quotation-templates` | `POST` | `name` | `public.quotation_templates` | `name TEXT` | `NOT NULL` |
| | | `plan_id` | `public.quotation_templates` | `plan_id UUID` | `REFERENCES plans(id)` |
| | | `validity_days` | `public.quotation_templates` | `validity_days INTEGER` | `CHECK (validity_days > 0)` |
| | | `lines[].product_id` | `public.quotation_template_lines` | `product_id UUID` | `REFERENCES products(id)` |
| | | `lines[].variant_id` | `public.quotation_template_lines` | `variant_id UUID` | `NULLABLE REFERENCES product_variants(id)` |
| | | `lines[].quantity` | `public.quotation_template_lines` | `quantity INTEGER` | `CHECK (quantity > 0)` |

---

### 1.5 Subscriptions & Lines
| Endpoint | HTTP Method | API Request Body Fields | Target Table | PostgreSQL Column & Type | Constraint / Validation |
|---|---|---|---|---|---|
| `/api/v1/subscriptions` | `POST` | (Server generated) | `public.subscriptions` | `subscription_number TEXT` | `UNIQUE NOT NULL` (e.g. `'SUB-2026-0001'`) |
| | | `customer_id` | `public.subscriptions` | `customer_id UUID` | `REFERENCES profiles(id)` |
| | | `plan_id` | `public.subscriptions` | `plan_id UUID` | `REFERENCES plans(id)` |
| | | `status` | `public.subscriptions` | `status TEXT` | `DEFAULT 'draft' CHECK (status IN ('draft','quotation','confirmed','active','paused','closed'))` |
| | | `start_date` | `public.subscriptions` | `start_date DATE` | `NOT NULL` |
| | | `expiry_date` | `public.subscriptions` | `expiry_date DATE` | `NULLABLE` |
| | | `payment_terms` | `public.subscriptions` | `payment_terms TEXT` | `NULLABLE` (e.g. `'Net 30'`) |
| | | `next_billing_date` | `public.subscriptions` | `next_billing_date DATE` | `NOT NULL` (initially matches `start_date`) |
| | | `billing_anchor_date`| `public.subscriptions` | `billing_anchor_date DATE` | `NULLABLE` (for month-end calendar anchoring) |
| `/api/v1/subscriptions` (Lines) | `POST` | `lines[].product_id` | `public.subscription_lines` | `product_id UUID` | `REFERENCES products(id)` |
| | | `lines[].variant_id` | `public.subscription_lines` | `variant_id UUID` | `NULLABLE REFERENCES product_variants(id)` |
| | | `lines[].description` | `public.subscription_lines` | `description TEXT` | `NOT NULL` |
| | | `lines[].quantity` | `public.subscription_lines` | `quantity INTEGER` | `CHECK (quantity > 0)` |
| | | `lines[].unit_price` | `public.subscription_lines` | `unit_price NUMERIC(14,2)`| `CHECK (unit_price >= 0)` |
| | | `lines[].variant_adjustment` | `public.subscription_lines` | `variant_adjustment NUMERIC(14,2)`| `DEFAULT 0.00` |
| | | `lines[].tax_rate_percent` | `public.subscription_lines` | `tax_rate_percent NUMERIC(5,2)` | `CHECK (tax_rate_percent BETWEEN 0 AND 100)` |

---

### 1.6 Billing Engine & Repository Adapter Mapping
Maps exact calls from [backend/src/services/supabaseBillingRepository.cjs](file:///E:/Projects/Odoo-Team/backend/src/services/supabaseBillingRepository.cjs):

| Repository Method | Query / RPC Invoked | Target Tables / RPC | Database Fields Read or Written |
|---|---|---|---|
| `listDueSubscriptionIds({asOf, limit})` | `client.from('subscriptions').select('id').eq('status','active').lte('next_billing_date',asOf)` | `public.subscriptions` | Reads `id`. Uses partial index `idx_subscriptions_due_billing`. |
| `getBillingSnapshot(id)` | `client.from('subscriptions').select('id,status,customer_id,plan_id,start_date,next_billing_date,billing_anchor_date').eq('id',id).maybeSingle()` | `public.subscriptions` | Reads subscription status, customer, plan, dates. |
| | `client.from('plans').select('id,frequency,currency').eq('id',plan_id).single()` | `public.plans` | Reads frequency (`monthly`, `yearly`, etc.) and currency. |
| | `client.from('subscription_lines').select('product_id,description,quantity,unit_price,variant_adjustment,tax_rate_percent').eq('subscription_id',id)` | `public.subscription_lines` | Reads itemized billing lines. |
| | `client.from('discount_rules').select('id,kind,value,scope,min_amount,min_quantity,valid_from,valid_until,max_uses,used_count')` | `public.discount_rules` | Reads active discount rules. |
| | `client.from('discount_product_mappings').select('discount_rule_id,product_id')` | `public.discount_product_mappings` | Reads scoped product mappings. |
| `persistInvoiceAtomically({...})` | `client.rpc('persist_due_billing_invoice', { p_subscription_id, p_expected_date, p_next_date, p_due_date, p_subtotal, p_tax_total, p_discount_total, p_total, p_lines, p_discounts })` | `public.persist_due_billing_invoice` RPC | Locks row `FOR UPDATE`, validates totals, inserts `invoices`, inserts `invoice_lines`, inserts `discount_redemptions`, increments `discount_rules.used_count`, advances `subscriptions.next_billing_date`. |

---

### 1.7 Payments & Reconciliation Mapping
| Endpoint | HTTP Method | API Request Body Fields | Target Table | PostgreSQL Column & Type | Constraint / Validation |
|---|---|---|---|---|---|
| `/api/v1/invoices/:id/payments` | `POST` | Target invoice | `public.payments` | `invoice_id UUID` | `REFERENCES invoices(id)` |
| | | `amount` | `public.payments` | `amount NUMERIC(14,2)` | `CHECK (amount > 0)` |
| | | `method` | `public.payments` | `method TEXT` | `CHECK (method IN ('bank_transfer','credit_card','upi','cash','other'))` |
| | | `date` | `public.payments` | `paid_at TIMESTAMPTZ` | `NOT NULL` |
| | | `note` | `public.payments` | `note TEXT` | `NULLABLE` |
| | | `external_reference` | `public.payments` | `external_reference TEXT` | `NULLABLE`, protected by partial unique index |
| Trigger Effect | Insert | — | `public.invoices` | `status = 'paid'` | Trigger `fn_reconcile_payment()` checks sum of payments against invoice total |

---

## 2. Frontend User Interface Mapping

| UI View / Screen | Target Audience | Backing Database Tables / Views | RLS Policy Enforcing Access |
|---|---|---|---|
| **Customer Portal: Subscriptions** | Customer | `public.subscriptions`, `public.subscription_lines`, `public.plans` | `customer_id = auth.uid()` |
| **Customer Portal: Invoices** | Customer | `public.invoices`, `public.invoice_lines` | `customer_id = auth.uid()` |
| **Customer Portal: Payments** | Customer | `public.payments` | Via invoice join: `invoices.customer_id = auth.uid()` |
| **Customer Portal: Subscription Actions** | Customer | `public.subscriptions` | Customer can trigger `/pause`, `/close`, `/renew` if allowed by plan policy |
| **Admin Dashboard: Catalog Management** | Admin / Staff | `public.products`, `public.product_variants`, `public.plans` | `is_brightloop_staff()` |
| **Admin Dashboard: Discount Management** | Admin | `public.discount_rules`, `public.discount_product_mappings` | `is_brightloop_staff()` |
| **Admin Dashboard: Billing Control** | Admin / Staff | `POST /api/v1/billing/run` | Server-only Service Role RPC execution |
| **Admin Dashboard: Overdue Tracking** | Staff / Admin | `public.invoices` (`due_date < now() AND status != 'paid'`) | Backed by index `idx_invoices_due_status` |

---

## 3. AI Assistance Call Mapping

| AI Assistance Event Attribute | Source / Trigger | Target Column in `public.ai_assistance_events` | Data Type & Constraint |
|---|---|---|---|
| **Event Primary Key** | System generated | `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| **Customer Linkage** | From active session | `customer_id` | `UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE` |
| **Subscription Linkage** | Subscription confirmed/active | `subscription_id` | `UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE` |
| **Idempotency Key** | Generated event hash | `idempotency_key` | `TEXT NOT NULL UNIQUE` (e.g. `act_sub_1111-2222...`) |
| **Customer Opt-In Consent** | Customer Portal profile / checkout | `has_consented_ai_call` | `BOOLEAN NOT NULL DEFAULT false` |
| **Consent Timestamp** | Exact moment of opt-in | `consent_recorded_at` | `TIMESTAMPTZ NULLABLE` |
| **Contact Phone Number** | Customer profile phone | `phone_number` | `TEXT NULLABLE` |
| **Preferred Calling Window** | Customer choice | `preferred_call_window` | `TEXT NULLABLE` (e.g. `'morning_10_12'`, `'evening_16_18'`) |
| **Call Lifecycle Status** | Dispatch worker | `status` | `TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','queued','in-progress','completed','failed','opted-out'))` |
| **Retry Counter** | Background retry loop | `retry_count` | `INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0)` |
| **Retry Cap** | System limit | `max_retries` | `INTEGER NOT NULL DEFAULT 3 CHECK (max_retries > 0)` |
| **Scheduled Timestamp** | Trigger calculation | `scheduled_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| **Call Start Timestamp** | Provider callback | `initiated_at` | `TIMESTAMPTZ NULLABLE` |
| **Call Finish Timestamp** | Provider callback | `completed_at` | `TIMESTAMPTZ NULLABLE` |
| **Next Retry Timestamp** | Exponential backoff | `next_retry_at` | `TIMESTAMPTZ NULLABLE` |
| **Telephony Provider Name** | Dispatch service | `telephony_provider` | `TEXT DEFAULT 'mock'` (`'mock'`, `'twilio'`) |
| **Voice Synthesis Provider** | Dispatch service | `voice_provider` | `TEXT DEFAULT 'murf'` |
| **External Call Reference** | Provider session ID | `provider_call_id` | `TEXT NULLABLE` |
| **Call Outcome Summary** | Gemini assistant summary | `outcome_summary` | `TEXT NULLABLE` |
| **Audio / Transcript Link** | Storage reference | `transcript_url` | `TEXT NULLABLE` |
| **Error Telemetry** | Failure handler | `error_message` | `TEXT NULLABLE` |
| **Customer Opt-Out Timestamp**| Customer revoked consent | `opted_out_at` | `TIMESTAMPTZ NULLABLE` |
| **Customer Opt-Out Reason** | Customer input | `opt_out_reason` | `TEXT NULLABLE` |

