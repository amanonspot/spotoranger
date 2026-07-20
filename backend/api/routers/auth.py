"""Phone OTP auth — flow ported from Spoto main backend (accounts Login/VerifyOTP)."""

from __future__ import annotations

import logging
import random
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from api.security import create_access_token
from apps.core.models import (
    DeliveryPlatform,
    OtpSession,
    RangerProfile,
    User,
    UserRole,
    Wallet,
)
from apps.core.services.sms import send_otp

router = APIRouter()
logger = logging.getLogger(__name__)


class RequestOtpPayload(BaseModel):
    phone: str = Field(min_length=10, max_length=20)
    fullName: str | None = Field(default=None, max_length=160)


class VerifyOtpPayload(BaseModel):
    phone: str = Field(min_length=10, max_length=20)
    code: str = Field(min_length=4, max_length=8)
    fullName: str | None = Field(default=None, max_length=160)
    deliveryPlatform: str | None = None
    preferredArea: str | None = Field(default=None, max_length=160)
    upiId: str | None = Field(default=None, max_length=120)


class SessionUser(BaseModel):
    id: str
    fullName: str
    phone: str
    role: str
    rangerId: str | None = None


class VerifyOtpResponse(BaseModel):
    status: str
    user: SessionUser | None = None
    token: str | None = None
    message: str | None = None


def _normalize_phone(phone: str) -> str:
    digits = "".join(ch for ch in phone if ch.isdigit())
    if len(digits) > 10 and digits.startswith("91"):
        digits = digits[-10:]
    return digits


def _default_phone() -> str:
    raw = str(getattr(settings, "DEFAULT_LOGIN_PHONE_NUMBER", "") or "")
    return _normalize_phone(raw) if raw else ""


def _default_otp() -> str:
    return str(getattr(settings, "DEFAULT_OTP", "") or "")


def _otp_expiry_minutes() -> int:
    return int(getattr(settings, "OTP_EXPIRY_MINUTES", 10))


def _is_production() -> bool:
    return getattr(settings, "ENVIRONMENT", "production") == "production"


def _has_default_login() -> bool:
    return bool(_default_phone() and _default_otp())


def _get_or_create_user(phone: str, full_name: str | None = None) -> User:
    user = User.objects.filter(phone=phone).first()
    if user is not None:
        if full_name and full_name.strip() and not user.full_name.strip():
            user.full_name = full_name.strip()
            user.save(update_fields=["full_name", "updated_at"])
        return user

    display = (full_name or "").strip() or f"Ranger {phone[-4:]}"
    username = f"ranger_{phone}"
    # Avoid username collisions if phone was reused with different username.
    if User.objects.filter(username=username).exists():
        username = f"ranger_{phone}_{random.randint(1000, 9999)}"

    return User.objects.create(
        username=username,
        full_name=display,
        phone=phone,
        role=UserRole.RANGER,
    )


def _ensure_ranger_profile(
    user: User,
    *,
    delivery_platform: str | None = None,
    preferred_area: str | None = None,
    upi_id: str | None = None,
) -> RangerProfile:
    platform = delivery_platform if delivery_platform in DeliveryPlatform.values else DeliveryPlatform.OTHER
    area = (preferred_area or "").strip() or "Not set"
    upi = (upi_id or "").strip()

    profile, created = RangerProfile.objects.get_or_create(
        user=user,
        defaults={
            "delivery_platform": platform,
            "preferred_area": area,
            "upi_id": upi,
            "is_active_ranger": True,
        },
    )
    if not created:
        updates: list[str] = []
        if delivery_platform and delivery_platform in DeliveryPlatform.values:
            profile.delivery_platform = delivery_platform
            updates.append("delivery_platform")
        if preferred_area and preferred_area.strip():
            profile.preferred_area = preferred_area.strip()
            updates.append("preferred_area")
        if upi_id is not None and upi_id.strip():
            profile.upi_id = upi_id.strip()
            updates.append("upi_id")
        if updates:
            updates.append("updated_at")
            profile.save(update_fields=updates)

    Wallet.objects.get_or_create(ranger=profile)
    return profile


def _session_user(user: User) -> SessionUser:
    ranger_id = (
        RangerProfile.objects.filter(user=user).values_list("id", flat=True).first()
    )
    return SessionUser(
        id=str(user.id),
        fullName=user.full_name,
        phone=user.phone,
        role=user.role,
        rangerId=str(ranger_id) if ranger_id else None,
    )


@router.post("/otp/request")
def request_otp(payload: RequestOtpPayload) -> dict[str, str]:
    phone = _normalize_phone(payload.phone)
    if len(phone) != 10:
        raise HTTPException(status_code=400, detail="Enter a valid 10-digit mobile number")

    user = _get_or_create_user(phone, payload.fullName)

    # Default phone: skip SMS (same behaviour as Spoto main backend).
    if _has_default_login() and phone == _default_phone():
        OtpSession.objects.create(
            phone=phone,
            code_hash=_default_otp(),
            expires_at=timezone.now() + timedelta(minutes=_otp_expiry_minutes()),
        )
        return {"message": "OTP sent", "msg": "Successfully generated OTP"}

    otp = str(random.randint(1000, 9999))
    expiry = timezone.now() + timedelta(minutes=_otp_expiry_minutes())
    user.otp = otp
    user.otp_expiry = expiry
    user.save(update_fields=["otp", "otp_expiry", "updated_at"])

    OtpSession.objects.create(
        phone=phone,
        code_hash=otp,
        expires_at=expiry,
    )

    sent = send_otp(user.phone, otp)
    if not sent:
        if _is_production():
            raise HTTPException(status_code=502, detail="Could not send OTP. Please try again.")
        logger.info("SMS not sent for %s — OTP stored for verify: %s", phone, otp)

    return {"message": "OTP sent", "msg": "Successfully generated OTP"}


@router.post("/otp/verify")
def verify_otp(payload: VerifyOtpPayload) -> VerifyOtpResponse:
    phone = _normalize_phone(payload.phone)
    code = str(payload.code).strip()

    if len(phone) != 10:
        return VerifyOtpResponse(status="invalid", message="Invalid phone number")

    with transaction.atomic():
        user = User.objects.select_for_update().filter(phone=phone).first()
        default_otp = _default_otp()
        default_phone = _default_phone()

        # Default test bypass (only when both DEFAULT_* env vars are set).
        if (
            _has_default_login()
            and code == default_otp
            and phone == default_phone
        ):
            if user is None:
                user = _get_or_create_user(phone, payload.fullName)
        elif user is not None and user.otp and str(user.otp) == code:
            if user.otp_expiry and timezone.now() > user.otp_expiry:
                return VerifyOtpResponse(
                    status="invalid",
                    message="OTP has expired. Please request a new OTP",
                )
        else:
            # Fallback: latest unused OtpSession for this phone.
            session = (
                OtpSession.objects.filter(phone=phone, verified_at__isnull=True)
                .order_by("-created_at")
                .first()
            )
            session_ok = bool(
                session
                and session.expires_at >= timezone.now()
                and code == session.code_hash
            )
            if not session_ok:
                return VerifyOtpResponse(
                    status="invalid",
                    message="Please enter the correct OTP",
                )
            if user is None:
                user = _get_or_create_user(phone, payload.fullName)
            if session is not None:
                session.verified_at = timezone.now()
                session.save(update_fields=["verified_at", "updated_at"])

        if payload.fullName and payload.fullName.strip():
            user.full_name = payload.fullName.strip()

        user.is_phone_verified = True
        user.otp = None
        user.otp_expiry = None
        user.save(
            update_fields=[
                "full_name",
                "is_phone_verified",
                "otp",
                "otp_expiry",
                "updated_at",
            ]
        )

        OtpSession.objects.filter(phone=phone, verified_at__isnull=True).update(
            verified_at=timezone.now()
        )

        if user.role == UserRole.RANGER:
            _ensure_ranger_profile(
                user,
                delivery_platform=payload.deliveryPlatform,
                preferred_area=payload.preferredArea,
                upi_id=payload.upiId,
            )

        token = create_access_token(user)
        return VerifyOtpResponse(
            status="verified",
            user=_session_user(user),
            token=token,
            message="Successfully verified OTP",
        )
