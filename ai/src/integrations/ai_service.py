"""
AI Microservice API (FastAPI) — Brightloop AI Foundation.

Exposes clean HTTP JSON endpoints for:
- Grounded Customer Assistant (/assistant/chat)
- AI Invoice Explainer (/invoice/explain)
- AI Subscription Assistance Calls (/voice/assistance-call/*)
- System Health and Provider Diagnostics (/health)
"""

from typing import Any, Dict, Optional
from fastapi import FastAPI, HTTPException, status
from fastapi.responses import JSONResponse

from ai.src.assistant.chatbot import CustomerAssistantOrchestrator
from ai.src.assistant.models import CustomerChatRequest
from ai.src.core.config import get_settings
from ai.src.core.exceptions import (
    AuthenticationRequiredError,
    CrossCustomerAccessError,
    ProviderError,
    ValidationError,
)
from ai.src.inference.predictor import Predictor
from ai.src.integrations.backend_client import MockBackendClient
from ai.src.invoice.invoice_explainer import InvoiceExplanationService
from ai.src.invoice.models import InvoiceExplanationRequest
from ai.src.models.registry import get_model_registry
from ai.src.providers.gemini_provider import GeminiProvider
from ai.src.providers.mock_gemini_provider import MockGeminiProvider
from ai.src.providers.mock_murf_provider import MockMurfTTSProvider
from ai.src.providers.mock_telephony_provider import MockTelephonyProvider
from ai.src.providers.murf_provider import MurfTTSProvider
from ai.src.utils.logging import get_logger
from ai.src.voice.assistance_call_service import AIAssistanceCallService
from ai.src.voice.models import SubscriptionActivationEvent

logger = get_logger("ai.integrations.ai_service")


def create_app() -> FastAPI:
    """FastAPI application factory for Brightloop AI."""
    settings = get_settings()
    app = FastAPI(
        title="Brightloop AI Foundation",
        description="Grounded Customer Assistant, Invoice Intelligence, and AI Voice Assistance Services",
        version=settings.model_version,
    )

    # Initialize shared adapters
    llm_provider = (
        GeminiProvider()
        if (not settings.use_mock_providers and settings.gemini_api_key)
        else MockGeminiProvider()
    )

    tts_provider = (
        MurfTTSProvider()
        if (not settings.use_mock_providers and settings.murf_api_key)
        else MockMurfTTSProvider()
    )

    telephony_provider = MockTelephonyProvider()
    backend_client = MockBackendClient()

    # Core AI domain services
    assistant_orchestrator = CustomerAssistantOrchestrator(
        llm_provider=llm_provider, backend_client=backend_client
    )
    invoice_service = InvoiceExplanationService(
        llm_provider=llm_provider, backend_client=backend_client
    )
    voice_service = AIAssistanceCallService(
        telephony_provider=telephony_provider,
        tts_provider=tts_provider,
        backend_client=backend_client,
    )

    # Legacy baseline predictor
    predictor = Predictor()
    registry = get_model_registry()

    @app.get("/health", status_code=status.HTTP_200_OK)
    def health_check() -> Dict[str, Any]:
        """System health and provider diagnostic status."""
        return {
            "status": "healthy",
            "environment": settings.ai_env,
            "version": settings.model_version,
            "providers": {
                "llm": {
                    "type": type(llm_provider).__name__,
                    "model": settings.gemini_model,
                    "available": llm_provider.is_available(),
                    "simulated": getattr(llm_provider, "is_available", lambda: True)(),
                },
                "tts": {
                    "type": type(tts_provider).__name__,
                    "voice": settings.murf_voice_id,
                    "available": tts_provider.is_available(),
                },
                "telephony": {
                    "type": type(telephony_provider).__name__,
                    "available": telephony_provider.is_available(),
                    "mode": "simulation_only" if isinstance(telephony_provider, MockTelephonyProvider) else "live",
                },
            },
        }

    @app.post("/assistant/chat", status_code=status.HTTP_200_OK)
    def chat_endpoint(request: CustomerChatRequest) -> Dict[str, Any]:
        """Grounded, authenticated customer assistant conversation endpoint."""
        try:
            response = assistant_orchestrator.process_chat(request)
            return response.model_dump()
        except AuthenticationRequiredError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=exc.to_dict())
        except CrossCustomerAccessError as exc:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=exc.to_dict())
        except Exception as exc:
            logger.error("Error in chat endpoint: %s", str(exc))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={"code": "CHAT_ORCHESTRATION_ERROR", "message": str(exc)},
            )

    @app.post("/invoice/explain", status_code=status.HTTP_200_OK)
    def invoice_explain_endpoint(request: InvoiceExplanationRequest) -> Dict[str, Any]:
        """AI Invoice Explanation service endpoint."""
        try:
            response = invoice_service.explain_invoice(request)
            return response.model_dump()
        except AuthenticationRequiredError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=exc.to_dict())
        except CrossCustomerAccessError as exc:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=exc.to_dict())
        except ValidationError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=exc.to_dict())
        except Exception as exc:
            logger.error("Error in invoice explanation endpoint: %s", str(exc))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={"code": "INVOICE_EXPLANATION_ERROR", "message": str(exc)},
            )

    @app.post("/voice/assistance-call/trigger", status_code=status.HTTP_202_ACCEPTED)
    def trigger_assistance_call(event: SubscriptionActivationEvent) -> Dict[str, Any]:
        """Idempotent trigger endpoint for post-activation customer assistance calls."""
        try:
            record = voice_service.process_activation_event(event)
            return record.model_dump()
        except Exception as exc:
            logger.error("Error triggering assistance call: %s", str(exc))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={"code": "VOICE_CALL_TRIGGER_ERROR", "message": str(exc)},
            )

    @app.get("/voice/assistance-call/status/{call_id}", status_code=status.HTTP_200_OK)
    def get_assistance_call_status(call_id: str) -> Dict[str, Any]:
        """Inspect status of an AI Assistance Call."""
        record = voice_service.get_call_record(call_id)
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "CALL_NOT_FOUND", "message": f"Call {call_id} not found"},
            )
        return record.model_dump()

    # Legacy routes for backwards compatibility
    @app.get("/metadata", status_code=status.HTTP_200_OK)
    def metadata() -> Dict[str, Any]:
        try:
            active_model = registry.get_model(settings.model_name)
            return active_model.get_metadata()
        except Exception:
            return {
                "name": settings.model_name,
                "version": settings.model_version,
                "status": "baseline_fallback_active",
            }

    @app.post("/predict")
    def predict_endpoint(payload: Dict[str, Any]) -> JSONResponse:
        response = predictor.predict(payload)
        status_code = (
            status.HTTP_200_OK
            if response.get("success")
            else status.HTTP_422_UNPROCESSABLE_ENTITY
        )
        return JSONResponse(status_code=status_code, content=response)

    return app


app = create_app()
