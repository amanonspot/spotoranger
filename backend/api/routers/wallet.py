from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from api.security import get_current_user, get_ranger_profile
from apps.core.models import RangerProfile, User, UserRole, Wallet
from apps.core.services import wallet_service

router = APIRouter()


class WithdrawPayload(BaseModel):
    amount: int | None = Field(default=None, gt=0)
    upiId: str | None = Field(default=None, max_length=120)


def _serialize_wallet(wallet: Wallet) -> dict[str, object]:
    transactions = [
        {
            "id": str(tx.id),
            "type": tx.transaction_type,
            "amount": tx.amount,
            "description": tx.description,
            "balanceAfter": tx.balance_after,
            "createdAt": tx.created_at.isoformat(),
        }
        for tx in wallet.transactions.order_by("-created_at")[:100]
    ]
    return {
        "rangerId": str(wallet.ranger_id),
        "currentBalance": wallet.current_balance,
        "lifetimeEarnings": wallet.lifetime_earnings,
        "pendingRewards": wallet.pending_rewards,
        "withdrawnAmount": wallet.withdrawn_amount,
        "transactions": transactions,
    }


@router.get("/{ranger_id}")
def get_wallet(ranger_id: str, user: User = Depends(get_current_user)) -> dict[str, object]:
    if user.role == UserRole.RANGER:
        profile = RangerProfile.objects.filter(user=user).first()
        if profile is None or str(profile.id) != ranger_id:
            raise HTTPException(status_code=403, detail="Not allowed")

    wallet = (
        Wallet.objects.filter(ranger_id=ranger_id)
        .prefetch_related("transactions")
        .first()
    )
    if wallet is None:
        raise HTTPException(status_code=404, detail="Wallet not found")
    return _serialize_wallet(wallet)


@router.post("/{ranger_id}/withdraw")
def request_withdrawal(
    ranger_id: str,
    payload: WithdrawPayload,
    ranger: RangerProfile = Depends(get_ranger_profile),
) -> dict[str, object]:
    if str(ranger.id) != ranger_id:
        raise HTTPException(status_code=403, detail="Not allowed")

    try:
        wallet, withdrawal = wallet_service.request_withdrawal(
            ranger=ranger,
            amount=payload.amount,
            upi_id=payload.upiId,
        )
    except wallet_service.WithdrawalError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {
        **_serialize_wallet(wallet),
        "withdrawal": {
            "id": str(withdrawal.id),
            "amount": withdrawal.amount,
            "upiId": withdrawal.upi_id,
            "status": withdrawal.status,
            "createdAt": withdrawal.created_at.isoformat(),
        },
    }
