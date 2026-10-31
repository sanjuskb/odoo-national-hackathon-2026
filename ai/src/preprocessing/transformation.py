"""
Feature Transformation and Scaling.

Provides scikit-learn compatible transformers for scaling numerical features
and encoding categorical variables, ensuring zero data leakage.
"""

from typing import List, Optional

import numpy as np
import pandas as pd
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from ai.src.core.exceptions import PreprocessingError
from ai.src.utils.logging import get_logger

logger = get_logger("ai.preprocessing.transformation")


class TabularPreprocessor:
    """
    Standard tabular preprocessor managing numerical scaling and categorical encoding.
    Ensures that transformations fit strictly on training splits.
    """

    def __init__(
        self,
        numeric_features: Optional[List[str]] = None,
        categorical_features: Optional[List[str]] = None,
    ):
        self.numeric_features = numeric_features or []
        self.categorical_features = categorical_features or []
        self.scaler = StandardScaler()
        self.encoder = OneHotEncoder(handle_unknown="ignore", sparse_output=False)
        self.is_fitted = False
        self.feature_names_out_: List[str] = []

    def fit(self, X: pd.DataFrame) -> "TabularPreprocessor":
        """Fit scalers and encoders on training data only."""
        if not isinstance(X, pd.DataFrame):
            raise PreprocessingError(
                message="Expected pandas DataFrame for preprocessor fitting.",
                details={"received_type": type(X).__name__},
            )

        if self.numeric_features:
            self.scaler.fit(X[self.numeric_features].fillna(0.0))

        if self.categorical_features:
            self.encoder.fit(X[self.categorical_features].fillna("UNKNOWN"))

        self.is_fitted = True
        logger.info("TabularPreprocessor fitted successfully.")
        return self

    def transform(self, X: pd.DataFrame) -> np.ndarray:
        """Transform unseen data using strictly fitted parameters."""
        if not self.is_fitted:
            raise PreprocessingError(
                message="TabularPreprocessor must be fitted before calling transform."
            )

        arrays: List[np.ndarray] = []

        if self.numeric_features:
            num_arr = self.scaler.transform(X[self.numeric_features].fillna(0.0))
            arrays.append(num_arr)

        if self.categorical_features:
            cat_arr = self.encoder.transform(
                X[self.categorical_features].fillna("UNKNOWN")
            )
            arrays.append(cat_arr)

        if not arrays:
            return np.empty((len(X), 0))

        return np.hstack(arrays)

    def fit_transform(self, X: pd.DataFrame) -> np.ndarray:
        """Fit on training data and return transformed array."""
        return self.fit(X).transform(X)

