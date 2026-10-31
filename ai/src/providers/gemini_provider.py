"""
Gemini LLM Provider Adapter.

Connects to Google's Gemini API via direct HTTPS REST calls using httpx.
Adheres strictly to the BaseLLMProvider interface with enterprise-grade
timeouts, error handling, rate-limit classification, and secret hygiene.
"""

import time
from typing import Any, Dict, List, Optional
import httpx

from ai.src.core.config import get_settings
from ai.src.core.exceptions import (
    ProviderAuthenticationError,
    ProviderError,
    ProviderRateLimitError,
    ProviderTimeoutError,
)
from ai.src.providers.llm_base import BaseLLMProvider, LLMMessage, LLMResponse
from ai.src.utils.logging import get_logger

logger = get_logger("ai.providers.gemini")


class GeminiProvider(BaseLLMProvider):
    """Google Gemini API Provider Adapter."""

    BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        timeout_seconds: Optional[float] = None,
    ):
        settings = get_settings()
        self.api_key = api_key or settings.gemini_api_key
        self.model = model or settings.gemini_model
        self.timeout_seconds = timeout_seconds or settings.gemini_timeout_seconds

    def is_available(self) -> bool:
        """Return True if an API key is configured."""
        return bool(self.api_key and self.api_key.strip())

    def _build_payload(
        self,
        messages: List[LLMMessage],
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_output_tokens: int = 1024,
    ) -> Dict[str, Any]:
        """Construct Gemini v1beta generateContent JSON payload."""
        contents = []
        for msg in messages:
            # Gemini maps 'assistant' to 'model'
            role = "model" if msg.role == "assistant" else "user"
            contents.append({
                "role": role,
                "parts": [{"text": msg.content}]
            })

        payload: Dict[str, Any] = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_output_tokens,
            },
        }

        if system_prompt:
            payload["systemInstruction"] = {
                "parts": [{"text": system_prompt}]
            }

        return payload

    def _execute_request(self, payload: Dict[str, Any]) -> LLMResponse:
        """Execute HTTP request to Gemini endpoint with error mapping."""
        if not self.is_available():
            raise ProviderAuthenticationError(
                "Gemini API key is not configured. Set GEMINI_API_KEY in server environment."
            )

        endpoint = f"{self.BASE_URL}/{self.model}:generateContent?key={self.api_key}"
        headers = {"Content-Type": "application/json"}

        start_time = time.perf_counter()
        try:
            with httpx.Client(timeout=self.timeout_seconds) as client:
                response = client.post(endpoint, json=payload, headers=headers)
        except httpx.TimeoutException as exc:
            logger.error("Gemini API call timed out after %s seconds", self.timeout_seconds)
            raise ProviderTimeoutError(
                f"Gemini API timed out after {self.timeout_seconds} seconds"
            ) from exc
        except httpx.RequestError as exc:
            logger.error("Gemini network request failed: %s", str(exc))
            raise ProviderError(f"Network error communicating with Gemini API: {str(exc)}") from exc

        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

        # Handle HTTP Status Codes
        if response.status_code == 429:
            logger.warning("Gemini API rate limit exceeded (HTTP 429)")
            raise ProviderRateLimitError(
                "Gemini API rate limit exceeded. Please retry after backoff.",
                details={"status_code": 429}
            )
        elif response.status_code in (401, 403):
            logger.error("Gemini API authentication failed (HTTP %s)", response.status_code)
            raise ProviderAuthenticationError(
                "Invalid or unauthorized Gemini API key.",
                details={"status_code": response.status_code}
            )
        elif response.is_error:
            logger.error("Gemini API returned error HTTP %s: %s", response.status_code, response.text)
            raise ProviderError(
                f"Gemini provider returned error HTTP {response.status_code}",
                details={"body": response.text}
            )

        try:
            data = response.json()
            candidates = data.get("candidates", [])
            if not candidates:
                raise ProviderError("Gemini returned no response candidates", details={"raw": data})

            first_candidate = candidates[0]
            parts = first_candidate.get("content", {}).get("parts", [])
            content_text = "".join(part.get("text", "") for part in parts)
            finish_reason = first_candidate.get("finishReason", "stop")

            return LLMResponse(
                content=content_text,
                model=self.model,
                latency_ms=latency_ms,
                finish_reason=finish_reason,
                is_simulated=False,
                raw_response={"prompt_feedback": data.get("promptFeedback")},
            )
        except (KeyError, ValueError) as exc:
            raise ProviderError(f"Failed to parse Gemini response payload: {str(exc)}") from exc

    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_output_tokens: int = 1024,
        **kwargs: Any,
    ) -> LLMResponse:
        """Generate completion for a single prompt."""
        messages = [LLMMessage(role="user", content=prompt)]
        payload = self._build_payload(
            messages=messages,
            system_prompt=system_prompt,
            temperature=temperature,
            max_output_tokens=max_output_tokens,
        )
        return self._execute_request(payload)

    def chat(
        self,
        messages: List[LLMMessage],
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_output_tokens: int = 1024,
        **kwargs: Any,
    ) -> LLMResponse:
        """Multi-turn conversation generation."""
        payload = self._build_payload(
            messages=messages,
            system_prompt=system_prompt,
            temperature=temperature,
            max_output_tokens=max_output_tokens,
        )
        return self._execute_request(payload)

