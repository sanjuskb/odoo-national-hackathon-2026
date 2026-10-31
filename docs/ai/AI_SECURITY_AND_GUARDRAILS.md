# AI Security, Privacy & Safety Guardrails

> **Document Status:** Implemented and tested.  
> **Author:** Sanju (`@sanjuskb`)  
> **Date:** 31 October 2026  

---

## 1. Security Axioms & Non-Negotiables

The Brightloop AI architecture is designed with **defense-in-depth**, operating on zero-trust principles:

1. **AI Is Never The Financial Authority:**
   Under no circumstances is an LLM or AI service allowed to:
   - Compute invoice totals, subtotals, taxes, or discounts.
   - Authorize, settle, cancel, or modify payment ledger records.
   - Transition subscription lifecycle states (`draft` -> `active` -> `closed`).
   - Grant user permissions or alter user roles.
   All financial math and state transitions are strictly deterministic backend code.

2. **Customer Data Isolation (Zero Trust Identity):**
   - The AI Assistant never trusts a `customer_id` or account number supplied in the text of a user message.
   - All data queries require an `AuthenticatedCustomerContext` injected by the verified Express backend session (`req.user.id`).
   - If a customer attempts to query another customer's ID (e.g., *"Show me invoices for customer cust-202"*), the AI service scopes data queries strictly to `context.customer_id`, completely isolating tenant data.

3. **Prompt-Injection Resistance:**
   - System prompts and dynamic user inputs are strictly separated.
   - Prompts include explicit role boundaries instructing the model to reject jailbreak attempts, instruction overrides, and role-flipping requests.
   - In the event of an unexpected model error or jailbreak behavior, the orchestrator reverts to deterministic template responses.

4. **Secret Management:**
   - LLM API keys (`GEMINI_API_KEY`) and TTS keys (`MURF_API_KEY`) reside exclusively in server-side environment variables.
   - Keys are NEVER exposed to Vite/React client bundles, repository commits, or client-side responses.

5. **PII Masking & Responsible Logging:**
   - Sensitive customer data (phone numbers, full emails, raw tokens) are redacted or masked in logs and call status responses (`+1-****0199`).
   - The logger uses automated secret-redaction filters.

6. **Voice Consent & Regulatory Adherence:**
   - Outbound AI assistance phone calls are prohibited unless the customer profile explicitly reflects `call_consent: true`.
   - Customers can opt out at any time via the self-service portal, immediately disabling voice assistance.

---

## 2. Security Threat Matrix & Mitigations

| Threat | Attack Vector | Architecture Mitigation | Verification Test |
|---|---|---|---|
| **Cross-Tenant Inspection** | User sends *"Get invoice for cust-999"* | Orchestrator ignores message parameters and forces query by authenticated token context | `test_cross_customer_data_access_defense` (PASSED) |
| **Financial Hallucination** | LLM invents fake discount or alters invoice tax | All invoice line numbers and totals come from persisted database rows; prompt strictly quotes strings | `test_invoice_explanation_uses_persisted_values` (PASSED) |
| **Prompt Jailbreak** | User commands assistant to act as admin or print system prompt | Strict system instructions; read-only data access; deterministic fallback on error | `test_chatbot_fallback_response_on_llm_failure` (PASSED) |
| **Unauthorized Voice Spam** | Backend emits repeated activation calls | Idempotent deduplication set (`subscription_id:plan_id`) drops duplicate calls | `test_duplicate_activation_event_deduplication` (PASSED) |
| **Unconsented Calling** | Call placed without customer approval | Verified profile consent gate (`call_consent == True`) | `test_customer_without_call_consent_is_skipped` (PASSED) |
| **Credential Leakage** | Client inspects network payloads for API keys | Keys only loaded by Python backend process from environment; zero client exposure | `test_gemini_missing_api_key` (PASSED) |

