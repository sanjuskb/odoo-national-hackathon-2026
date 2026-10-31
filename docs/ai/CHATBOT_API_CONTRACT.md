# API Contract — Brightloop Customer Assistant & Invoice Intelligence

> **Document Status:**  
> - **AI Service Endpoints (`:8000`):** Implemented and tested.  
> - **Express Proxy Endpoints (`/api/v1/...`):** Proposed, awaiting team approval from Amarnath and Ravi.  
> **Owner:** Sanju (`@sanjuskb`)  
> **Date:** 31 October 2026  

---

## 1. Overview & Conventions

All AI assistant and invoice intelligence requests are strictly authenticated. The Express backend verifies the customer's Supabase JWT bearer token, extracts the authenticated customer ID, and attaches this verified context before routing to the AI engine.

### Response Envelope
Adheres to the repository's standard response envelope:
```json
{
  "success": true,
  "data": { ... },
  "message": "Assistant response generated successfully",
  "errors": null
}
```

---

## 2. Endpoints

### 2.1 Customer Assistant Chat
**Method:** `POST`  
**Express Path:** `/api/v1/assistant/chat`  
**AI Microservice Path:** `/assistant/chat`  
**Authorization:** Authenticated Customer or Admin  
**Status:** Implemented and tested on AI service; Express route proposed.

#### Request Body
```json
{
  "message": "What does my current subscription plan include?",
  "context": {
    "customer_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "email": "customer@example.com",
    "full_name": "Jane Doe",
    "role": "customer",
    "session_token": "ey..."
  },
  "conversation_history": [
    {
      "role": "user",
      "content": "Hello"
    },
    {
      "role": "assistant",
      "content": "Hello Jane! I am your Brightloop Customer Assistant. How can I assist you with your subscription today?"
    }
  ]
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "reply": "Your active Professional Plan ($49.00/month) includes multi-frequency billing, discount rules, automated reminders, and AI assistant access. Your next renewal date is 2026-11-30.",
    "intent": "explain_subscribed_plan",
    "grounded": true,
    "is_simulated": false,
    "latency_ms": 34.2,
    "disclaimer": "Brightloop AI Assistant operates in read-only advisory mode. Financial transactions and plan modifications must be confirmed via customer portal.",
    "metadata": {
      "customer_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "active_subscriptions_count": 1,
      "invoices_count": 1
    }
  },
  "message": "Grounded chat response generated",
  "errors": null
}
```

#### Error Codes
| Code | Meaning | Condition |
|---|---|---|
| `401 Unauthorized` | Missing / invalid token or empty `customer_id` in context | Unauthenticated invocation |
| `403 Forbidden` | Prompt attempted cross-customer access | Security rule violation |
| `422 Unprocessable` | Empty or malformed payload | Message length < 1 or > 2000 chars |
| `500 Server Error` | Model or service internal error | Upstream fallback response returned |

---

### 2.2 Explain Customer Invoice
**Method:** `POST`  
**Express Path:** `/api/v1/invoice/explain`  
**AI Microservice Path:** `/invoice/explain`  
**Authorization:** Authenticated Customer (must own the invoice) or Admin  
**Status:** Implemented and tested on AI service; Express route proposed.

#### Request Body
```json
{
  "invoice_id": "inv-301",
  "customer_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "session_token": "ey..."
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "invoice_id": "inv-301",
    "invoice_number": "INV-2026-0001",
    "status": "confirmed",
    "due_date": "2026-11-15",
    "currency": "USD",
    "subtotal": "49.00",
    "total_tax": "4.90",
    "total_discount": "0.00",
    "total_amount": "53.90",
    "amount_paid": "0.00",
    "outstanding_balance": "53.90",
    "lines": [
      {
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
    "discounts": [],
    "explanation_narrative": "Invoice INV-2026-0001 covers your subscription charges for the Professional Plan ($53.90). This includes $4.90 for Standard GST (10%). The total amount billed is $53.90 USD. Currently, no payments have been recorded, leaving an outstanding balance of $53.90 due on 2026-11-15.",
    "is_simulated": false,
    "disclaimer": "Financial calculations are authoritative in the backend database. This explanation is provided for customer convenience."
  },
  "message": "Invoice explained successfully",
  "errors": null
}
```

#### Error Codes
| Code | Meaning | Condition |
|---|---|---|
| `401 Unauthorized` | Missing customer credentials | Token invalid |
| `403 Forbidden` | Caller customer ID does not match invoice owner ID | Attempting to view someone else's bill |
| `404 Not Found` | Invoice ID not found | Non-existent invoice |
| `500 Server Error` | Explanation generation failure | Backend fallback narrative returned |

