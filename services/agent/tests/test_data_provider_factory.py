"""
Unit tests for DataProvider factory.
Verifies the correct provider is returned per DATA_MODE.
"""

import pytest


def test_mock_provider_selected_when_data_mode_mock(monkeypatch):
    monkeypatch.setenv("DATA_MODE", "MOCK")

    import config
    config.get_settings.cache_clear()

    from providers.factory import create_data_provider
    from providers.mock_provider import MockDataProvider

    provider = create_data_provider()
    assert isinstance(provider, MockDataProvider)


def test_live_provider_selected_when_data_mode_live(monkeypatch):
    monkeypatch.setenv("DATA_MODE", "LIVE")

    import config
    config.get_settings.cache_clear()

    from providers.factory import create_data_provider
    from providers.live_provider import LiveDataProvider

    provider = create_data_provider()
    assert isinstance(provider, LiveDataProvider)

    config.get_settings.cache_clear()
    monkeypatch.setenv("DATA_MODE", "MOCK")
