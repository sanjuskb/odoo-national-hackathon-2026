"""
Inference Post-Processing, Calibration, and Explainability.

Applies safety guardrails, confidence clipping, and formats explanations.
"""

from typing import Any, Dict, Optional


def calibrate_confidence(
    raw_confidence: float,
    min_confidence: float = 0.05,
    max_confidence: float = 0.99,
) -> float:
    """
    Ensure confidence scores remain strictly within valid probabilistic bounds
    and avoid overconfident 1.0 or 0.0 claims unless mathematically certain.
    """
    bounded = max(0.0, min(1.0, float(raw_confidence)))
    return round(max(min_confidence, min(max_confidence, bounded)), 4)


def format_explanation(
    prediction: Any,
    features: Dict[str, Any],
    top_n: int = 3,
) -> Dict[str, Any]:
    """
    Generate an interpretable explanation summary for evaluator inspection.
    """
    numeric_features = {
        k: float(v)
        for k, v in features.items()
        if isinstance(v, (int, float)) and not isinstance(v, bool)
    }

    # Sort features by magnitude as provisional importance proxy
    sorted_features = sorted(
        numeric_features.items(),
        key=lambda item: abs(item[1]),
        reverse=True,
    )[:top_n]

    return {
        "summary": f"Prediction '{prediction}' evaluated from {len(features)} input features.",
        "top_contributing_signals": [
            {"feature": k, "value": v} for k, v in sorted_features
        ],
    }

