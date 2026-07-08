"""Wallet ledger operations. Balances are always derived from append-only
`WalletTransaction` rows inside a single locked transaction.
"""
from __future__ import annotations

from django.db import transaction

from apps.core.models import (
    AuditLog,
    Notification,
    Property,
    PropertyStatus,
    PropertyStatusHistory,
    User,
    Wallet,
    WalletTransaction,
    WalletTransactionType,
)
from apps.core.services import spoto_listing_service
from apps.core.services.property_service import TransitionError

DEFAULT_REWARD = 100


@transaction.atomic
def publish_and_reward(prop: Property, admin: User) -> Property:
    """VERIFIED -> LISTED (live on Spoto) -> REWARD_CREDITED, atomically.

    Idempotent: a property already at REWARD_CREDITED is returned unchanged so
    the reward can never be paid twice.
    """
    # Re-read under a lock to avoid double-credit under concurrency.
    prop = Property.objects.select_for_update().get(pk=prop.pk)

    if prop.status == PropertyStatus.REWARD_CREDITED:
        return prop
    if prop.status not in (PropertyStatus.VERIFIED, PropertyStatus.LISTED):
        raise TransitionError(
            f"Cannot publish from '{prop.status}'. Verify the submission first."
        )

    reward = prop.reward_amount or DEFAULT_REWARD

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
        action="property.publish_and_reward",
        entity_type="property",
        entity_id=prop.id,
        metadata={"reward": reward},
    )
    return prop


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
