from fastapi import APIRouter, HTTPException

from apps.core.models import RangerProfile

router = APIRouter()


@router.get("/{ranger_id}")
def get_ranger_profile(ranger_id: str) -> dict[str, object]:
    profile = (
        RangerProfile.objects.select_related("user")
        .filter(id=ranger_id)
        .first()
    )
    if profile is None:
        raise HTTPException(status_code=404, detail="Ranger profile not found")

    return {
        "id": str(profile.id),
        "fullName": profile.user.full_name,
        "phone": profile.user.phone,
        "deliveryPlatform": profile.delivery_platform,
        "preferredArea": profile.preferred_area,
        "upiId": profile.upi_id,
        "isActiveRanger": profile.is_active_ranger,
    }
