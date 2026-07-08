import uuid
from datetime import timedelta

from django.db.models import Count, Q, Sum
from django.utils import timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from apps.core.models import (
    Invitation,
    InvitationStatus,
    Property,
    PropertyStatus,
    PropertyStatusHistory,
    RangerProfile,
    User,
    Wallet,
    WalletTransaction,
)
from apps.core.services import wallet_service
from apps.core.services.property_service import TransitionError, change_status
from api.security import require_admin

router = APIRouter()

# The practice submission (see seed_dev.DEMO_LISTING_NAME) admins can reset.
DEMO_LISTING_NAME = "Demo Listing — Practice"

# Statuses an admin considers "still needs work".
PENDING_STATUSES = [
    PropertyStatus.SUBMITTED,
    PropertyStatus.UNDER_REVIEW,
    PropertyStatus.NEED_MORE_INFO,
]


def _short_id(value: uuid.UUID) -> str:
    return str(value).split("-")[0].upper()


def _submission_row(item: Property) -> dict[str, object]:
    return {
        "id": str(item.id),
        "shortId": _short_id(item.id),
        "buildingName": item.building_name,
        "area": item.area,
        "rent": item.monthly_rent,
        "status": item.status,
        "reward": item.reward_amount,
        "rangerId": str(item.ranger_id),
        "rangerName": item.ranger.user.full_name,
        "submittedAt": item.created_at.isoformat(),
    }


# --------------------------------------------------------------------- stats
@router.get("/stats")
def admin_stats(admin: User = Depends(require_admin)) -> dict[str, object]:
    by_status = {
        row["status"]: row["n"]
        for row in Property.objects.values("status").annotate(n=Count("id"))
    }
    rewards_paid = (
        Property.objects.filter(status=PropertyStatus.REWARD_CREDITED).aggregate(
            total=Sum("reward_amount")
        )["total"]
        or 0
    )
    return {
        "totalSubmissions": Property.objects.count(),
        "pendingReview": sum(by_status.get(s, 0) for s in PENDING_STATUSES),
        "verified": by_status.get(PropertyStatus.VERIFIED, 0),
        "listed": by_status.get(PropertyStatus.LISTED, 0),
        "rewardCredited": by_status.get(PropertyStatus.REWARD_CREDITED, 0),
        "rewardsPaid": rewards_paid,
        "activeRangers": RangerProfile.objects.filter(is_active_ranger=True).count(),
        "byStatus": by_status,
    }


# --------------------------------------------------------------- submissions
@router.get("/submissions")
def list_submissions(
    status: PropertyStatus | None = None,
    ranger_id: str | None = None,
    search: str | None = None,
    admin: User = Depends(require_admin),
) -> list[dict[str, object]]:
    qs = Property.objects.select_related("ranger", "ranger__user").order_by("-created_at")
    if status:
        qs = qs.filter(status=status)
    if ranger_id:
        qs = qs.filter(ranger_id=ranger_id)
    if search:
        qs = qs.filter(
            Q(building_name__icontains=search)
            | Q(area__icontains=search)
            | Q(ranger__user__full_name__icontains=search)
        )
    return [_submission_row(item) for item in qs[:200]]


@router.get("/submissions/{property_id}")
def get_submission(
    property_id: str, admin: User = Depends(require_admin)
) -> dict[str, object]:
    item = (
        Property.objects.select_related("ranger", "ranger__user")
        .prefetch_related("status_history")
        .filter(id=property_id)
        .first()
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Submission not found")

    history = [
        {
            "id": str(h.id),
            "fromStatus": h.from_status,
            "toStatus": h.to_status,
            "reason": h.reason,
            "suggestion": h.suggestion,
            "changedAt": h.created_at.isoformat(),
        }
        for h in item.status_history.order_by("created_at")
    ]
    return {
        **_submission_row(item),
        "ownerName": item.owner_name,
        "ownerPhone": item.owner_phone,
        "bhk": item.bhk,
        "deposit": item.deposit,
        "flatNumber": item.flat_number,
        "floor": item.floor,
        "notes": item.notes,
        "rangerPhone": item.ranger.user.phone,
        "statusHistory": history,
    }


class StatusPayload(BaseModel):
    status: PropertyStatus
    reason: str = ""
    suggestion: str = ""


@router.post("/submissions/{property_id}/status")
def change_submission_status(
    property_id: str,
    payload: StatusPayload,
    admin: User = Depends(require_admin),
) -> dict[str, object]:
    item = _get_property_or_404(property_id)
    try:
        change_status(
            item,
            payload.status,
            admin,
            reason=payload.reason,
            suggestion=payload.suggestion,
        )
    except TransitionError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    return get_submission(property_id, admin)


@router.post("/submissions/{property_id}/reward")
def send_submission_reward(
    property_id: str, admin: User = Depends(require_admin)
) -> dict[str, object]:
    """Reward step — enabled only after a submission is verified. Credits a flat
    ₹100 to the ranger's wallet and marks the listing live + reward_credited."""
    item = _get_property_or_404(property_id)
    try:
        wallet_service.send_reward(item, admin)
    except TransitionError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    return get_submission(property_id, admin)


@router.post("/demo/reset")
def reset_demo(admin: User = Depends(require_admin)) -> dict[str, object]:
    """Reset the practice demo listing to `submitted` and undo its reward so the
    admin can run the verify -> reward flow again. Scoped to the demo only."""
    demo = (
        Property.objects.select_related("ranger")
        .filter(building_name=DEMO_LISTING_NAME)
        .first()
    )
    if demo is None:
        raise HTTPException(status_code=404, detail="Demo listing not found")

    # Remove any practice reward transactions, then reset the property.
    WalletTransaction.objects.filter(property=demo).delete()
    demo.status = PropertyStatus.SUBMITTED
    demo.reward_amount = 0
    demo.save(update_fields=["status", "reward_amount", "updated_at"])

    # Keep only the initial history row; drop practice transitions.
    history = list(demo.status_history.order_by("created_at"))
    for entry in history[1:]:
        entry.delete()
    if not history:
        PropertyStatusHistory.objects.create(
            property=demo, from_status="", to_status=PropertyStatus.SUBMITTED, reason="Demo reset"
        )

    wallet = Wallet.objects.filter(ranger=demo.ranger).first()
    if wallet is not None:
        wallet_service.recompute_from_ledger(wallet)

    return {"status": "reset", "id": str(demo.id), "buildingName": demo.building_name}


@router.get("/demo")
def get_demo(admin: User = Depends(require_admin)) -> dict[str, object]:
    """Return the demo listing id so the admin UI can link straight to it."""
    demo = Property.objects.filter(building_name=DEMO_LISTING_NAME).first()
    if demo is None:
        raise HTTPException(status_code=404, detail="Demo listing not found")
    return {"id": str(demo.id), "buildingName": demo.building_name, "status": demo.status}


# ------------------------------------------------------------------- rangers
@router.get("/rangers")
def list_rangers(admin: User = Depends(require_admin)) -> list[dict[str, object]]:
    rangers = (
        RangerProfile.objects.select_related("user", "wallet")
        .annotate(submission_count=Count("properties"))
        .order_by("user__full_name")
    )
    return [
        {
            "id": str(r.id),
            "shortId": _short_id(r.id),
            "fullName": r.user.full_name,
            "phone": r.user.phone,
            "deliveryPlatform": r.delivery_platform,
            "preferredArea": r.preferred_area,
            "submissionCount": r.submission_count,
            "walletBalance": getattr(getattr(r, "wallet", None), "current_balance", 0),
            "isActive": r.is_active_ranger,
        }
        for r in rangers
    ]


@router.get("/rangers/{ranger_id}")
def get_ranger(ranger_id: str, admin: User = Depends(require_admin)) -> dict[str, object]:
    r = (
        RangerProfile.objects.select_related("user")
        .filter(id=ranger_id)
        .first()
    )
    if r is None:
        raise HTTPException(status_code=404, detail="Ranger not found")

    submissions = [
        _submission_row(p)
        for p in Property.objects.select_related("ranger", "ranger__user")
        .filter(ranger=r)
        .order_by("-created_at")
    ]
    wallet = Wallet.objects.filter(ranger=r).first()
    return {
        "id": str(r.id),
        "shortId": _short_id(r.id),
        "fullName": r.user.full_name,
        "phone": r.user.phone,
        "deliveryPlatform": r.delivery_platform,
        "preferredArea": r.preferred_area,
        "upiId": r.upi_id,
        "isActive": r.is_active_ranger,
        "wallet": {
            "currentBalance": wallet.current_balance if wallet else 0,
            "lifetimeEarnings": wallet.lifetime_earnings if wallet else 0,
            "pendingRewards": wallet.pending_rewards if wallet else 0,
            "withdrawnAmount": wallet.withdrawn_amount if wallet else 0,
        },
        "submissions": submissions,
    }


class InvitePayload(BaseModel):
    phone: str = Field(min_length=10, max_length=20)


@router.post("/rangers/invite")
def invite_ranger(
    payload: InvitePayload, admin: User = Depends(require_admin)
) -> dict[str, object]:
    recruiter = getattr(admin, "recruiter_profile", None)
    if recruiter is None:
        raise HTTPException(
            status_code=409,
            detail="This admin has no recruiter profile to send invites from.",
        )
    token = uuid.uuid4().hex
    invitation = Invitation.objects.create(
        recruiter=recruiter,
        phone=payload.phone,
        token=token,
        status=InvitationStatus.PENDING,
        expires_at=timezone.now() + timedelta(days=7),
    )
    return {
        "id": str(invitation.id),
        "phone": invitation.phone,
        "inviteCode": token,
        "inviteLink": f"/onboarding?invite={token}",
        "expiresAt": invitation.expires_at.isoformat(),
    }


# ------------------------------------------------------------------- helpers
def _get_property_or_404(property_id: str) -> Property:
    item = (
        Property.objects.select_related("ranger", "ranger__user")
        .filter(id=property_id)
        .first()
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Submission not found")
    return item
