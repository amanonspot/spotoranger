"""SMS OTP delivery via 2Factor.in (DLT), ported from Spoto main backend."""

from __future__ import annotations

import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def send_otp(mobile: str, otp: str | int) -> bool:
    """
    Send OTP via SMS using 2Factor R1 API with DLT compliance.
    Returns True on HTTP success; False on failure (never raises to callers).
    """
    api_key = getattr(settings, "SMS_API_KEY", "") or ""
    if not api_key:
        logger.warning("SMS_API_KEY not configured — OTP not sent to %s", mobile)
        return False

    try:
        url = "https://2factor.in/API/R1/"
        message_text = (
            f"Use OTP {otp} to log in to your SPOTO account. "
            f"Do not share this code with anyone. Valid for 10 minutes. "
            f"- GIGSTRYK ENTERTAINMENT PRIVATE LIMITED"
        )
        data = {
            "module": "TRANS_SMS",
            "apikey": api_key,
            "to": mobile,
            "from": getattr(settings, "DLT_SENDER_ID", "") or "",
            "msg": message_text,
            "peid": getattr(settings, "DLT_PE_ID", "") or "",
            "ctid": getattr(settings, "DLT_TEMPLATE_ID", "") or "",
        }
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        response = requests.post(url, data=data, headers=headers, timeout=15)
        if not response.ok:
            logger.error(
                "2Factor SMS failed for %s: %s %s",
                mobile,
                response.status_code,
                response.text[:200],
            )
        return response.ok
    except Exception:
        logger.exception("Failed to send OTP SMS to %s", mobile)
        return False
