# Backend Integration & Interface Contract

## 1. Collaboration Boundary

- **AI/ML Module Owner:** Sanju (`@sanjuskb`)
- **Backend Application Owner:** Amarnath (`@amarnathgaddam75`)
- **Frontend Lead:** Ravi (`@donnyravi-alt`)

The AI/ML module is designed to integrate cleanly into the core application via either:
1. **In-Process Python Module (Recommended for simplicity):** Backend imports `ai.src.inference.predictor` directly.
2. **HTTP REST Microservice:** Standalone FastAPI server on `AI_PORT` (default: 8000), communicating via JSON over HTTP.

---

## 2. API Contract Specification

All payloads conform strictly to the schemas defined in `ai/contracts/`.

### 2.1 Request Schema (`contracts/input.schema.json`)

```json
{
  "request_id": "req-12345-abcde",
  "entity_id": "entity-001",
  "features": {
    "feature_a": 12.5,
    "feature_b": "category_1"
  },
  "options": {
    "explain": true,
    "timeout_ms": 2000
  }
}
```

### 2.2 Standard Success Response (`contracts/output.schema.json`)

```json
{
  "success": true,
  "model_version": "0.1.0-alpha",
  "result": {
    "prediction": "PROVISIONAL_OUTPUT",
    "confidence": 0.95,
    "explanation": "Heuristic baseline prediction"
  },
  "metadata": {
    "latency_ms": 1.82,
    "fallback_used": false,
    "timestamp": "2026-10-31T09:00:00Z"
  },
  "error": null
}
```

### 2.3 Error Response Schema (`contracts/error.schema.json`)

```json
{
  "success": false,
  "model_version": "0.1.0-alpha",
  "result": null,
  "metadata": {
    "latency_ms": 0.42,
    "fallback_used": false,
    "timestamp": "2026-10-31T09:00:00Z"
  },
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Required feature 'feature_a' missing in request payload",
    "details": {
      "field": "features.feature_a"
    }
  }
}
```

---

## 3. SLA, Timeouts, and Reliability

- **Timeout Expectation:** Normal inference completes in `< 50ms` (classical model/heuristic) or `< 1500ms` (if external LLM API).
- **Backend Protection:** Amarnath's backend should set an HTTP timeout of `2000ms` on calls to the AI service.
- **Fail-Safe Principle:** AI outputs are advisory. Critical business invariants (e.g., payments, user authentication, data deletion) must NEVER be solely controlled by unvalidated AI output.
- **Fallback Guarantee:** If the primary model fails or times out, the AI engine returns a deterministic fallback prediction with `"fallback_used": true`.

---

## 4. Endpoints (When Running as Microservice)

- `GET /health`: Diagnostic check returning system readiness, loaded model name, and version.
- `POST /predict`: Primary synchronous prediction endpoint conforming to input/output contracts.
- `GET /metadata`: Returns current model metadata, feature requirements, and training metrics.

