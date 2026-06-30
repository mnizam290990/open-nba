"""
LLM prompt input sanitisation utilities.
Strips control characters and injection patterns from any string
before it is interpolated into an LLM prompt.
"""

from __future__ import annotations

import re
import unicodedata


_CONTROL_CHAR_RE = re.compile(r"[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f]")

_INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?previous\s+instructions?", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\s+a", re.IGNORECASE),
    re.compile(r"act\s+as\s+(if\s+you\s+are|a|an)", re.IGNORECASE),
    re.compile(r"system\s*prompt", re.IGNORECASE),
    re.compile(r"<\|.*?\|>"),
    re.compile(r"\[INST\]|\[/INST\]"),
    re.compile(r"###\s*instruction", re.IGNORECASE),
]

_MAX_LENGTH = 2000


def sanitize_prompt_input(text: str) -> str:
    """
    Sanitise a user-provided or CRM-sourced string before interpolation
    into an LLM prompt.

    Steps:
    1. Normalise unicode to NFKC to collapse homoglyph attacks.
    2. Strip ASCII control characters (keep \\n, \\t which are safe).
    3. Remove known prompt-injection patterns.
    4. Truncate to MAX_LENGTH characters.
    """
    if not isinstance(text, str):
        return ""

    text = unicodedata.normalize("NFKC", text)
    text = _CONTROL_CHAR_RE.sub("", text)

    for pattern in _INJECTION_PATTERNS:
        text = pattern.sub("[REMOVED]", text)

    text = text[:_MAX_LENGTH]

    return text.strip()


def sanitize_notes(notes: list[str]) -> list[str]:
    """Sanitise a list of visit note strings."""
    return [sanitize_prompt_input(note) for note in notes]
