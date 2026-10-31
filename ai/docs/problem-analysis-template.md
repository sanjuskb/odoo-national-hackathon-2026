# Problem Statement Analysis Template

> **Usage:** Fill this document out within the first 30 minutes of receiving the official problem statement at 8:30 AM.

---

## 1. Problem Identification

- **Problem Title / Identifier:** `TODO: FINALIZE AFTER OFFICIAL PROBLEM STATEMENT`
- **Target Audience / Stakeholders:** `TODO: FINALIZE AFTER OFFICIAL PROBLEM STATEMENT`
- **Core Business Goal:** What measurable real-world metric does this system improve?
- **Key Pain Point Being Solved:**

---

## 2. Requirement Decomposition

### Functional Requirements (What the system MUST do)
1. `TODO: FINALIZE AFTER OFFICIAL PROBLEM STATEMENT`
2. `TODO: FINALIZE AFTER OFFICIAL PROBLEM STATEMENT`
3. `TODO: FINALIZE AFTER OFFICIAL PROBLEM STATEMENT`

### Non-Functional Requirements
- **Latency / Response Time Target:** (e.g., < 200ms for real-time inference)
- **Throughput / Concurrency:** (e.g., single-user demo vs 50 requests/sec)
- **Explainability:** (Is a black-box model acceptable to judges, or is explanation required?)
- **Offline vs Online:** (Must it work completely offline without external APIs?)

---

## 3. Decision Matrix: Is AI/ML Necessary?

Answer each question honestly:

| Question | Answer (Yes/No) | Rationale / Evidence |
|---|---|---|
| Can a deterministic algorithm (rules/heuristics) solve 80%+ of this? | `TODO` | |
| Is there an available, labelled dataset with sufficient samples? | `TODO` | |
| Is statistical pattern recognition required? | `TODO` | |
| Is natural language understanding / generation needed? | `TODO` | |
| Is a prediction or probabilistic estimate needed? | `TODO` | |
| Can the team build, validate, and demo this within the 8-hour window? | `TODO` | |

**Conclusion:**
- [ ] **Deterministic Algorithm / Heuristic Engine** (Preferred if rules are well-defined)
- [ ] **Classical Machine Learning** (Logistic Regression, Random Forest, XGBoost)
- [ ] **Pre-trained Embeddings / Vector Search**
- [ ] **LLM Integration via API**
- [ ] **Hybrid Approach** (Heuristic fallback + ML enhancement)

---

## 4. Input & Output Boundaries (AI <-> Backend Contract)

### Expected Inputs from Backend:
```json
{
  "entity_id": "TODO",
  "features": {}
}
```

### Expected Output to Backend:
```json
{
  "prediction": "TODO",
  "confidence": 0.0,
  "explanation": "TODO"
}
```

---

## 5. Potential Risks & Failure Modes

1. **Risk:** Incomplete or corrupted input data.  
   *Mitigation:* Strict validation in `src/data/validation.py` with fallback defaults.
2. **Risk:** Model execution exceeds latency threshold.  
   *Mitigation:* Caching repeated feature sets, lightweight estimators.
3. **Risk:** Model makes counter-intuitive prediction during live demo.  
   *Mitigation:* Rule-based guardrails in `src/inference/postprocessing.py`.

---

## 6. Hackathon MVP Plan (First 2 Hours)

- **T+0:30:** API contract frozen with Amarnath.
- **T+1:00:** Synthetic sample data generated for test suite.
- **T+1:30:** Baseline heuristic or model running in `src/inference/predictor.py`.
- **T+2:00:** End-to-end integration verified with backend endpoint.

