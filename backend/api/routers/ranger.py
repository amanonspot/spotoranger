from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from api.security import get_current_user, get_ranger_profile
from apps.core.models import DeliveryPlatform, RangerProfile, User, UserRole

router = APIRouter()


class RangerUpdatePayload(BaseModel):
    fullName: str | None = Field(default=None, min_length=2, max_length=160)
    deliveryPlatform: str | None = None
    preferredArea: str | None = Field(default=None, max_length=160)
    upiId: str | None = Field(default=None, max_length=120)


def _serialize(profile: RangerProfile) -> dict[str, object]:
    return {
        "id": str(profile.id),
        "fullName": profile.user.full_name,
        "phone": profile.user.phone,
        "deliveryPlatform": profile.delivery_platform,
        "preferredArea": profile.preferred_area,
        "upiId": profile.upi_id,
        "isActiveRanger": profile.is_active_ranger,
    }


@router.get("/{ranger_id}")
def get_ranger_profile_endpoint(
    ranger_id: str,
    user: User = Depends(get_current_user),
) -> dict[str, object]:
    profile = (
        RangerProfile.objects.select_related("user")
        .filter(id=ranger_id)
        .first()
    )
    if profile is None:
        raise HTTPException(status_code=404, detail="Ranger profile not found")

    if user.role == UserRole.RANGER and profile.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    return _serialize(profile)


@router.patch("/{ranger_id}")
def update_ranger_profile(
    ranger_id: str,
    payload: RangerUpdatePayload,
    ranger: RangerProfile = Depends(get_ranger_profile),
) -> dict[str, object]:
    if str(ranger.id) != ranger_id:
        raise HTTPException(status_code=403, detail="Not allowed")

    if payload.fullName and payload.fullName.strip():
        ranger.user.full_name = payload.fullName.strip()
        ranger.user.save(update_fields=["full_name", "updated_at"])

    updates: list[str] = []
    if payload.deliveryPlatform:
        if payload.deliveryPlatform not in DeliveryPlatform.values:
            raise HTTPException(status_code=400, detail="Invalid delivery platform")
        ranger.delivery_platform = payload.deliveryPlatform
        updates.append("delivery_platform")
    if payload.preferredArea is not None:
        ranger.preferred_area = payload.preferredArea.strip()
        updates.append("preferred_area")
    if payload.upiId is not None:
        ranger.upi_id = payload.upiId.strip()
        updates.append("upi_id")
    if updates:
        updates.append("updated_at")
        ranger.save(update_fields=updates)

    ranger = RangerProfile.objects.select_related("user").get(pk=ranger.pk)
    return _serialize(ranger)
