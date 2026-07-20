from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from api.security import get_current_user, get_ranger_profile
from apps.core.models import (
    BhkType,
    Property,
    PropertyStatus,
    PropertyStatusHistory,
    RangerProfile,
    User,
    UserRole,
)

router = APIRouter()


class PropertyCreatePayload(BaseModel):
    building_name: str = Field(min_length=2, max_length=180)
    area: str = Field(min_length=2, max_length=180)
    owner_name: str = Field(min_length=2, max_length=160)
    owner_phone: str = Field(min_length=10, max_length=20)
    bhk: BhkType
    monthly_rent: int = Field(gt=0)
    deposit: int = Field(ge=0)
    latitude: float | None = None
    longitude: float | None = None
    maps_place_id: str = ""
    flat_number: str = ""
    floor: str = ""
    notes: str = ""


def _serialize_summary(item: Property) -> dict[str, object]:
    return {
        "id": str(item.id),
        "buildingName": item.building_name,
        "area": item.area,
        "rent": item.monthly_rent,
        "status": item.status,
        "reward": item.reward_amount,
        "submittedAt": item.created_at.isoformat(),
    }


def _serialize_detail(item: Property) -> dict[str, object]:
    status_history = [
        {
            "id": str(entry.id),
            "fromStatus": entry.from_status,
            "toStatus": entry.to_status,
            "reason": entry.reason,
            "suggestion": entry.suggestion,
            "changedAt": entry.created_at.isoformat(),
        }
        for entry in item.status_history.order_by("created_at")
    ]
    return {
        **_serialize_summary(item),
        "ownerName": item.owner_name,
        "ownerPhone": item.owner_phone,
        "bhk": item.bhk,
        "deposit": item.deposit,
        "flatNumber": item.flat_number,
        "floor": item.floor,
        "notes": item.notes,
        "latitude": float(item.latitude) if item.latitude is not None else None,
        "longitude": float(item.longitude) if item.longitude is not None else None,
        "statusHistory": status_history,
    }


@router.get("")
def list_properties(
    status: PropertyStatus | None = None,
    ranger_id: str | None = None,
    user: User = Depends(get_current_user),
) -> list[dict[str, object]]:
    queryset = Property.objects.select_related("ranger", "ranger__user").order_by("-created_at")

    if user.role == UserRole.RANGER:
        profile = RangerProfile.objects.filter(user=user).first()
        if profile is None:
            return []
        queryset = queryset.filter(ranger=profile)
    elif ranger_id:
        queryset = queryset.filter(ranger_id=ranger_id)
    elif user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not allowed")

    if status:
        queryset = queryset.filter(status=status)
    return [_serialize_summary(item) for item in queryset[:100]]


@router.post("")
def create_property(
    payload: PropertyCreatePayload,
    ranger: RangerProfile = Depends(get_ranger_profile),
) -> dict[str, object]:
    owner_phone = "".join(ch for ch in payload.owner_phone if ch.isdigit())
    if len(owner_phone) >= 10:
        owner_phone = owner_phone[-10:]

    prop = Property.objects.create(
        ranger=ranger,
        building_name=payload.building_name.strip(),
        area=payload.area.strip(),
        owner_name=payload.owner_name.strip(),
        owner_phone=owner_phone,
        bhk=payload.bhk,
        monthly_rent=payload.monthly_rent,
        deposit=payload.deposit,
        latitude=Decimal(str(payload.latitude)) if payload.latitude is not None else None,
        longitude=Decimal(str(payload.longitude)) if payload.longitude is not None else None,
        maps_place_id=payload.maps_place_id or "",
        flat_number=payload.flat_number or "",
        floor=payload.floor or "",
        notes=payload.notes or "",
        status=PropertyStatus.SUBMITTED,
    )
    PropertyStatusHistory.objects.create(
        property=prop,
        from_status="",
        to_status=PropertyStatus.SUBMITTED,
        reason="Submitted by ranger",
        changed_by=ranger.user,
    )
    prop = (
        Property.objects.select_related("ranger", "ranger__user")
        .prefetch_related("status_history")
        .get(pk=prop.pk)
    )
    return _serialize_detail(prop)


@router.get("/{property_id}")
def get_property(
    property_id: str,
    user: User = Depends(get_current_user),
) -> dict[str, object]:
    item = (
        Property.objects.select_related("ranger", "ranger__user")
        .prefetch_related("status_history")
        .filter(id=property_id)
        .first()
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Property not found")

    if user.role == UserRole.RANGER and item.ranger.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    return _serialize_detail(item)
