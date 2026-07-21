"""Wallet ledger operations. Balances are always derived from append-only
`WalletTransaction` rows inside a single locked transaction.
"""
from __future__ import annotations

from django.conf import settings
from django.db import transaction

from apps.core.models import (
    AuditLog,
    Notification,
    Property,
    PropertyStatus,
    PropertyStatusHistory,
    RangerProfile,
    User,
    Wallet,
    WalletTransaction,
    WalletTransactionType,
    Withdrawal,
    WithdrawalStatus,
)
from apps.core.services import spoto_listing_service
from apps.core.services.property_service import TransitionError

# Flat reward paid to a ranger when their verified listing goes live.
REWARD_AMOUNT = 100


class WithdrawalError(Exception):
    """Raised when a withdrawal request cannot be completed."""


@transaction.atomic
def send_reward(prop: Property, admin: User) -> Property:
    """Reward step: VERIFIED -> LISTED (live on Spoto) -> REWARD_CREDITED, atomically.

    Only allowed once a submission is VERIFIED, so the reward can never be sent
    before verification. Idempotent: a property already at REWARD_CREDITED is
    returned unchanged so the reward can never be paid twice.
    """
    # Re-read under a lock to avoid double-credit under concurrency.
    prop = Property.objects.select_for_update().get(pk=prop.pk)

    if prop.status == PropertyStatus.REWARD_CREDITED:
        return prop
    if prop.status not in (PropertyStatus.VERIFIED, PropertyStatus.LISTED):
        raise TransitionError(
            f"Cannot send reward from '{prop.status}'. Verify the submission first."
        )

    reward = REWARD_AMOUNT

    # 1) Publish to Spoto's marketplace (stubbed integration seam).
    spoto_listing_service.publish_listing(prop)

    # 2) VERIFIED -> LISTED
    if prop.status != PropertyStatus.LISTED:
        _transition(prop, PropertyStatus.LISTED, admin, "Published live on Spoto")
        Notification.objects.create(
            user=prop.ranger.user,
            title="Listed on Spoto",
            body=f"{prop.building_name} is now live on Spoto.",
            action_url=f"/leads/{prop.id}",
        )

    # 3) Credit the wallet, then LISTED -> REWARD_CREDITED
    wallet, _ = Wallet.objects.select_for_update().get_or_create(ranger=prop.ranger)
    new_balance = wallet.current_balance + reward
    WalletTransaction.objects.create(
        wallet=wallet,
        property=prop,
        transaction_type=WalletTransactionType.CREDIT,
        amount=reward,
        description=f"Reward credited for {prop.building_name}",
        balance_after=new_balance,
        created_by=admin,
    )
    wallet.current_balance = new_balance
    wallet.lifetime_earnings = wallet.lifetime_earnings + reward
    wallet.save(update_fields=["current_balance", "lifetime_earnings", "updated_at"])

    prop.reward_amount = reward
    prop.save(update_fields=["reward_amount", "updated_at"])
    _transition(prop, PropertyStatus.REWARD_CREDITED, admin, "Reward credited to wallet")

    Notification.objects.create(
        user=prop.ranger.user,
        title="Reward credited",
        body=f"You earned ₹{reward} for {prop.building_name}. Keep it up!",
        action_url="/wallet",
    )
    AuditLog.objects.create(
        actor=admin,
        action="property.send_reward",
        entity_type="property",
        entity_id=prop.id,
        metadata={"reward": reward},
    )
    return prop


@transaction.atomic
def recompute_from_ledger(wallet: Wallet) -> None:
    """Rebuild wallet totals and each row's balance_after from the (now-edited)
    transaction ledger. Used after a demo reset removes practice transactions."""
    wallet = Wallet.objects.select_for_update().get(pk=wallet.pk)
    balance = lifetime = pending = withdrawn = 0
    for tx in wallet.transactions.order_by("created_at"):
        if tx.transaction_type == WalletTransactionType.CREDIT:
            balance += tx.amount
            lifetime += tx.amount
        elif tx.transaction_type == WalletTransactionType.DEBIT:
            balance -= tx.amount
            withdrawn += tx.amount
        elif tx.transaction_type == WalletTransactionType.HOLD:
            pending += tx.amount
        elif tx.transaction_type == WalletTransactionType.RELEASE:
            pending -= tx.amount
        if tx.balance_after != balance:
            tx.balance_after = balance
            tx.save(update_fields=["balance_after", "updated_at"])
    wallet.current_balance = balance
    wallet.lifetime_earnings = lifetime
    wallet.pending_rewards = pending
    wallet.withdrawn_amount = withdrawn
    wallet.save(
        update_fields=[
            "current_balance",
            "lifetime_earnings",
            "pending_rewards",
            "withdrawn_amount",
            "updated_at",
        ]
    )


def _transition(prop: Property, to_status: str, admin: User, reason: str) -> None:
    from_status = prop.status
    prop.status = to_status
    prop.save(update_fields=["status", "updated_at"])
    PropertyStatusHistory.objects.create(
        property=prop,
        from_status=from_status,
        to_status=to_status,
        reason=reason,
        changed_by=admin,
    )


@transaction.atomic
def request_withdrawal(
    ranger: RangerProfile,
    amount: int | None = None,
    upi_id: str | None = None,
) -> tuple[Wallet, Withdrawal]:
    """Debit the ranger wallet and create a pending Withdrawal row."""
    wallet = Wallet.objects.select_for_update().filter(ranger=ranger).first()
    if wallet is None:
        raise WithdrawalError("Wallet not found")

    min_amount = int(getattr(settings, "MIN_WITHDRAWAL_AMOUNT", 100))
    withdraw_amount = amount if amount is not None else wallet.current_balance
    if withdraw_amount < min_amount:
        raise WithdrawalError(f"Minimum withdrawal is ₹{min_amount}")
    if withdraw_amount > wallet.current_balance:
        raise WithdrawalError("Insufficient balance")

    upi = (upi_id or ranger.upi_id or "").strip()
    if not upi:
        raise WithdrawalError("Add a UPI ID in your profile before withdrawing")

    new_balance = wallet.current_balance - withdraw_amount
    WalletTransaction.objects.create(
        wallet=wallet,
        property=None,
        transaction_type=WalletTransactionType.DEBIT,
        amount=withdraw_amount,
        description=f"Withdrawal to {upi}",
        balance_after=new_balance,
        created_by=ranger.user,
    )
    wallet.current_balance = new_balance
    wallet.withdrawn_amount = wallet.withdrawn_amount + withdraw_amount
    wallet.save(update_fields=["current_balance", "withdrawn_amount", "updated_at"])

    withdrawal = Withdrawal.objects.create(
        wallet=wallet,
        upi_id=upi,
        amount=withdraw_amount,
        status=WithdrawalStatus.PENDING,
    )
    Notification.objects.create(
        user=ranger.user,
        title="Withdrawal requested",
        body=f"₹{withdraw_amount} withdrawal to {upi} is pending.",
        action_url="/wallet",
    )
    return wallet, withdrawal
