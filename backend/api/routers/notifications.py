from fastapi import APIRouter, Depends, HTTPException

from api.security import get_current_user
from apps.core.models import Notification, User, UserRole

router = APIRouter()


@router.get("")
def list_notifications(
    user_id: str | None = None,
    user: User = Depends(get_current_user),
) -> list[dict[str, object]]:
    target_id = user_id or str(user.id)
    if user.role != UserRole.ADMIN and target_id != str(user.id):
        raise HTTPException(status_code=403, detail="Not allowed")

    queryset = Notification.objects.filter(user_id=target_id).order_by("-created_at")
    return [
        {
            "id": str(item.id),
            "title": item.title,
            "body": item.body,
            "readAt": item.read_at.isoformat() if item.read_at else None,
            "actionUrl": item.action_url,
            "createdAt": item.created_at.isoformat(),
        }
        for item in queryset[:100]
    ]
