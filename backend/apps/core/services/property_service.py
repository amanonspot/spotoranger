"""Property status workflow — the single place admin status changes flow through.

Keeps `Property.status`, `PropertyStatusHistory`, `AuditLog`, and ranger
`Notification` consistent for every transition.
"""
from __future__ import annotations

from django.db import transaction

from apps.core.models import (
    AuditLog,
    Notification,
    Property,
    PropertyStatus,
    PropertyStatusHistory,
    User,
)

# Allowed transitions the admin can drive directly (publish flow is handled by
# wallet_service.publish_and_reward, which chains VERIFIED -> LISTED -> REWARD).
ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    PropertyStatus.SUBMITTED: {
        PropertyStatus.UNDER_REVIEW,
        PropertyStatus.VERIFIED,
        PropertyStatus.NEED_MORE_INFO,
        PropertyStatus.DUPLICATE,
        PropertyStatus.REJECTED,
    },
    PropertyStatus.UNDER_REVIEW: {
        PropertyStatus.VERIFIED,
        PropertyStatus.NEED_MORE_INFO,
        PropertyStatus.DUPLICATE,
        PropertyStatus.REJECTED,
    },
    PropertyStatus.NEED_MORE_INFO: {
        PropertyStatus.UNDER_REVIEW,
        PropertyStatus.VERIFIED,
        PropertyStatus.REJECTED,
        PropertyStatus.DUPLICATE,
    },
    PropertyStatus.VERIFIED: {
        PropertyStatus.NEED_MORE_INFO,
        PropertyStatus.REJECTED,
        PropertyStatus.DUPLICATE,
    },
}

# Human-friendly notification copy per destination status.
_NOTIFICATION_COPY: dict[str, tuple[str, str]] = {
    PropertyStatus.UNDER_REVIEW: ("Lead under review", "Your submission {name} is being reviewed."),
    PropertyStatus.VERIFIED: ("Lead verified", "Great news — {name} has been verified."),
    PropertyStatus.NEED_MORE_INFO: ("More info needed", "{name} needs more information."),
    PropertyStatus.DUPLICATE: ("Duplicate lead", "{name} was marked as a duplicate."),
    PropertyStatus.REJECTED: ("Lead rejected", "{name} was not approved."),
}


class TransitionError(ValueError):
    """Raised when a status change is not allowed from the current status."""


@transaction.atomic
def change_status(
    prop: Property,
    to_status: str,
    admin: User,
    reason: str = "",
    suggestion: str = "",
) -> Property:
    from_status = prop.status
    if to_status == from_status:
        return prop

    allowed = ALLOWED_TRANSITIONS.get(from_status, set())
    if to_status not in allowed:
        raise TransitionError(f"Cannot move from '{from_status}' to '{to_status}'.")

    prop.status = to_status
    prop.save(update_fields=["status", "updated_at"])

    PropertyStatusHistory.objects.create(
        property=prop,
        from_status=from_status,
        to_status=to_status,
        reason=reason,
        suggestion=suggestion,
        changed_by=admin,
    )

    AuditLog.objects.create(
        actor=admin,
        action="property.status_change",
        entity_type="property",
        entity_id=prop.id,
        metadata={"from": from_status, "to": to_status, "reason": reason},
    )

    _notify_ranger(prop, to_status)
    return prop


def _notify_ranger(prop: Property, to_status: str) -> None:
    copy = _NOTIFICATION_COPY.get(to_status)
    if not copy:
        return
    title, body_template = copy
    Notification.objects.create(
        user=prop.ranger.user,
        title=title,
        body=body_template.format(name=prop.building_name),
        action_url=f"/leads/{prop.id}",
    )
