"""Seam for publishing a verified property to Spoto's main marketplace backend.

For the MVP this is a stub that always succeeds. Swap the body for the real
Spoto main-backend API call (HTTP request / message publish) when it is ready;
the admin publish flow already treats a failure here as a hard stop.
"""
from __future__ import annotations

from apps.core.models import Property


class ListingError(RuntimeError):
    """Raised when the property could not be published to Spoto."""


def publish_listing(prop: Property) -> dict[str, str]:
    # TODO: call Spoto's main backend here and return its listing reference.
    return {"listingRef": f"spoto-{prop.id}", "status": "live"}
