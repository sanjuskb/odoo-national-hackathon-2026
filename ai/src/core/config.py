"""
Configuration Management for AI/ML Module.

Loads settings from environment variables and optional YAML configuration files.
Provides typed, validated configuration parameters across the module.
"""

import os
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, Optional

import yaml
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class AISettings(BaseSettings):
    """Core runtime configuration settings."""

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Environment
    ai_env: str = Field(default="development", alias="AI_ENV")
    ai_port: int = Field(default=8000, alias="AI_PORT")
    ai_host: str = Field(default="127.0.0.1", alias="AI_HOST")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    # Backend Integration (Amarnath's API)
    backend_base_url: str = Field(
        default="http://localhost:3000/api/v1", alias="BACKEND_BASE_URL"
    )
    backend_timeout_seconds: float = Field(
        default=10.0, alias="BACKEND_TIMEOUT_SECONDS"
    )
    ai_service_enabled: bool = Field(default=True, alias="AI_SERVICE_ENABLED")

    # Model & Inference
    model_name: str = Field(
        default="provisional_heuristic_model", alias="MODEL_NAME"
    )
    model_version: str = Field(default="0.1.0-alpha", alias="MODEL_VERSION")
    model_storage_path: str = Field(default="./models", alias="MODEL_STORAGE_PATH")
    max_batch_size: int = Field(default=32, alias="MAX_BATCH_SIZE")
    inference_timeout_seconds: float = Field(
        default=5.0, alias="INFERENCE_TIMEOUT_SECONDS"
    )

    # Optional External AI/LLM Provider
    ai_provider: str = Field(default="none", alias="AI_PROVIDER")
    ai_provider_api_key: Optional[str] = Field(
        default=None, alias="AI_PROVIDER_API_KEY"
    )
    ai_provider_base_url: Optional[str] = Field(
        default=None, alias="AI_PROVIDER_BASE_URL"
    )

    # Gemini LLM Provider Settings
    gemini_api_key: Optional[str] = Field(default=None, alias="GEMINI_API_KEY")
    gemini_model: str = Field(default="gemini-3.5-flash-lite", alias="GEMINI_MODEL")
    gemini_timeout_seconds: float = Field(default=15.0, alias="GEMINI_TIMEOUT_SECONDS")
    gemini_temperature: float = Field(default=0.2, alias="GEMINI_TEMPERATURE")

    # Murf TTS Provider Settings
    murf_api_key: Optional[str] = Field(default=None, alias="MURF_API_KEY")
    murf_voice_id: str = Field(default="en-US-marcus", alias="MURF_VOICE_ID")
    murf_timeout_seconds: float = Field(default=15.0, alias="MURF_TIMEOUT_SECONDS")

    # Telephony & Assistance Call Settings
    telephony_provider: str = Field(default="mock", alias="TELEPHONY_PROVIDER")
    use_mock_providers: bool = Field(default=True, alias="USE_MOCK_PROVIDERS")
    call_assistance_window_seconds: int = Field(
        default=60, alias="CALL_ASSISTANCE_WINDOW_SECONDS"
    )
    call_max_retries: int = Field(default=3, alias="CALL_MAX_RETRIES")

    # Twilio Telephony Settings
    twilio_account_sid: Optional[str] = Field(default=None, alias="TWILIO_ACCOUNT_SID")
    twilio_auth_token: Optional[str] = Field(default=None, alias="TWILIO_AUTH_TOKEN")
    twilio_phone_number: Optional[str] = Field(default=None, alias="TWILIO_PHONE_NUMBER")
    twilio_status_callback_url: Optional[str] = Field(
        default=None, alias="TWILIO_STATUS_CALLBACK_URL"
    )
    twilio_timeout_seconds: float = Field(default=10.0, alias="TWILIO_TIMEOUT_SECONDS")


def load_yaml_config(file_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Safely load an optional YAML configuration file.
    Returns an empty dict if the file does not exist.
    """
    if not file_path:
        default_yaml = Path(__file__).resolve().parents[2] / "config" / "config.yaml"
        example_yaml = (
            Path(__file__).resolve().parents[2] / "config" / "config.example.yaml"
        )
        if default_yaml.is_file():
            file_path = str(default_yaml)
        elif example_yaml.is_file():
            file_path = str(example_yaml)
        else:
            return {}

    target = Path(file_path)
    if not target.is_file():
        return {}

    try:
        with open(target, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
            return data if isinstance(data, dict) else {}
    except Exception:
        return {}


@lru_cache()
def get_settings() -> AISettings:
    """Return a cached singleton instance of AISettings."""
    return AISettings()
