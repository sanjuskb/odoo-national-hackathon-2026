# Problem Statement Activation Protocol (Tomorrow Morning)

> **Activation Time:** 31 October 2026, 8:30 AM — 9:00 AM  
> **Team Lead:** Sanju (`@sanjuskb`)  
> **Collaborators:** Amarnath (Backend), Ravi (Frontend), Harsha (Database)

This document is the precise, step-by-step operating procedure to execute as soon as the ODDO National Hackathon Problem Statement is announced.

---

## ⏱️ Step-by-Step Activation Workflow

```text
[8:30 AM] Problem Statement Announced
    │
    ▼
Step 1: Deconstruct Problem Statement (8:30 - 8:45 AM)
    │   └── Fill out docs/problem-analysis-template.md
    ▼
Step 2: Determine Need for AI/ML vs Heuristics (8:45 - 8:55 AM)
    │   └── Is machine learning strictly justified?
    ▼
Step 3: Select Algorithm / Model (8:55 - 9:05 AM)
    │   └── Scikit-learn tabular / NLP / Rule Engine
    ▼
Step 4: Align & Freeze Contracts with Backend (9:05 - 9:20 AM)
    │   └── Lock contracts/input.schema.json & output.schema.json with Amarnath
    ▼
Step 5: Define Data Pipeline & Ingest Initial Samples (9:20 - 9:45 AM)
    │   └── Place raw sample data in data/sample/
    ▼
Step 6: Build & Test Smallest Useful MVP (9:45 - 11:00 AM)
    │   └── Implement src/models/ and src/inference/predictor.py
    ▼
Step 7: End-to-End Integration Verification (11:00 - 12:00 PM)
    │   └── Connect with Amarnath's backend API & run pytest
    ▼
Step 8: Document Real Metrics & Polish Limitations (Post-Lunch / Sprint)
    │   └── Update docs/ with actual metrics, no fake numbers
    ▼
[5:00 PM] Final Verified Delivery & Video Rehearsal
```

---

## Step 1: Analyze the Statement (8:30 – 8:45 AM)
Extract and document in `docs/problem-analysis-template.md`:
- **Core Problem:** What real-world obstacle is being removed?
- **Target Users:** Who uses this (operators, consumers, managers)?
- **Expected Outcomes:** What quantitative result demonstrates success?
- **Hard Constraints:** Latency, offline availability, dependencies.
- **Required Functionality:** What are the 3 non-negotiable features?
- **Available Data:** Is there provided CSV/JSON/API data, or do we seed representative data?

---

## Step 2: Determine Whether AI/ML is Necessary (8:45 – 8:55 AM)
Ask the 7 critical engineering questions:
1. *Can deterministic logic solve this?* If yes, use a rule engine or scoring formula.
2. *Is prediction needed?* (Continuous target -> Regression)
3. *Is classification needed?* (Discrete labels -> Classification)
4. *Is NLP needed?* (Text sentiment, parsing, extraction)
5. *Is Computer Vision needed?* (Images, OCR, frames)
6. *Is recommendation needed?* (Ranked items, affinity)
7. *Is an LLM genuinely useful?* (Unstructured generation or conversational synthesis)

*Decision Rule:* Do NOT use complex ML if a deterministic algorithm achieves equal or better utility in less time.

---

## Step 3: Select the Model or Algorithm (8:55 – 9:05 AM)
Evaluate candidate approaches against:
- Data availability (number of samples, feature quality)
- Latency (must respond in < 100ms for local models)
- Interpretability (can we explain predictions to Vivek Pathak / judges?)
- Training speed (can we train it in < 60 seconds on standard CPU?)
- Integration complexity (minimal package friction)

---

## Step 4: Agree on Interface Contract with Amarnath (9:05 – 9:20 AM)
- Meet with Amarnath and Ravi.
- Open `ai/contracts/input.schema.json` and `ai/contracts/output.schema.json`.
- Replace the provisional feature fields with the exact business attributes agreed upon.
- Update `ai/src/core/config.py` and validation models.
- **Freeze the contract.** Both Sanju and Amarnath can now develop in parallel without blocking each other.

---

## Step 5: Define Data Pipeline & Synthetic Samples (9:20 – 9:45 AM)
- Ingest provided datasets into `ai/data/raw/`.
- If no dataset is provided by organizers, generate representative synthetic data in `ai/data/sample/` and label it clearly:
  `SYNTHETIC TEST DATA — NOT REAL-WORLD DATA`.
- Implement cleaning and transformations in `ai/src/preprocessing/`.

---

## Step 6: Implement the Smallest Useful AI Component (MVP First)
- Implement `BaseModel` subclass in `ai/src/models/` (or rule engine).
- Implement training / fitting logic in `ai/src/training/train.py`.
- Connect into `ai/src/inference/predictor.py`.
- Run `pytest ai/tests/test_inference.py` to ensure local predictions run cleanly.

---

## Step 7: Test and Validate
- Split data: 70% Train, 15% Validation, 15% Test.
- Measure baseline score vs model score in `ai/src/training/evaluation.py`.
- Log real metrics (F1, MAE, latency) honestly.

---

## Step 8: Integrate with Backend
- Test connection with Amarnath's backend either via direct import or HTTP endpoint.
- Verify fallback behavior when backend supplies partial or malformed inputs.
- Verify frontend rendering with Ravi.

---

## Step 9: Finalize Documentation & Defense
- Complete `docs/evaluator-questions.md` with problem-specific answers.
- Review `docs/limitations.md`.
- Prepare 2-minute clear explanation for jury presentation.

