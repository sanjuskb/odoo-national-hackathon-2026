"""
Custom Exception Hierarchy for AI/ML Module.

Provides structured, domain-neutral exceptions that map cleanly to API error
envelopes without leaking raw Python tracebacks or internal paths to clients.
"""

from typing import Any, Dict, Optional


class AIError(Exception):
    """Base exception for all AI/ML module errors."""

    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_AI_ERROR",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.details = details or {}

    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary for API responses."""
        return {
            "code": self.code,
            "message": self.message,
            "details": self.details,
        }


class ConfigurationError(AIError):
    """Raised when environment or model configuration is missing or invalid."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, code="CONFIGURATION_ERROR", details=details)


class ValidationError(AIError):
    """Raised when incoming inference payload fails schema or constraint validation."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, code="VALIDATION_ERROR", details=details)


class PreprocessingError(AIError):
    """Raised when cleaning or feature transformation fails."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, code="PREPROCESSING_ERROR", details=details)


class ModelNotFoundError(AIError):
    """Raised when requested model or heuristic is not registered or loaded."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, code="MODEL_NOT_FOUND", details=details)


class InferenceError(AIError):
    """Raised when model inference execution fails."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, code="INFERENCE_ERROR", details=details)


class TimeoutError(AIError):
    """Raised when inference or external AI call exceeds allowed timeout budget."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, code="INFERENCE_TIMEOUT", details=details)


class ProviderError(AIError):
    """Raised when external AI provider (Gemini, Murf, Telephony) encounters an error."""

    def __init__(self, message: str, code: str = "PROVIDER_ERROR", details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, code=code, details=details)


class ProviderAuthenticationError(ProviderError):
    """Raised when API key is missing, invalid, or unauthorized."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, code="PROVIDER_AUTHENTICATION_ERROR", details=details)


class ProviderRateLimitError(ProviderError):
    """Raised when provider rate limits or quotas are exceeded."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, code="PROVIDER_RATE_LIMIT_ERROR", details=details)


class ProviderTimeoutError(ProviderError):
    """Raised when provider request times out."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, code="PROVIDER_TIMEOUT_ERROR", details=details)


class SecurityError(AIError):
    """Base error for authentication and authorization violations."""

    def __init__(self, message: str, code: str = "SECURITY_ERROR", details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, code=code, details=details)


class AuthenticationRequiredError(SecurityError):
    """Raised when customer identity is missing from chatbot or voice session."""

    def __init__(self, message: str = "Customer authentication required", details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, code="AUTHENTICATION_REQUIRED", details=details)


class CrossCustomerAccessError(SecurityError):
    """Raised when request attempts to inspect another customer's data."""

    def __init__(self, message: str = "Cross-customer data access forbidden", details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, code="CROSS_CUSTOMER_ACCESS_FORBIDDEN", details=details)


class ConsentRequiredError(SecurityError):
    """Raised when attempting a customer call without verified consent."""

    def __init__(self, message: str = "Customer consent required for voice assistance", details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, code="CONSENT_REQUIRED", details=details)

