"""Integration clients and microservice wrappers."""

from ai.src.integrations.ai_service import create_app
from ai.src.integrations.backend_client import BackendClient

__all__ = ["BackendClient", "create_app"]

