# AI/ML Automated Test Suite

This directory contains automated unit and integration tests for the AI/ML module.

## Test Organization
- `test_config.py`: Verifies environment variable resolution and YAML configuration loading.
- `test_validation.py`: Tests input payload schema conformance, missing field detection, and outlier clipping.
- `test_inference.py`: Tests end-to-end inference execution, model registry resolution, fallback failover, and output envelope structure.

## Running Tests
From the repository root:
```bash
pytest ai/tests/
```
Or from within the `ai/` directory:
```bash
pytest
```

