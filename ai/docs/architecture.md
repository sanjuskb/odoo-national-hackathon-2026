# AI/ML Architecture & Execution Lifecycle

## 1. Architectural Philosophy

The AI/ML module operates under three core engineering axioms:
1. **Decoupled Lifecycle:** Data ingestion, preprocessing, inference, and consumption are strictly separated.
2. **Defensive Boundaries:** Input data and output predictions are validated against strict JSON schemas before and after model execution.
3. **Algorithm Neutrality:** The system does not presume machine learning is required. The optimal solution could range from a deterministic decision table to an ensemble model or an external LLM call.

---

## 2. Generic AI/ML Execution Lifecycle

```text
       +------------------------------------+
       |         Raw Client Request         |
       +-----------------+------------------+
                         |
                         v
       +-----------------+------------------+
       |          Input Validation          |  <-- Schema & sanity checks
       +-----------------+------------------+
                         |
                         v
       +-----------------+------------------+
       |           Data Ingestion           |  <-- Payload parsing, normalization
       +-----------------+------------------+
                         |
                         v
       +-----------------+------------------+
       |           Preprocessing            |  <-- Cleaning, missing-value imputation
       +-----------------+------------------+
                         |
                         v
       +-----------------+------------------+
       |        Feature Preparation         |  <-- Vectorization, scaling, encoding
       +-----------------+------------------+
                         |
                         v
       +-----------------+------------------+
       |         Model / Algorithm          |  <-- Heuristic / ML / LLM / Tree
       +-----------------+------------------+
                         |
                         v
       +-----------------+------------------+
       |             Inference              |  <-- Prediction & score calculation
       +-----------------+------------------+
                         |
                         v
       +-----------------+------------------+
       |         Output Validation          |  <-- Schema, range & bounds check
       +-----------------+------------------+
                         |
                         v
       +-----------------+------------------+
       |        Backend Integration         |  <-- Response returned to Amarnath
       +------------------------------------+
```

### Stage Descriptions

1. **Input Validation:** Confirms that required fields exist, data types match, and values fall within sensible bounds. Prevents garbage data from reaching internal routines.
2. **Data Ingestion:** Extracts raw input variables from API payloads, database rows, or event streams into typed data structures.
3. **Preprocessing:** Applies deterministic cleaning steps: null handling, text trimming, timestamp parsing, categorical normalizations.
4. **Feature Preparation:** Transforms clean data into mathematical representations: numerical scaling, one-hot/label encoding, TF-IDF vectorization, or embeddings.
5. **Model / Algorithm:** The computational core. Evaluates the transformed features against a trained statistical estimator, decision tree, heuristic ruleset, or neural network.
6. **Inference Execution:** Computes raw outputs (probabilities, predicted values, clustered labels, ranked scores).
7. **Output Validation:** Post-inference defense: validates that probabilities sum to 1.0, predictions lie within acceptable business ranges, and no NaN or Infinite values exist.
8. **Backend Integration:** Packages validated results into the standardized response envelope defined in `contracts/output.schema.json` and transmits to the backend.

> [!NOTE]  
> **Not every problem requires every stage.**  
> For example, a rule-based expert system might jump directly from Preprocessing to Algorithm, omitting Feature Preparation. A zero-shot API might offload feature extraction entirely. The final pipeline will be tailored strictly to the official problem statement.

---

## 3. Potential Algorithmic Paradigms

Until the problem statement is released, all paradigms remain valid options:

| Paradigm | When It Is Appropriate | Example Baseline Approaches |
|---|---|---|
| **Deterministic Heuristics / Rule Engines** | Transparent business rules, small state spaces, regulatory compliance, instant execution required. | Weighted scoring matrices, decision trees, graph traversal, constraint satisfaction algorithms. |
| **Supervised Classification** | Predicting discrete categories (e.g., fraud/legit, category routing, sentiment). | Logistic Regression, Random Forest, LightGBM, Support Vector Machines. |
| **Supervised Regression** | Predicting continuous values (e.g., pricing, demand, duration, cost estimation). | Ridge/Lasso Regression, Gradient Boosted Regressors, Splines. |
| **Unsupervised Clustering** | Grouping unlabeled entities by similarity (e.g., customer segmentation, anomaly detection). | K-Means, DBSCAN, Hierarchical Clustering, Isolation Forests. |
| **Recommendation Systems** | Ranking items or actions for a specific entity or context. | Collaborative filtering, matrix factorization, content-based TF-IDF cosine similarity. |
| **Natural Language Processing (NLP)** | Text classification, information extraction, intent detection. | Regex/Tokenizers, TF-IDF + Classifier, fine-tuned transformer or embeddings. |
| **Time-Series Forecasting** | Predicting sequential future values based on temporal history. | Exponential Smoothing, ARIMA/SARIMAX, Prophet, sliding-window lag features. |
| **Computer Vision (CV)** | Image classification, object recognition, OCR. | Pre-trained CNNs (ResNet, MobileNet), OpenCV image filters, OCR engines (Tesseract). |
| **Retrieval-Augmented Generation (RAG) / LLM** | Natural language synthesis over custom documents or dynamic unstructured query handling. | Embeddings + vector similarity search + prompt orchestration. |

---

## 4. When NOT to Use Machine Learning

A senior engineering principle: **Never use machine learning when a deterministic algorithm solves the problem better.**

Machine learning is contraindicated when:
1. **The dataset has fewer than 100-200 reliable samples.** ML models overfit or output noise on micro-datasets.
2. **100% explainability and auditability are required.** Deterministic rule trees or mathematical formulas provide exact proofs of why a decision was reached.
3. **The relationship is strictly algebraic or logical.** E.g., computing tax brackets, date calculations, or inventory thresholds.
4. **Latency constraints are sub-millisecond.** Pure mathematical heuristics execute in microseconds; complex neural models incur millisecond-to-second overhead.
5. **No reliable training ground-truth exists.** Garbage in, garbage out.

---

## 5. Architectural Boundary with Backend

The AI/ML module operates either as:
- **Option A (In-Process Library):** Imported directly by Amarnath's Python backend as `from ai.src.inference.predictor import Predictor`. Lowest latency, zero network overhead.
- **Option B (Independent Microservice):** Run as a standalone FastAPI service communicating over HTTP JSON on `AI_PORT=8000`. Clean separation of dependencies.

Both options adhere to the identical contract schemas in `contracts/`.

