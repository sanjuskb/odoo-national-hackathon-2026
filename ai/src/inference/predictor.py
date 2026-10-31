"""
Inference Predictor Engine.

The central execution pipeline coordinating:
1. Input validation against contracts/input.schema.json
2. Model resolution from registry
3. Model prediction with deterministic fallback failover
4. Post-processing and confidence calibration
5. Formatting into contracts/output.schema.json
"""

import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from ai.src.core.config import get_settings
from ai.src.core.exceptions import AIError, ValidationError
from ai.src.data.validation import (
    InferenceInputPayload,
    InferenceMetadata,
    InferenceOutputEnvelope,
    InferenceOutputResult,
    validate_inference_input,
)
from ai.src.inference.postprocessing import calibrate_confidence, format_explanation
from ai.src.models.base import BaselineHeuristicModel, BaseModel
from ai.src.models.registry import get_model_registry
from ai.src.utils.logging import get_logger

logger = get_logger("ai.inference.predictor")


class Predictor:
    """
    Robust inference runner with timeout and fallback protection.
    """

    def __init__(
        self,
        model_name: Optional[str] = None,
        fallback_model: Optional[BaseModel] = None,
    ):
        self.settings = get_settings()
        self.registry = get_model_registry()
        self.model_name = model_name or self.settings.model_name
        self.fallback = fallback_model or BaselineHeuristicModel(
            name="default_fallback_heuristic"
        )

    def _resolve_model(self) -> BaseModel:
        """Resolve active model from registry or fallback."""
        try:
            return self.registry.get_model(self.model_name)
        except Exception:
            logger.warning(
                "Primary model '%s' not found. Falling back to default baseline.",
                self.model_name,
            )
            return self.fallback

    def predict(self, raw_payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute full inference pipeline on raw dictionary payload.
        Returns envelope conforming to contracts/output.schema.json.
        """
        start_time = time.perf_counter()
        timestamp_str = datetime.now(timezone.utc).isoformat()
        fallback_used = False

        # 1. Input Validation
        try:
            validated: InferenceInputPayload = validate_inference_input(raw_payload)
        except ValidationError as val_err:
            latency_ms = round((time.perf_counter() - start_time) * 1000.0, 2)
            return {
                "success": False,
                "model_version": self.settings.model_version,
                "result": None,
                "metadata": {
                    "latency_ms": latency_ms,
                    "fallback_used": False,
                    "timestamp": timestamp_str,
                },
                "error": val_err.to_dict(),
            }

        # 2. Model Execution with Fallback Protection
        model = self._resolve_model()
        raw_prediction: Dict[str, Any] = {}

        try:
            raw_prediction = model.predict(validated.features)
        except Exception as exc:
            logger.error("Primary model execution failed: %s. Activating fallback.", str(exc))
            fallback_used = True
            raw_prediction = self.fallback.predict(validated.features)

        # 3. Post-Processing & Calibration
        confidence = calibrate_confidence(raw_prediction.get("confidence", 0.50))
        prediction_val = raw_prediction.get("prediction", "UNKNOWN")

        explanation = None
        if validated.options.explain:
            explanation = format_explanation(prediction_val, validated.features)

        latency_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

        # 4. Construct Output Envelope
        response = {
            "success": True,
            "model_version": getattr(model, "version", self.settings.model_version),
            "result": {
                "prediction": prediction_val,
                "confidence": confidence,
                "explanation": explanation or raw_prediction.get("explanation"),
            },
            "metadata": {
                "latency_ms": latency_ms,
                "fallback_used": fallback_used,
                "timestamp": timestamp_str,
            },
            "error": None,
        }

        return response

