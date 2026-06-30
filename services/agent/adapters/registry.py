"""
Adapter registry — maps adapter names to their implementations.
Swap adapters by changing the DATA_ADAPTER environment variable.
"""

from __future__ import annotations

import os
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from adapters.base import OfferAdapter


def create_offer_adapter() -> "OfferAdapter":
    """
    Instantiate and return the configured offer adapter.
    Defaults to NativeOfferAdapter backed by the PostgreSQL offer catalog.
    """
    adapter_name = os.getenv("OFFER_ADAPTER", "native").lower()
    db_url = os.getenv("DATABASE_URL", "")

    if adapter_name == "native":
        from adapters.native_adapter import NativeOfferAdapter
        return NativeOfferAdapter(db_url=db_url)
    elif adapter_name == "veeva":
        from adapters.veeva_vault_adapter import VeevaVaultAdapter
        return VeevaVaultAdapter()
    elif adapter_name == "sap":
        from adapters.sap_adapter import SAPAdapter
        return SAPAdapter()
    else:
        raise ValueError(
            f"Unknown offer adapter '{adapter_name}'. "
            "Valid values: native, veeva, sap"
        )
