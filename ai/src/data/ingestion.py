"""
Data Ingestion Pipeline.

Responsible for safely loading datasets from files, databases, or memory.
Category B: Domain-neutral scaffolding with explicit problem-statement hooks.
"""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import pandas as pd

from ai.src.core.exceptions import PreprocessingError
from ai.src.utils.logging import get_logger

logger = get_logger("ai.data.ingestion")


def ingest_json(file_path: Union[str, Path]) -> Union[Dict[str, Any], List[Any]]:
    """
    Ingest a local JSON file safely.
    """
    target = Path(file_path)
    if not target.is_file():
        raise PreprocessingError(
            message=f"JSON data file not found: {target}",
            details={"file_path": str(target)},
        )

    try:
        with open(target, "r", encoding="utf-8") as f:
            data = json.load(f)
            logger.info("Successfully ingested JSON file: %s", target.name)
            return data
    except Exception as exc:
        raise PreprocessingError(
            message=f"Failed to parse JSON file {target}: {str(exc)}",
            details={"file_path": str(target)},
        ) from exc


def ingest_tabular_data(
    file_path: Union[str, Path],
    file_format: Optional[str] = None,
) -> pd.DataFrame:
    """
    Ingest tabular data (CSV, Parquet, JSON lines) into a pandas DataFrame.

    TODO: FINALIZE AFTER OFFICIAL PROBLEM STATEMENT
    Adapt to competition dataset format once released.
    """
    target = Path(file_path)
    if not target.is_file():
        raise PreprocessingError(
            message=f"Tabular data file not found: {target}",
            details={"file_path": str(target)},
        )

    fmt = file_format or target.suffix.lstrip(".").lower()

    try:
        if fmt == "csv":
            df = pd.read_csv(target)
        elif fmt in ("parquet", "pq"):
            df = pd.read_parquet(target)
        elif fmt in ("json", "jsonl"):
            df = pd.read_json(target, lines=(fmt == "jsonl"))
        else:
            raise PreprocessingError(
                message=f"Unsupported file format: {fmt}",
                details={"supported": ["csv", "parquet", "json", "jsonl"]},
            )

        logger.info(
            "Ingested tabular dataset from %s: %d rows, %d columns",
            target.name,
            len(df),
            len(df.columns),
        )
        return df
    except Exception as exc:
        if isinstance(exc, PreprocessingError):
            raise
        raise PreprocessingError(
            message=f"Failed to read tabular file {target}: {str(exc)}",
            details={"file_path": str(target)},
        ) from exc

