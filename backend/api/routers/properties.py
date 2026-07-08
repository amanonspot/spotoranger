from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from apps.core.models import BhkType, Property, PropertyStatus

router = APIRouter()


class PropertyCreatePayload(BaseModel):
    ranger_id: str
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


@router.get("")
def list_properties(
    status: PropertyStatus | None = None,
    ranger_id: str | None = None,
) -> list[dict[str, object]]:
    queryset = Property.objects.select_related("ranger", "ranger__user").order_by("-created_at")
    if status:
        queryset = queryset.filter(status=status)
    if ranger_id:
        queryset = queryset.filter(ranger_id=ranger_id)
    return [_serialize_summary(item) for item in queryset[:100]]


@router.get("/{property_id}")
def get_property(property_id: str) -> dict[str, object]:
    item = (
        Property.objects.select_related("ranger", "ranger__user")
        .prefetch_related("status_history")
        .filter(id=property_id)
        .first()
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Property not found")

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
        "statusHistory": status_history,
    }
