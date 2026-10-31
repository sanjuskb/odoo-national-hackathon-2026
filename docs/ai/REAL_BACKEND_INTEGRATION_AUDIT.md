# Real Backend Integration Audit — Brightloop Express & AI Module

> **Document:** `docs/ai/REAL_BACKEND_INTEGRATION_AUDIT.md`  
> **Author:** Sanju (AI & Integration Lead)  
> **Date:** 2026-10-31  
> **Repository:** `odoo-national-hackathon-2026`  
> **Branch:** `feature/sanju-integration`  

---

## 1. Executive Summary

This audit assesses the readiness of the Express backend (`backend/src/`) and Supabase database (`database/`) for direct live consumption by the Brightloop AI services (`ai/src/`).

### Overall Integration Status
- **Authentication & RBAC:** ✅ **Ready & Tested** (`POST /api/v1/auth/login`, `GET /api/v1/auth/me`, `authenticate.js`).
- **Product Catalog:** ⏳ **Implemented on Amarnath's branch** (`feature/amarnath-backend`), awaiting PR merge into `develop`.
- **Customer Subscriptions:** ⏳ **Implemented on Amarnath's Phase 3 branch** (`feature/amarnath-products-plans`), awaiting PR merge into `develop`.
- **Customer Invoices & Lines:** ❌ **Pending Backend Route Implementation** (Only admin billing generation `POST /api/v1/billing/run` exists on `develop`).
- **Database Schema & RLS:** ⏳ **Complete in Harsha's PR #27** (`database/migrations/20261031_001_brightloop_core.sql`), awaiting merge into `develop`.

---

## 2. Capability Audit Matrix

| # | Capability | Target Path | Method | Current Status | Implemented On | Authentication | Ready for AI Consumption? |
|---|---|---|---|---|---|---|:---:|
| 1 | **Customer Authentication** | `/api/v1/auth/login` | POST | ✅ Merged in `develop` | `develop` | Public | **YES** |
| 2 | **Identity Verification** | `/api/v1/auth/me` | GET | ✅ Merged in `develop` | `develop` | Bearer JWT | **YES** |
| 3 | **Subscription Plans Catalog** | `/api/v1/plans` | GET | ⏳ Implemented | `feature/amarnath-backend` | Public / Optional | ⏳ Pending merge |
| 4 | **Customer Subscription List** | `/api/v1/portal/subscriptions` | GET | ⏳ Implemented | `feature/amarnath-products-plans` | Bearer (Customer) | ⏳ Pending merge |
| 5 | **Subscription Details** | `/api/v1/subscriptions/:id` | GET | ⏳ Implemented | `feature/amarnath-products-plans` | Bearer (Customer/Staff) | ⏳ Pending merge |
| 6 | **Customer Invoices List** | `/api/v1/portal/invoices` | GET | ❌ Not Implemented | Pending Backend Sprint | Bearer (Customer) | ❌ **No (Use Fixture)** |
| 7 | **Invoice Details & Lines** | `/api/v1/invoices/:id` | GET | ❌ Not Implemented | Pending Backend Sprint | Bearer (Customer/Staff) | ❌ **No (Use Fixture)** |
| 8 | **Payment Status & Balance** | In Invoice Payload | GET | ❌ Not Implemented | Pending Backend Sprint | Bearer (Customer) | ❌ **No (Use Fixture)** |
| 9 | **Admin Billing Run** | `/api/v1/billing/run` | POST | ✅ Merged in `develop` | `develop` | Bearer (Admin only) | Backend-to-DB only |

---

## 3. Required Express Backend Contracts for AI

The AI service (`HttpBackendClient`) requires the following contracts from Amarnath once Phase 2 and Phase 3 are merged into `develop`:

### Contract A: Customer Subscriptions List
- **Method & Path:** `GET /api/v1/portal/subscriptions`
- **Header:** `Authorization: Bearer <supabase_access_token>`
- **Expected Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "sub_uuid_here",
        "customer_id": "cust_uuid_here",
        "plan_id": "plan_uuid_here",
        "plan_name": "Professional Plan",
        "status": "active",
        "start_date": "2026-10-01T00:00:00Z",
        "next_billing_date": "2026-11-30T00:00:00Z",
        "amount": "49.00",
        "currency": "USD"
      }
    ]
  },
  "message": "Subscriptions retrieved successfully",
  "errors": null
}
```

### Contract B: Customer Invoices List & Details
- **Method & Path:** `GET /api/v1/portal/invoices/:id` (or `GET /api/v1/invoices/:id`)
- **Header:** `Authorization: Bearer <supabase_access_token>`
- **Expected Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "invoice": {
      "id": "inv_uuid_here",
      "invoice_number": "INV-2026-0001",
      "customer_id": "cust_uuid_here",
      "subscription_id": "sub_uuid_here",
      "status": "confirmed",
      "issue_date": "2026-10-31",
      "due_date": "2026-11-15",
      "currency": "USD",
      "subtotal": "49.00",
      "total_discount": "0.00",
      "total_tax": "4.90",
      "total_amount": "53.90",
      "amount_paid": "0.00",
      "outstanding_balance": "53.90",
      "lines": [
        {
          "id": "line_uuid_1",
          "product_name": "Professional Plan Subscription",
          "quantity": 1,
          "unit_price": "49.00",
          "tax_amount": "4.90",
          "line_total": "53.90"
        }
      ],
      "taxes": [
        {
          "name": "Standard GST",
          "rate_percentage": "10.00",
          "amount": "4.90"
        }
      ],
      "discounts": []
    }
  },
  "message": "Invoice details retrieved successfully",
  "errors": null
}
```

---

## 4. Current AI Service Adapter Mode
Because Contracts A and B are not yet merged onto `develop`:
1. `MockBackendClient` is used for reliable offline evaluators and CI tests.
2. `HttpBackendClient` is fully implemented and mapped to the exact contracts above, ready to switch on seamlessly via `USE_MOCK_PROVIDERS=false` once Amarnath's PRs are integrated.
3. The demo dashboard clearly labels fixture-based data so evaluators are never misled.

