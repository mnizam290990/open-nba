"""Tests for LangSmith tracing configuration."""

import os
import pytest
from tracing import configure_tracing


def test_configure_tracing_disabled_when_no_api_key():
    """No-op when LANGSMITH_API_KEY is empty."""
    result = configure_tracing(api_key="", project="test-project")
    assert result is False
    assert os.environ.get("LANGCHAIN_TRACING_V2") != "true"


def test_configure_tracing_sets_env_vars(monkeypatch):
    """Sets required LangChain env vars when key is present."""
    monkeypatch.delenv("LANGCHAIN_TRACING_V2", raising=False)
    monkeypatch.delenv("LANGCHAIN_API_KEY", raising=False)
    monkeypatch.delenv("LANGCHAIN_PROJECT", raising=False)

    result = configure_tracing(api_key="lsv2_test_key_abc123", project="opennba-test")

    assert result is True
    assert os.environ["LANGCHAIN_TRACING_V2"] == "true"
    assert os.environ["LANGCHAIN_API_KEY"] == "lsv2_test_key_abc123"
    assert os.environ["LANGCHAIN_PROJECT"] == "opennba-test"

    # Clean up to avoid polluting other tests
    monkeypatch.delenv("LANGCHAIN_TRACING_V2", raising=False)
    monkeypatch.delenv("LANGCHAIN_API_KEY", raising=False)
    monkeypatch.delenv("LANGCHAIN_PROJECT", raising=False)
