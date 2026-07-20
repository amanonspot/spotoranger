import os
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from apps.core.models import User, UserRole

ALGORITHM = "HS256"
ACCESS_TOKEN_TTL_MINUTES = 60 * 24 * 7  # 7 days — dev-friendly


def _secret() -> str:
    return os.getenv("DJANGO_SECRET_KEY", "local-dev-secret")


def create_access_token(user: User) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user.id),
        "role": user.role,
        "phone": user.phone,
        "name": user.full_name,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=ACCESS_TOKEN_TTL_MINUTES)).timestamp()),
    }
    return jwt.encode(payload, _secret(), algorithm=ALGORITHM)


_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> User:
    if credentials is None or not credentials.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, _secret(), algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user_id = payload.get("sub")
    user = User.objects.filter(id=user_id, deleted_at__isnull=True).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user


def require_ranger(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.RANGER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ranger access required")
    return user


def get_ranger_profile(user: User = Depends(require_ranger)):
    from apps.core.models import RangerProfile

    profile = RangerProfile.objects.filter(user=user).first()
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ranger profile not found")
    return profile
