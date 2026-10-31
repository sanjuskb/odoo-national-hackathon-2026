# Model Selection Guide

## 1. Decision Hierarchy

In a time-constrained hackathon setting, model selection must balance **feasibility, interpretability, latency, and predictive performance**.

Follow this strict evaluation priority:

```text
1. Deterministic Heuristic / Rule Matrix
       | (if inadequate for pattern complexity)
       v
2. Classical ML Baseline (Linear/Logistic, Tree, Naive Bayes)
       | (if non-linear interactions justify complexity)
       v
3. Ensemble / Gradient Boosted Trees (Random Forest, LightGBM)
       | (if unstructured text/image data)
       v
4. Pre-trained Deep Models / Foundation Models (via zero-shot or embeddings)
```

---

## 2. Model Archetype Comparison

| Model Family | Training Time | Inference Latency | Data Requirement | Interpretability | Best Suited For |
|---|---|---|---|---|---|
| **Rule-Based Heuristic** | 0 sec | < 1 ms | 0 (domain logic) | 100% (White box) | Clear business rules, threshold scoring, fraud triage, initial baseline. |
| **Linear / Logistic Regression** | < 5 sec | < 2 ms | 50 - 500 samples | High (Coefficients) | Binary classification, probability estimates, pricing models. |
| **Decision Trees / Random Forest** | 5 - 30 sec | < 5 ms | 100 - 2,000 samples | Medium (Feature importance) | Tabular datasets with non-linear feature interactions. |
| **K-Means / DBSCAN** | < 10 sec | < 5 ms | 50 - 1,000 samples | Medium (Centroids) | Customer segmentation, clustering, novelty detection. |
| **TF-IDF + Cosine Similarity** | < 5 sec | < 10 ms | 20 - 500 documents | High (Token overlap) | Content recommendation, catalog search, text retrieval. |
| **Foundation LLM (API)** | 0 sec (No train) | 500 - 2,500 ms | 0 (Few-shot) | Low-Medium | Complex unstructured text synthesis, extraction, conversational UX. |

---

## 3. Evaluation Criteria Before Finalizing a Model

Every candidate model must be scored against these 5 practical filters:

1. **Does it run reliably on hackathon hardware?**  
   If a model requires an active CUDA GPU and cloud instances that may encounter quota or connectivity limits, reject it in favor of CPU-friendly scikit-learn models.
2. **Can it be trained and tested in under 60 seconds?**  
   Long training loops cripple iteration speed. Rapid feedback cycles win hackathons.
3. **Is the output explainable to an evaluator?**  
   Evaluators consistently ask: *"Why did the model output this specific score?"* If your model can display feature contributions (e.g., top contributing factors), it scores higher than an opaque black box.
4. **Does it handle missing data gracefully?**  
   Real hackathon inputs often lack optional fields. The inference pipeline must have deterministic imputations.
5. **What is the worst-case failure mode?**  
   If the model encounters an out-of-distribution input, does it output a wildly inaccurate prediction or fallback safely to a baseline default?

---

## 4. Current Status

- **Selected Model:** `TODO: FINALIZE AFTER OFFICIAL PROBLEM STATEMENT`
- **Fallback Heuristic:** `TODO: FINALIZE AFTER OFFICIAL PROBLEM STATEMENT`
- **Hardware Profile:** CPU-compatible (Python 3.13 standard libraries + scikit-learn/pandas).

