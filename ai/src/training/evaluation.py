"""
Model Evaluation and Honest Metric Calculation.

Computes standard verification metrics without fabricated performance claims.
"""

from typing import Any, Dict

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    precision_score,
    r2_score,
    recall_score,
)


def evaluate_classification(
    y_true: Any,
    y_pred: Any,
    average: str = "weighted",
) -> Dict[str, float]:
    """
    Calculate classification metrics: Accuracy, Precision, Recall, F1.
    """
    return {
        "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
        "precision": round(
            float(precision_score(y_true, y_pred, average=average, zero_division=0)),
            4,
        ),
        "recall": round(
            float(recall_score(y_true, y_pred, average=average, zero_division=0)), 4
        ),
        "f1_score": round(
            float(f1_score(y_true, y_pred, average=average, zero_division=0)), 4
        ),
    }


def evaluate_regression(y_true: Any, y_pred: Any) -> Dict[str, float]:
    """
    Calculate regression metrics: MAE, RMSE, R2.
    """
    mse = float(mean_squared_error(y_true, y_pred))
    return {
        "mae": round(float(mean_absolute_error(y_true, y_pred)), 4),
        "rmse": round(float(np.sqrt(mse)), 4),
        "r2_score": round(float(r2_score(y_true, y_pred)), 4),
    }


def compute_baseline_uplift(
    baseline_score: float,
    model_score: float,
) -> float:
    """
    Calculate percentage improvement over baseline.
    Returns 0.0 if baseline is non-positive to prevent division by zero.
    """
    if baseline_score <= 0.0:
        return 0.0
    return round(((model_score - baseline_score) / baseline_score) * 100.0, 2)

