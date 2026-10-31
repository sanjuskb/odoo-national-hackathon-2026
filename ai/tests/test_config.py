"""
Unit Tests for Configuration Management.
"""

import os
from unittest.mock import patch

from ai.src.core.config import AISettings, get_settings, load_yaml_config


def test_default_settings():
    """Verify sensible default configuration values."""
    settings = AISettings()
    assert settings.ai_port == 8000
    assert settings.ai_host == "127.0.0.1"
    assert settings.model_name == "provisional_heuristic_model"
    assert settings.inference_timeout_seconds == 5.0
    assert settings.backend_timeout_seconds == 10.0


def test_env_override():
    """Verify environment variables override defaults correctly."""
    with patch.dict(
        os.environ,
        {
            "AI_PORT": "9090",
            "AI_ENV": "production",
            "MODEL_NAME": "custom_test_model",
            "INFERENCE_TIMEOUT_SECONDS": "2.5",
        },
    ):
        settings = AISettings()
        assert settings.ai_port == 9090
        assert settings.ai_env == "production"
        assert settings.model_name == "custom_test_model"
        assert settings.inference_timeout_seconds == 2.5


def test_load_yaml_config():
    """Verify loading of example YAML configuration."""
    config = load_yaml_config()
    assert isinstance(config, dict)
    # config.example.yaml contains environment and inference blocks
    if config:
        assert "environment" in config or "inference" in config

