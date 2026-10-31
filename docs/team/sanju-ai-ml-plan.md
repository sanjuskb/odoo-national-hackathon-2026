# Sanju — invoice generation, AI innovation, integration and evaluator story

**Ownership:** Sanju is the primary owner of the deterministic invoice-generation service/workflow, in coordination with Amarnath for Express integration and Harsha for database persistence, constraints and RLS. This ownership assignment does not mean the feature is already implemented.

## 1. Invoice generation — core engineering responsibility
- Implement the deterministic invoice-generation service and billing-period orchestration.
- Apply the team-approved currency, tax, discount, rounding, timezone and partial-payment policies.
- Ensure one invoice per subscription per billing period using database uniqueness and transaction-safe idempotency.
- Test repeat runs, concurrent runs, boundary dates, discounts, taxes and reconciliation.
- Coordinate with Amarnath on API/service integration and Harsha on invoice schema, migrations and constraints.
- Keep invoice totals, payment status and outstanding balances authoritative in backend/database code.

## 2. AI innovation — optional layer, never the financial authority
- Build a Gemini-powered, authenticated, read-only customer assistant using approved APIs.
- Explore the Brightloop AI Assistance Call after confirmed subscription activation, with explicit customer consent, opt-out and provider-aware failure handling.
- Integrate Murf TTS and a telephony provider only after the text workflow is reliable and credentials/provider access are approved.
- Add invoice explanations grounded in persisted invoice/payment records. AI may explain values but must never calculate, change, generate, settle or approve financial amounts.

## 3. Team integration and quality
- Approve unresolved finance policies with the team (currency, tax, discount order, partial payments, billing timezone).
- Coordinate API and Supabase integration, verify tests and frequent merges.
- Verify customer ownership isolation, billing idempotency and dashboard reconciliation.
- Own evaluator collaborator invitation and live demo readiness.

## 4. Evaluator story
Show one end-to-end Brightloop lifecycle: admin product/variant/plan → quote/subscription → recurring invoice → payment → dashboard → customer-only access. Demonstrate the AI assistant/voice workflow only if it is genuinely working; clearly label simulations and limitations.

Produce a video under five minutes: problem (0:00–0:30), solution (0:30–1:05), architecture (1:05–1:45), demo (1:45–3:35), technical proof (3:35–4:20), impact/limits (4:20–5:00).

**Non-negotiable:** Never compute financial ledger totals with an LLM. The official PS does not require AI/ML; protect core billing correctness and demo readiness first.
