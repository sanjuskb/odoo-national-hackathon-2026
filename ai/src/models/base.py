"""
Abstract Base Model and Baseline Heuristic Implementation.

Defines the contract all algorithms (heuristics, ML models, neural networks)
must implement to be usable by the inference pipeline.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional

from ai.src.core.exceptions import InferenceError


class BaseModel(ABC):
    """
    Abstract Base Class for all AI models, heuristics, and algorithmic estimators.
    """

    def __init__(self, name: str, version: str):
        self.name = name
        self.version = version

    @abstractmethod
    def predict(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute prediction or heuristic evaluation on input features.
        Returns dictionary containing:
          - "prediction": primary output
          - "confidence": float in [0.0, 1.0]
          - "explanation": optional explanation string or dict
        """
        pass

    @abstractmethod
    def health_check(self) -> bool:
        """Verify that the model is loaded and ready to serve inference."""
        pass

    @abstractmethod
    def get_metadata(self) -> Dict[str, Any]:
        """Return metadata describing model type, inputs, and version."""
        pass

    def save(self, path: str) -> None:
        """Save model artifacts to disk (optional for rule heuristics)."""
        pass

    def load(self, path: str) -> None:
        """Load model artifacts from disk."""
        pass


class BaselineHeuristicModel(BaseModel):
    """
    Domain-neutral baseline heuristic implementation.
    Acts as the working reference implementation and failover engine.
    Category A: Fully functional now.
    """

    def __init__(
        self,
        name: str = "provisional_heuristic_model",
        version: str = "0.1.0-alpha",
        default_score: float = 0.50,
    ):
        super().__init__(name=name, version=version)
        self.default_score = default_score

    def predict(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """
        Deterministic, transparent heuristic calculation.
        Computes a safe normalized score and provisional category.
        """
        try:
            # Deterministic weighted calculation over available numerical values
            numeric_vals = [
                float(v)
                for v in features.values()
                if isinstance(v, (int, float)) and not isinstance(v, bool)
            ]

            if numeric_vals:
                avg_val = sum(numeric_vals) / len(numeric_vals)
                normalized_score = max(0.0, min(1.0, avg_val / 100.0 if avg_val > 0 else 0.5))
            else:
                normalized_score = self.default_score

            category = "NORMAL" if normalized_score < 0.70 else "ELEVATED"

            return {
                "prediction": category,
                "confidence": round(float(normalized_score), 4),
                "explanation": (
                    f"Heuristic rule: evaluated {len(numeric_vals)} numeric signals "
                    f"yielding score {normalized_score:.2f}."
                ),
            }
        except Exception as exc:
            raise InferenceError(
                message=f"Baseline heuristic prediction failed: {str(exc)}",
                details={"features_keys": list(features.keys())},
            ) from exc

    def health_check(self) -> bool:
        """Heuristic model is always available in-memory."""
        return True

    def get_metadata(self) -> Dict[str, Any]:
        """Return model metadata."""
        return {
            "name": self.name,
            "version": self.version,
            "type": "deterministic_heuristic",
            "status": "ready",
            "note": "Provisional baseline. Replace or extend upon Problem Statement release.",
        }

