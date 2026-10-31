"""
Data Cleaning and Defensive Normalization.

Ensures that missing values, malformed data, and extreme outliers are handled
gracefully before model execution.
"""

from typing import Any, Dict, List, Optional

import numpy as np


def clean_record(
    record: Dict[str, Any],
    numeric_defaults: Optional[Dict[str, float]] = None,
    categorical_defaults: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    """
    Clean a single input record:
    - Trims leading/trailing whitespace from string fields.
    - Replaces null/None values with sensible deterministic defaults.
    - Handles unexpected types defensively.
    """
    cleaned: Dict[str, Any] = {}
    num_defaults = numeric_defaults or {}
    cat_defaults = categorical_defaults or {}

    for key, val in record.items():
        if val is None:
            if key in num_defaults:
                cleaned[key] = num_defaults[key]
            elif key in cat_defaults:
                cleaned[key] = cat_defaults[key]
            else:
                cleaned[key] = None
        elif isinstance(val, str):
            cleaned[key] = val.strip()
        elif isinstance(val, (int, float)):
            # Defensive check for NaN or Infinity
            if np.isnan(val) or np.isinf(val):
                cleaned[key] = num_defaults.get(key, 0.0)
            else:
                cleaned[key] = val
        else:
            cleaned[key] = val

    return cleaned


def handle_missing_values(
    data: Dict[str, Any],
    required_keys: List[str],
    default_fill: Any = 0.0,
) -> Dict[str, Any]:
    """
    Ensure all required keys exist in dictionary. If missing, populate with default_fill.
    """
    filled = dict(data)
    for key in required_keys:
        if key not in filled or filled[key] is None:
            filled[key] = default_fill
    return filled


def clip_outliers(
    value: float,
    min_bound: float,
    max_bound: float,
) -> float:
    """
    Clip numerical values to physically valid business bounds (winsorization).
    """
    return float(np.clip(value, min_bound, max_bound))

