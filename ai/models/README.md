# Serialized Model Artifacts

This directory stores trained model binaries, scalers, and metadata files.

## Artifact Policies
- Binary model artifacts (`.pkl`, `.joblib`, `.bin`, `.onnx`, `.pt`) are **excluded from Git** via `.gitignore`.
- Small heuristic parameter dictionaries or metadata manifests may be tracked if necessary.
- Every saved model bundle should include a companion `metadata.json` documenting:
  - Model name & version
  - Training timestamp (UTC)
  - Features consumed
  - Metric scores on held-out test split

