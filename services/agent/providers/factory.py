"""
Resolve the correct DataProvider based on DATA_MODE environment variable.
"""

from __future__ import annotations

from config import get_settings


def create_data_provider():
    """
    Returns MockDataProvider when DATA_MODE=MOCK (default),
    LiveDataProvider when DATA_MODE=LIVE.
    """
    settings = get_settings()

    if settings.data_mode == "LIVE":
        from providers.live_provider import LiveDataProvider
        return LiveDataProvider()

    from providers.mock_provider import MockDataProvider
    return MockDataProvider()
