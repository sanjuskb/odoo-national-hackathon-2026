# Interface Contracts & JSON Schemas

> **Lead Architect:** Sanju (`@sanjuskb`)  
> **Backend Integration Partner:** Amarnath (`@amarnathgaddam75`)  
> **Frontend Integration Partner:** Ravi (`@donnyravi-alt`)  
> **Status:** PROVISIONAL — TO BE FINALIZED UPON PROBLEM STATEMENT RELEASE

---

## 1. Overview

This directory houses the formal, versioned JSON Schemas defining the boundary between Amarnath's backend application and Sanju's AI/ML module.

Adhering to strict schemas enables:
1. **Parallel Development:** Amarnath can mock AI responses in his backend tests using `output.schema.json` without waiting for the model to finish training.
2. **Deterministic Validation:** The AI module automatically rejects malformed requests before computation begins.
3. **Safe Consumption:** The frontend and backend are guaranteed that returned payloads contain no unexpected or missing keys.

---

## 2. Schema Files

| File | Purpose | Consumer |
|---|---|---|
| [`input.schema.json`](input.schema.json) | Validates feature payloads sent into the AI module. | AI Inference Engine (`src/data/validation.py`) |
| [`output.schema.json`](output.schema.json) | Standard response envelope containing predictions, confidence, and metadata. | Backend (`backend/`) & Frontend (`frontend/`) |
| [`error.schema.json`](error.schema.json) | Structured error response returned when validation or execution fails. | Backend error handler |

---

## 3. Sample Payloads

### Request Payload (`input.schema.json`)
```json
{
  "request_id": "req-98765-abc",
  "entity_id": "entity-042",
  "features": {
    "feature_a": 42.0,
    "feature_b": "category_1"
  },
  "options": {
    "explain": true,
    "timeout_ms": 2000
  }
}
```

### Success Response Payload (`output.schema.json`)
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
    "latency_ms": 1.25,
    "fallback_used": false,
    "timestamp": "2026-10-31T09:00:00Z"
  },
  "error": null
}
```

### Error Response Payload (`error.schema.json`)
```json
{
  "success": false,
  "model_version": "0.1.0-alpha",
  "result": null,
  "metadata": {
    "latency_ms": 0.35,
    "fallback_used": false,
    "timestamp": "2026-10-31T09:00:00Z"
  },
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Field 'features.feature_a' must be a numeric value.",
    "details": {
      "field": "features.feature_a"
    }
  }
}
```

