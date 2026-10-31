"""
Unit and Integration Tests for Inference Engine and Model Registry.
"""

from typing import Any, Dict

from ai.src.inference.predictor import Predictor
from ai.src.models.base import BaselineHeuristicModel, BaseModel
from ai.src.models.registry import ModelRegistry, get_model_registry


class FailingTestModel(BaseModel):
    """Mock model that deliberately raises an exception to test fallback behavior."""

    def __init__(self):
        super().__init__(name="failing_model", version="0.0.1-buggy")

    def predict(self, features: Dict[str, Any]) -> Dict[str, Any]:
        raise RuntimeError("Simulated internal model failure!")

    def health_check(self) -> bool:
        return False

    def get_metadata(self) -> Dict[str, Any]:
        return {"name": self.name}


def test_standard_inference_execution():
    """Verify end-to-end inference produces expected envelope format."""
    predictor = Predictor()
    payload = {
        "request_id": "test-req-inference-001",
        "entity_id": "entity-123",
        "features": {
            "feature_a": 25.0,
            "feature_b": 75.0,
        },
        "options": {
            "explain": True,
            "timeout_ms": 3000,
        },
    }

    response = predictor.predict(payload)

    # Check top-level contract keys
    assert response["success"] is True
    assert "model_version" in response
    assert response["error"] is None

    # Check result
    result = response["result"]
    assert result is not None
    assert "prediction" in result
    assert 0.0 <= result["confidence"] <= 1.0
    assert result["explanation"] is not None

    # Check metadata
    metadata = response["metadata"]
    assert metadata["latency_ms"] >= 0.0
    assert metadata["fallback_used"] is False
    assert "timestamp" in metadata


def test_inference_input_validation_failure():
    """Verify invalid payload returns structured error envelope rather than crashing."""
    predictor = Predictor()
    invalid_payload = {
        # Missing required request_id and features
        "bad_field": 123
    }

    response = predictor.predict(invalid_payload)

    assert response["success"] is False
    assert response["result"] is None
    assert response["error"] is not None
    assert response["error"]["code"] == "VALIDATION_ERROR"
    assert response["metadata"]["fallback_used"] is False


def test_fallback_activation_on_model_crash():
    """Verify that when primary model throws an exception, fallback engine takes over."""
    registry = get_model_registry()
    failing_model = FailingTestModel()
    registry.register_instance(failing_model)

    # Instantiate predictor with the failing model as primary
    predictor = Predictor(model_name="failing_model")
    payload = {
        "request_id": "test-req-fallback-001",
        "features": {"score": 50.0},
    }

    response = predictor.predict(payload)

    # Should succeed because fallback handled it gracefully
    assert response["success"] is True
    assert response["metadata"]["fallback_used"] is True
    assert response["result"]["prediction"] in ["NORMAL", "ELEVATED"]


def test_model_registry_resolution():
    """Verify ModelRegistry register and get methods."""
    registry = ModelRegistry()
    baseline = BaselineHeuristicModel(name="test_baseline_model", version="1.0.0")
    registry.register_instance(baseline)

    retrieved = registry.get_model("test_baseline_model")
    assert retrieved.name == "test_baseline_model"
    assert retrieved.version == "1.0.0"
    assert retrieved.health_check() is True

