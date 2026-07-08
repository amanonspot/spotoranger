from fastapi import APIRouter

from apps.core.models import Notification

router = APIRouter()


@router.get("")
def list_notifications(user_id: str) -> list[dict[str, object]]:
    queryset = Notification.objects.filter(user_id=user_id).order_by("-created_at")
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
