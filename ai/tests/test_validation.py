"""
Unit Tests for Data Validation and Preprocessing Utilities.
"""

import pytest

from ai.src.core.exceptions import ValidationError
from ai.src.data.validation import (
    InferenceInputPayload,
    validate_inference_input,
)
from ai.src.preprocessing.cleaning import clean_record, clip_outliers, handle_missing_values


def test_valid_inference_input():
    """Verify standard compliant payload parses cleanly."""
    valid_payload = {
        "request_id": "test-req-123",
        "entity_id": "test-entity-456",
        "features": {"feature_a": 15.5, "feature_b": "category_1"},
        "options": {"explain": True, "timeout_ms": 2500},
    }
    validated = validate_inference_input(valid_payload)
    assert isinstance(validated, InferenceInputPayload)
    assert validated.request_id == "test-req-123"
    assert validated.entity_id == "test-entity-456"
    assert validated.features["feature_a"] == 15.5
    assert validated.options.explain is True
    assert validated.options.timeout_ms == 2500


def test_missing_required_request_id():
    """Verify ValidationError is raised when request_id is missing."""
    invalid_payload = {
        "features": {"feature_a": 10.0}
    }
    with pytest.raises(ValidationError):
        validate_inference_input(invalid_payload)


def test_missing_required_features():
    """Verify ValidationError is raised when features dict is missing."""
    invalid_payload = {
        "request_id": "req-999"
    }
    with pytest.raises(ValidationError):
        validate_inference_input(invalid_payload)


def test_non_dict_payload():
    """Verify non-dict payload raises ValidationError."""
    with pytest.raises(ValidationError):
        validate_inference_input(["not", "a", "dict"])


def test_clean_record():
    """Verify whitespace stripping and null defaults."""
    record = {
        "text_field": "   trimmed string   ",
        "numeric_null": None,
        "valid_num": 42.0,
    }
    cleaned = clean_record(
        record,
        numeric_defaults={"numeric_null": 0.0},
    )
    assert cleaned["text_field"] == "trimmed string"
    assert cleaned["numeric_null"] == 0.0
    assert cleaned["valid_num"] == 42.0


def test_handle_missing_values():
    """Verify filling missing required keys."""
    data = {"existing_key": 100}
    filled = handle_missing_values(data, required_keys=["existing_key", "missing_key"], default_fill=-1)
    assert filled["existing_key"] == 100
    assert filled["missing_key"] == -1


def test_clip_outliers():
    """Verify winsorization / outlier clipping."""
    assert clip_outliers(-10.0, 0.0, 100.0) == 0.0
    assert clip_outliers(150.0, 0.0, 100.0) == 100.0
    assert clip_outliers(50.0, 0.0, 100.0) == 50.0

