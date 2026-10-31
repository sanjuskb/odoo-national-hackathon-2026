# Inference Pipeline & Execution Flow

## 1. Overview

The inference module (`src/inference/`) transforms validated feature inputs into standardized predictions and decision payloads for backend consumption.

---

## 2. Real-Time Execution Flow

```text
Backend Request (JSON)
       │
       ▼
[1] Schema Validation (src/data/validation.py)
       │   ├── Valid?  ──> Continue
       │   └── Invalid? ──> Return 422 Unprocessable Entity
       ▼
[2] Preprocessing & Feature Extraction (src/preprocessing/)
       │   ├── Clean missing values & handle types
       │   └── Vectorize features for model input
       ▼
[3] Model Execution (src/models/base.py)
       │   ├── Primary Model / Algorithm
       │   └── [Failover] Fallback Heuristic if Primary fails/times out
       ▼
[4] Post-Processing & Calibration (src/inference/postprocessing.py)
       │   ├── Calibrate probabilities
       │   ├── Apply business decision thresholds
       │   └── Generate explainability metadata
       ▼
[5] Output Validation (src/data/validation.py against contracts/output.schema.json)
       │
       ▼
Standardized JSON Response Returned to Backend
```

---

## 3. Fallback & Graceful Degradation Strategy

In hackathon live demos, failure to return a response crashes the frontend. To prevent this, the inference pipeline implements **Defense-in-Depth**:

1. **Timeout Guard:** If model execution exceeds `INFERENCE_TIMEOUT_SECONDS` (default: 5.0s), the call is aborted and routed to the fallback engine.
2. **Deterministic Fallback:** Every model registration includes a paired lightweight heuristic rule (e.g., historical average, default category, or rule matrix).
3. **Transparent Flagging:** The response envelope includes `"fallback_used": true` in the metadata so the backend and evaluator know a fallback triggered.
4. **Zero Unhandled Exceptions:** Any internal Python exception is captured, logged with a redacted context, and converted into a standard structured error payload (`contracts/error.schema.json`).

---

## 4. Response Envelope Standard

Every inference execution returns the following standard format:

```json
{
  "success": true,
  "model_version": "0.1.0-alpha",
  "result": {
    "prediction": "PROVISIONAL_OUTPUT",
    "confidence": 0.95,
    "explanation": "Derived from baseline heuristic"
  },
  "metadata": {
    "latency_ms": 1.45,
    "fallback_used": false,
    "timestamp": "2026-10-31T09:30:00Z"
  },
  "error": null
}
```

