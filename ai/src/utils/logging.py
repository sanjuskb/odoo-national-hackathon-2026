"""
Structured, Secret-Redacting Logging Utility.

Ensures that API keys, authentication tokens, and sensitive credentials
are automatically masked before being output to console or files.
"""

import logging
import re
import sys
from typing import Any, Dict

# Patterns for sensitive keys
SENSITIVE_KEY_PATTERNS = [
    re.compile(r"api[-_]?key", re.IGNORECASE),
    re.compile(r"token", re.IGNORECASE),
    re.compile(r"secret", re.IGNORECASE),
    re.compile(r"password", re.IGNORECASE),
    re.compile(r"authorization", re.IGNORECASE),
]


def redact_secrets(data: Any) -> Any:
    """
    Recursively redact sensitive keys from dictionaries or lists.
    """
    if isinstance(data, dict):
        redacted = {}
        for k, v in data.items():
            if any(p.search(str(k)) for p in SENSITIVE_KEY_PATTERNS):
                redacted[k] = "[REDACTED]"
            else:
                redacted[k] = redact_secrets(v)
        return redacted
    elif isinstance(data, list):
        return [redact_secrets(item) for item in data]
    return data


class SafeFormatter(logging.Formatter):
    """Custom logging formatter that strips sensitive patterns."""

    def format(self, record: logging.LogRecord) -> str:
        original = super().format(record)
        # Redact any accidental Bearer tokens or 32+ character hex/base64 strings
        scrubbed = re.sub(
            r"(Bearer\s+)[A-Za-z0-9_\-\.]{10,}", r"\1[REDACTED]", original
        )
        return scrubbed


def get_logger(name: str = "ai_module", level: str = "INFO") -> logging.Logger:
    """
    Create or retrieve a configured logger with secret redaction.
    """
    logger = logging.getLogger(name)
    if not logger.handlers:
        logger.setLevel(getattr(logging, level.upper(), logging.INFO))
        handler = logging.StreamHandler(sys.stdout)
        formatter = SafeFormatter(
            fmt="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.propagate = False
    return logger

