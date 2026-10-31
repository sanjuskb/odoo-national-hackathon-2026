"""
Prompts package for Brightloop AI.
"""

from ai.src.prompts.assistant_prompts import (
    CUSTOMER_ASSISTANT_SYSTEM_PROMPT,
    INTENT_CLASSIFICATION_PROMPT,
)
from ai.src.prompts.invoice_prompts import INVOICE_EXPLANATION_SYSTEM_PROMPT
from ai.src.prompts.voice_prompts import (
    VOICE_ASSISTANCE_CALL_SCRIPT_TEMPLATE,
    VOICE_SUMMARY_SYSTEM_PROMPT,
)

__all__ = [
    "CUSTOMER_ASSISTANT_SYSTEM_PROMPT",
    "INTENT_CLASSIFICATION_PROMPT",
    "VOICE_ASSISTANCE_CALL_SCRIPT_TEMPLATE",
    "VOICE_SUMMARY_SYSTEM_PROMPT",
    "INVOICE_EXPLANATION_SYSTEM_PROMPT",
]

