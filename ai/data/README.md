# Data Management Directory

This directory organizes datasets across stages of the data engineering lifecycle.

```text
ai/data/
├── raw/         <- Immutable original data dumps (never edited directly).
├── interim/     <- Intermediate data transformed during pipeline steps.
├── processed/   <- Final canonical datasets ready for training and evaluation.
├── external/    <- Third-party reference data, lookup tables, and ontologies.
└── sample/      <- Small, verified synthetic payloads for testing.
```

## Governance & Rules
1. All raw and processed data directories are **git-ignored** (except `.gitkeep`).
2. **Never commit PII, sensitive user records, or customer identifiers.**
3. Synthetic test data is permitted ONLY in `sample/` and must be clearly labelled.
4. Large data files (> 10MB) must be stored in external cloud storage or downloaded via script.

