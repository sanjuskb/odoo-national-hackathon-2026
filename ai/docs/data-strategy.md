# Data Strategy & Governance

## 1. Directory Structure & Partitioning

The `ai/data/` directory follows a tiered data hygiene pipeline:

```text
ai/data/
├── raw/        # Immutable, original raw data files (CSV, JSON, SQL dumps). Never edited directly.
├── interim/    # Intermediate stages of cleaning, joining, or normalization.
├── processed/  # Canonical, feature-engineered datasets ready for modeling and evaluation.
├── external/   # Third-party benchmark datasets, lookup tables, or public taxonomies.
└── sample/     # Small, verified synthetic payloads for unit tests and local mock verification.
```

---

## 2. The 10 Iron Rules of Data Management

1. **Never commit sensitive personal data:** Any Personally Identifiable Information (PII), email addresses, phone numbers, or passwords must never enter git.
2. **Never commit API keys or credentials:** All external access keys must stay in `.env` (which is git-ignored).
3. **Never invent real datasets:** Do not generate fake user records and present them to judges as real-world data.
4. **Never label synthetic data as real:** All mock or generated files must prominently declare:  
   `SYNTHETIC TEST DATA — NOT REAL-WORLD DATA`.
5. **Never claim a model has been trained if it has not:** Distinguish transparently between heuristic prototypes, pre-trained weights, and custom trained models.
6. **Never claim a model is accurate without evaluation:** Any reported metric (e.g., F1, RMSE, Accuracy) must be tied to an explicit test script and recorded dataset split.
7. **Document data provenance:** Always record the source URL, license, and timestamp of collection for any external data ingested.
8. **Keep large files outside Git:** Any dataset or binary model file over 10 MB must be git-ignored or pulled dynamically via script.
9. **Use `.gitignore` for generated artifacts:** Interim files, caches, and pickle binaries are strictly excluded.
10. **Preserve data splits:** Never mix training and test sets. Ensure test splits remain untouched during preprocessing to prevent data leakage.

---

## 3. Dataset Split Protocol (When Applicable)

When supervised training is conducted tomorrow:
- **Training Set (70%):** Used exclusively for fitting model parameters and feature scalers.
- **Validation Set (15%):** Used for hyperparameter tuning and model selection.
- **Test Set (15%):** Held-out partition used once for final honest metric evaluation.

```text
Full Dataset (100%)
├── Training (70%)  ──> Fit Scalers & Estimators
├── Validation (15%)──> Tune Thresholds & Parameters
└── Test (15%)      ──> Final Honest Verification
```

---

## 4. Preventing Data Leakage

- **Scaler Fitting:** All scalers (StandardScaler, MinMaxScaler) must be `.fit()` only on the training set, then `.transform()` applied to test/validation sets.
- **Target Encoding:** Never calculate target statistics using rows from the validation or test sets.
- **Temporal Ordering:** For time-series problems, always split chronologically (train on past, test on future). Do not shuffle randomly across time.

---

## 5. Current Data Status

- **Raw Data Source:** `PENDING OFFICIAL PROBLEM STATEMENT RELEASE`
- **Current Artifacts:** Synthetic test data schemas only in `data/sample/`.

