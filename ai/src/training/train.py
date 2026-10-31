"""
Model Training Runner.

Orchestrates training datasets, preprocessors, estimators, and saves validated artifacts.
Category B: Scaffolding with explicit problem-statement hooks.
"""

from pathlib import Path
from typing import Any, Dict, Optional

import pandas as pd
from sklearn.ensemble import RandomForestClassifier

from ai.src.core.exceptions import AIError
from ai.src.data.dataset import TabularDataset
from ai.src.preprocessing.transformation import TabularPreprocessor
from ai.src.training.evaluation import evaluate_classification
from ai.src.utils.logging import get_logger

logger = get_logger("ai.training.train")


def run_training(
    df: pd.DataFrame,
    target_column: str,
    numeric_features: Optional[list] = None,
    categorical_features: Optional[list] = None,
    output_dir: str = "./models",
) -> Dict[str, Any]:
    """
    Train an estimator and evaluate against baseline.

    TODO: FINALIZE AFTER OFFICIAL PROBLEM STATEMENT
    Adapt algorithm, hyperparameters, and feature sets to actual requirements.
    """
    logger.info("Initiating model training pipeline on %d rows...", len(df))

    if target_column not in df.columns:
        raise AIError(
            message=f"Target column '{target_column}' missing from training dataframe."
        )

    # 1. Dataset split (70% train, 15% val, 15% test)
    dataset = TabularDataset(data=df, target_column=target_column)
    splits = dataset.split(test_size=0.15, val_size=0.15, random_state=42)

    # 2. Preprocessor fitting on train set only (NO LEAKAGE)
    preprocessor = TabularPreprocessor(
        numeric_features=numeric_features,
        categorical_features=categorical_features,
    )
    X_train_trans = preprocessor.fit_transform(splits.X_train)
    X_test_trans = preprocessor.transform(splits.X_test)

    # 3. Model Fitting
    # TODO: Replace with model selected in docs/model-selection-guide.md
    estimator = RandomForestClassifier(n_estimators=50, max_depth=5, random_state=42)
    estimator.fit(X_train_trans, splits.y_train)

    # 4. Evaluation on held-out test split
    y_pred = estimator.predict(X_test_trans)
    metrics = evaluate_classification(splits.y_test, y_pred)

    logger.info("Training complete. Test metrics: %s", metrics)

    return {
        "status": "success",
        "metrics": metrics,
        "train_samples": len(splits.X_train),
        "test_samples": len(splits.X_test),
    }

