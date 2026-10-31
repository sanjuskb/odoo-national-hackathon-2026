"""
Dataset Containers and Splitting Utilities.

Provides structured containers for managing Train/Validation/Test splits
without data leakage.
"""

from dataclasses import dataclass
from typing import Any, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split

from ai.src.core.exceptions import PreprocessingError
from ai.src.utils.logging import get_logger

logger = get_logger("ai.data.dataset")


@dataclass
class DatasetSplit:
    """Container for train, validation, and test partitions."""

    X_train: Any
    y_train: Any
    X_val: Optional[Any] = None
    y_val: Optional[Any] = None
    X_test: Optional[Any] = None
    y_test: Optional[Any] = None


class TabularDataset:
    """Wrapper around tabular data for safe train/val/test splitting."""

    def __init__(self, data: pd.DataFrame, target_column: Optional[str] = None):
        self.data = data.copy()
        self.target_column = target_column

    def split(
        self,
        test_size: float = 0.15,
        val_size: float = 0.15,
        random_state: int = 42,
        stratify: bool = False,
    ) -> DatasetSplit:
        """
        Split dataset into train, validation, and test partitions.
        Guarantees validation and test sets remain untouched during training.
        """
        if self.target_column and self.target_column not in self.data.columns:
            raise PreprocessingError(
                message=f"Target column '{self.target_column}' not found in dataset.",
                details={"available_columns": list(self.data.columns)},
            )

        if self.target_column:
            X = self.data.drop(columns=[self.target_column])
            y = self.data[self.target_column]
        else:
            X = self.data
            y = None

        stratify_col = y if (stratify and y is not None) else None

        # First split off the test set
        X_temp, X_test, y_temp, y_test = train_test_split(
            X,
            y,
            test_size=test_size,
            random_state=random_state,
            stratify=stratify_col,
        )

        # Then split remaining into train and validation
        if val_size > 0.0:
            val_relative_size = val_size / (1.0 - test_size)
            stratify_val = y_temp if (stratify and y_temp is not None) else None
            X_train, X_val, y_train, y_val = train_test_split(
                X_temp,
                y_temp,
                test_size=val_relative_size,
                random_state=random_state,
                stratify=stratify_val,
            )
        else:
            X_train, y_train = X_temp, y_temp
            X_val, y_val = None, None

        logger.info(
            "Dataset split complete: Train=%d, Val=%d, Test=%d",
            len(X_train),
            len(X_val) if X_val is not None else 0,
            len(X_test) if X_test is not None else 0,
        )

        return DatasetSplit(
            X_train=X_train,
            y_train=y_train,
            X_val=X_val,
            y_val=y_val,
            X_test=X_test,
            y_test=y_test,
        )

