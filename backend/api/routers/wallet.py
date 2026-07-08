from fastapi import APIRouter, HTTPException

from apps.core.models import Wallet

router = APIRouter()


@router.get("/{ranger_id}")
def get_wallet(ranger_id: str) -> dict[str, object]:
    wallet = (
        Wallet.objects.filter(ranger_id=ranger_id)
        .prefetch_related("transactions")
        .first()
    )
    if wallet is None:
        raise HTTPException(status_code=404, detail="Wallet not found")

    transactions = [
        {
            "id": str(tx.id),
            "type": tx.transaction_type,
            "amount": tx.amount,
            "description": tx.description,
            "balanceAfter": tx.balance_after,
            "createdAt": tx.created_at.isoformat(),
        }
        for tx in wallet.transactions.order_by("-created_at")
    ]

    return {
        "rangerId": str(wallet.ranger_id),
        "currentBalance": wallet.current_balance,
        "lifetimeEarnings": wallet.lifetime_earnings,
        "pendingRewards": wallet.pending_rewards,
        "withdrawnAmount": wallet.withdrawn_amount,
        "transactions": transactions,
    }
