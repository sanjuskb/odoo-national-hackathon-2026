"""
Data Validation and Schema Enforcement.

Validates incoming inference requests and outgoing predictions against
formal contracts, ensuring corrupt data is caught before reaching model code.
"""

from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict, Field

from ai.src.core.exceptions import ValidationError


class InferenceOptions(BaseModel):
    """Optional execution parameters for inference requests."""

    model_config = ConfigDict(extra="ignore")

    explain: bool = Field(
        default=False,
        description="Whether to generate feature attribution or explanation strings.",
    )
    timeout_ms: int = Field(
        default=5000,
        ge=100,
        le=30000,
        description="Client timeout ceiling in milliseconds.",
    )


class InferenceInputPayload(BaseModel):
    """
    Standard incoming request payload for AI inference.
    Fields align with contracts/input.schema.json.
    """

    model_config = ConfigDict(extra="ignore")

    request_id: str = Field(
        ...,
        min_length=1,
        description="Unique request tracing identifier.",
    )
    entity_id: Optional[str] = Field(
        default=None,
        description="Identifier of the entity (user, order, document) being evaluated.",
    )
    features: Dict[str, Any] = Field(
        ...,
        description="Raw feature dictionary. TODO: FINALIZE AFTER OFFICIAL PROBLEM STATEMENT",
    )
    options: InferenceOptions = Field(
        default_factory=InferenceOptions,
        description="Optional execution flags.",
    )


class InferenceOutputResult(BaseModel):
    """Result body embedded within output envelope."""

    model_config = ConfigDict(extra="allow")

    prediction: Any = Field(
        ...,
        description="Primary predicted value, category, or recommendation.",
    )
    confidence: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description="Confidence score bounded between 0.0 and 1.0.",
    )
    explanation: Optional[Any] = Field(
        default=None,
        description="Human-readable or structured explanation.",
    )


class InferenceMetadata(BaseModel):
    """Metadata detailing execution context."""

    model_config = ConfigDict(extra="allow")

    latency_ms: float = Field(..., ge=0.0)
    fallback_used: bool = Field(default=False)
    timestamp: str = Field(..., description="ISO-8601 UTC timestamp")


class InferenceOutputEnvelope(BaseModel):
    """
    Standard outgoing response envelope returned to backend.
    Fields align with contracts/output.schema.json.
    """

    model_config = ConfigDict(extra="ignore")

    success: bool = True
    model_version: str
    result: Optional[InferenceOutputResult] = None
    metadata: InferenceMetadata
    error: Optional[Dict[str, Any]] = None


def validate_inference_input(payload: Dict[str, Any]) -> InferenceInputPayload:
    """
    Validate a raw dictionary against the InferenceInputPayload schema.
    Raises ValidationError if invalid.
    """
    if not isinstance(payload, dict):
        raise ValidationError(
            message="Inference payload must be a JSON object / Python dictionary.",
            details={"received_type": type(payload).__name__},
        )

    try:
        return InferenceInputPayload.model_validate(payload)
    except Exception as exc:
        raise ValidationError(
            message=f"Input payload schema validation failed: {str(exc)}",
            details={"raw_error": str(exc)},
        ) from exc

