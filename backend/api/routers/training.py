from fastapi import APIRouter

from apps.core.models import TrainingArticle

router = APIRouter()


@router.get("")
def list_training() -> list[dict[str, str]]:
    return [
        {"title": article.title, "slug": article.slug, "summary": article.summary}
        for article in TrainingArticle.objects.filter(is_published=True).order_by("-created_at")
    ]

