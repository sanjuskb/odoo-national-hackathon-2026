# Database Diagrams & Architecture Visualizations
## Brightloop Software Subscription Management System

**Assigned Engineer:** Harsha (`harsha-1706`), Database Engineer  
**Status:** Architecture Implemented  

---

## 1. Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    PROFILES ||--o{ SUBSCRIPTIONS : "places (customer_id)"
    PROFILES ||--o{ INVOICES : "billed_to (customer_id)"
    PROFILES ||--o{ PAYMENTS : "remits (customer_id)"

    PRODUCTS ||--o{ PRODUCT_VARIANTS : "offers"
    PRODUCTS ||--o{ PLAN_PRODUCTS : "bundled_in"
    PRODUCTS ||--o{ SUBSCRIPTION_LINES : "line_item"
    PRODUCTS ||--o{ INVOICE_LINES : "snapshot_item"

    PLANS ||--o{ PLAN_PRODUCTS : "contains"
    PLANS ||--o{ SUBSCRIPTIONS : "governs"
    PLANS ||--o{ QUOTATION_TEMPLATES : "standardizes"

    QUOTATION_TEMPLATES ||--|{ QUOTATION_TEMPLATE_LINES : "composed_of"

    SUBSCRIPTIONS ||--|{ SUBSCRIPTION_LINES : "includes"
    SUBSCRIPTIONS ||--o{ INVOICES : "generates (billing)"
    SUBSCRIPTIONS ||--o{ DISCOUNT_REDEMPTIONS : "redeems"

    DISCOUNT_RULES ||--o{ DISCOUNT_REDEMPTIONS : "applied_via"

    INVOICES ||--|{ INVOICE_LINES : "itemizes"
    INVOICES ||--o{ PAYMENTS : "settles"
    INVOICES ||--o{ DISCOUNT_REDEMPTIONS : "snapshots"

    PROFILES {
        uuid id PK "references auth.users"
        text email UK
        text full_name
        text role "admin | staff | customer"
        text company_name
    }

    PRODUCTS {
        uuid id PK
        text name
        text product_type "software | addon | service"
        numeric sales_price
        numeric cost_price
    }

    PRODUCT_VARIANTS {
        uuid id PK
        uuid product_id FK
        text variant_name "e.g. Brand: Odoo"
        numeric price_extra "+560.00"
    }

    PLANS {
        uuid id PK
        text name
        text billing_frequency "daily | weekly | monthly | yearly"
        numeric price
        integer min_quantity
    }

    SUBSCRIPTIONS {
        uuid id PK
        text subscription_number UK
        uuid customer_id FK
        uuid plan_id FK
        date start_date
        date next_billing_date
        text state "draft | quotation | confirmed | active | paused | closed"
    }

    INVOICES {
        uuid id PK
        text invoice_number UK
        uuid subscription_id FK "UQ(subscription_id, billing_period_start)"
        uuid customer_id FK
        date billing_period_start
        date due_date
        text status "draft | confirmed | paid | cancelled"
        numeric total_amount
        numeric amount_due
    }

    PAYMENTS {
        uuid id PK
        uuid invoice_id FK
        uuid customer_id FK
        numeric amount
        text payment_method "credit_card | bank_transfer | upi | cash"
        text status "completed | failed | refunded"
    }
```

The diagram source file is also maintained at [`schema_erd.mmd`](./schema_erd.mmd).
