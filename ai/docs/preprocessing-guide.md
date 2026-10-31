# Preprocessing & Feature Engineering Guide

## 1. Principles of Robust Preprocessing

In an operational AI service, preprocessing functions must satisfy three requirements:
1. **Determinism:** Given the same raw input, the preprocessing pipeline must produce the exact same feature vector.
2. **Defensiveness:** Real user inputs contain missing keys, null values, unexpected data types, and extreme outliers. The pipeline must handle these without raising unhandled exceptions.
3. **Parity between Training & Inference:** Any transformation applied to historical training data must be applied identically to real-time inference inputs.

---

## 2. Standard Cleaning Pipeline

```text
Raw Dictionary / DataFrame
       |
       v
1. Type Coercion & Schema Conformance (pydantic / fast validation)
       |
       v
2. Missing Value Imputation (deterministic defaults, median/mode)
       |
       v
3. Outlier Clipping / Bound Enforcements
       |
       v
4. Categorical Normalization (lowercase, strip whitespace, map unknowns to "OTHER")
       |
       v
5. Numeric Scaling / Transformation (MinMax / Standardize / Log1p)
       |
       v
Validated Feature Vector
```

---

## 3. Handling Edge Cases & Anomalies

| Data Issue | Preprocessing Strategy | Fallback Action |
|---|---|---|
| **Missing Numeric Field** | Impute with training median or domain default. | Use feature baseline constant (e.g., `0.0` or mean). |
| **Missing Categorical Field** | Assign explicitly to category token `"UNKNOWN"`. | Ensure one-hot/label encoders have an `"UNKNOWN"` class. |
| **Extreme Outlier** | Clip to 1st / 99th percentile bounds (winsorization). | Cap at maximum valid physical bound. |
| **New / Unseen Category** | Map to `"OTHER"` bucket. | Never let an unknown category trigger a key error. |
| **Malformed Timestamp** | Parse using ISO-8601 parser. | Fallback to current UTC timestamp. |

---

## 4. Feature Engineering Strategies

Once the problem statement is released, feature engineering will explore:
- **Numerical Aggregations:** Ratios, differences, rolling averages, log transforms for skewed distributions.
- **Categorical Encodings:** Frequency encoding, target encoding (with out-of-fold regularization), one-hot encoding for low-cardinality features.
- **Temporal Features:** Day-of-week, hour-of-day, is_weekend, time-since-last-event.
- **Text Features:** Character counts, token counts, TF-IDF n-grams, keyword binary indicators.

---

## 5. Implementation Locations

- `src/preprocessing/cleaning.py`: Low-level data cleaning functions.
- `src/preprocessing/transformation.py`: Mathematical scalers and categorical encoders.
- `src/preprocessing/feature_engineering.py`: High-level domain feature extractors.

