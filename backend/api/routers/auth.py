import os
from datetime import timedelta

from django.utils import timezone
from fastapi import APIRouter
from pydantic import BaseModel, Field

from apps.core.models import OtpSession, RangerProfile, User

router = APIRouter()

# Development-only OTP bypass. This is NOT production security behaviour — it lets
# the mock Ranger account and any local number log in with a well-known code.
DEV_BYPASS_CODE = "0000"


def _is_dev() -> bool:
    return os.getenv("ENVIRONMENT", "local").lower() != "production"


class RequestOtpPayload(BaseModel):
    phone: str = Field(min_length=10, max_length=20)


class VerifyOtpPayload(BaseModel):
    phone: str = Field(min_length=10, max_length=20)
    code: str = Field(min_length=4, max_length=8)


class SessionUser(BaseModel):
    id: str
    fullName: str
    phone: str
    role: str
    rangerId: str | None = None


class VerifyOtpResponse(BaseModel):
    status: str
    user: SessionUser | None = None


@router.post("/otp/request")
def request_otp(payload: RequestOtpPayload) -> dict[str, str]:
    # MVP dev mode stores a deterministic code hash placeholder. Replace with SMS provider integration.
    OtpSession.objects.create(
        phone=payload.phone,
        code_hash=os.getenv("OTP_DEV_CODE", DEV_BYPASS_CODE),
        expires_at=timezone.now() + timedelta(minutes=10),
    )
    return {"message": "OTP sent"}


@router.post("/otp/verify")
def verify_otp(payload: VerifyOtpPayload) -> VerifyOtpResponse:
    session = (
        OtpSession.objects.filter(phone=payload.phone, verified_at__isnull=True)
        .order_by("-created_at")
        .first()
    )

    session_ok = bool(
        session
        and session.expires_at >= timezone.now()
        and payload.code == session.code_hash
    )
    dev_ok = _is_dev() and payload.code == DEV_BYPASS_CODE

    if not (session_ok or dev_ok):
        return VerifyOtpResponse(status="invalid")

    if session is not None:
        session.verified_at = timezone.now()
        session.save(update_fields=["verified_at", "updated_at"])

    user = User.objects.filter(phone=payload.phone).first()
    session_user: SessionUser | None = None
    if user is not None:
        if not user.is_phone_verified:
            user.is_phone_verified = True
            user.save(update_fields=["is_phone_verified", "updated_at"])
        ranger_id = (
            RangerProfile.objects.filter(user=user)
            .values_list("id", flat=True)
            .first()
        )
        session_user = SessionUser(
            id=str(user.id),
            fullName=user.full_name,
            phone=user.phone,
            role=user.role,
            rangerId=str(ranger_id) if ranger_id else None,
        )

    return VerifyOtpResponse(status="verified", user=session_user)
