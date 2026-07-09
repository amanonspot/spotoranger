from django.test import TestCase

from apps.core.models import (
    BhkType,
    DeliveryPlatform,
    Property,
    PropertyStatus,
    RangerProfile,
    User,
    UserRole,
    Wallet,
    WalletTransactionType,
)
from apps.core.services import wallet_service
from apps.core.services.property_service import TransitionError, change_status


class PropertyStatusTests(TestCase):
    def test_reward_status_exists(self):
        self.assertEqual(PropertyStatus.REWARD_CREDITED, "reward_credited")


class CreatePropertyTests(TestCase):
    def test_create_persists_and_starts_submitted(self):
        from api.routers.properties import PropertyCreatePayload, create_property

        ranger = _make_ranger()
        result = create_property(
            PropertyCreatePayload(
                ranger_id=str(ranger.id),
                building_name="New Tower",
                area="HSR Layout",
                owner_name="Owner X",
                owner_phone="7776665555",
                bhk=BhkType.TWO_BHK,
                monthly_rent=25000,
                deposit=80000,
            )
        )
        self.assertEqual(result["status"], PropertyStatus.SUBMITTED)
        prop = Property.objects.get(id=result["id"])
        self.assertEqual(prop.ranger_id, ranger.id)
        self.assertEqual(prop.status_history.count(), 1)

    def test_create_unknown_ranger_404(self):
        from fastapi import HTTPException

        from api.routers.properties import PropertyCreatePayload, create_property

        with self.assertRaises(HTTPException) as ctx:
            create_property(
                PropertyCreatePayload(
                    ranger_id="00000000-0000-0000-0000-000000000000",
                    building_name="Xx",
                    area="Yy",
                    owner_name="Zz",
                    owner_phone="1112223333",
                    bhk=BhkType.ONE_BHK,
                    monthly_rent=1000,
                    deposit=0,
                )
            )
        self.assertEqual(ctx.exception.status_code, 404)


def _make_ranger(phone="9990001111", name="Test Ranger"):
    user = User.objects.create(
        username=f"ranger_{phone}", full_name=name, phone=phone, role=UserRole.RANGER
    )
    profile = RangerProfile.objects.create(
        user=user,
        delivery_platform=DeliveryPlatform.SWIGGY,
        preferred_area="Indiranagar",
        upi_id="test@upi",
    )
    Wallet.objects.create(ranger=profile)
    return profile


def _make_property(ranger, status=PropertyStatus.SUBMITTED, reward=100):
    return Property.objects.create(
        ranger=ranger,
        building_name="Test Tower",
        area="Indiranagar",
        owner_name="Owner",
        owner_phone="8887776666",
        bhk=BhkType.TWO_BHK,
        monthly_rent=30000,
        deposit=100000,
        status=status,
        reward_amount=reward,
    )


class AdminAuthTests(TestCase):
    """Exercise the FastAPI auth dependencies directly (no HTTP layer, so no
    SQLite/threads locking against the test transaction)."""

    def _creds(self, token):
        from fastapi.security import HTTPAuthorizationCredentials

        return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

    def _user(self, role, phone):
        return User.objects.create(
            username=f"u_{role}_{phone}", full_name="U", phone=phone, role=role
        )

    def test_missing_token_raises_401(self):
        from fastapi import HTTPException

        from api.security import get_current_user

        with self.assertRaises(HTTPException) as ctx:
            get_current_user(None)
        self.assertEqual(ctx.exception.status_code, 401)

    def test_rejects_non_admin(self):
        from fastapi import HTTPException

        from api.security import create_access_token, get_current_user, require_admin

        ranger = self._user(UserRole.RANGER, "9992223333")
        user = get_current_user(self._creds(create_access_token(ranger)))
        with self.assertRaises(HTTPException) as ctx:
            require_admin(user)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_allows_admin(self):
        from api.security import create_access_token, get_current_user, require_admin

        admin = self._user(UserRole.ADMIN, "8888888888")
        user = get_current_user(self._creds(create_access_token(admin)))
        self.assertEqual(require_admin(user).id, admin.id)


class StatusChangeTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create(
            username="admin_t", full_name="Admin", phone="8888888888", role=UserRole.ADMIN
        )
        self.ranger = _make_ranger()

    def test_valid_transition_writes_history_and_notification(self):
        prop = _make_property(self.ranger, status=PropertyStatus.SUBMITTED)
        change_status(prop, PropertyStatus.VERIFIED, self.admin, reason="Looks good")
        prop.refresh_from_db()
        self.assertEqual(prop.status, PropertyStatus.VERIFIED)
        self.assertEqual(prop.status_history.count(), 1)
        self.assertEqual(self.ranger.user.notifications.count(), 1)

    def test_invalid_transition_raises(self):
        prop = _make_property(self.ranger, status=PropertyStatus.REWARD_CREDITED)
        with self.assertRaises(TransitionError):
            change_status(prop, PropertyStatus.VERIFIED, self.admin)


class RewardTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create(
            username="admin_p", full_name="Admin", phone="8888888888", role=UserRole.ADMIN
        )
        self.ranger = _make_ranger()

    def test_reward_before_verify_is_rejected(self):
        prop = _make_property(self.ranger, status=PropertyStatus.SUBMITTED)
        with self.assertRaises(TransitionError):
            wallet_service.send_reward(prop, self.admin)

    def test_reward_credits_flat_100_once_and_is_idempotent(self):
        prop = _make_property(self.ranger, status=PropertyStatus.VERIFIED, reward=0)
        wallet = self.ranger.wallet
        start = wallet.current_balance

        wallet_service.send_reward(prop, self.admin)
        prop.refresh_from_db()
        wallet.refresh_from_db()

        self.assertEqual(prop.status, PropertyStatus.REWARD_CREDITED)
        self.assertEqual(wallet.current_balance, start + 100)  # flat ₹100
        credits = wallet.transactions.filter(transaction_type=WalletTransactionType.CREDIT)
        self.assertEqual(credits.count(), 1)

        # Second call must not double-credit.
        wallet_service.send_reward(prop, self.admin)
        wallet.refresh_from_db()
        self.assertEqual(wallet.current_balance, start + 100)
        self.assertEqual(
            wallet.transactions.filter(transaction_type=WalletTransactionType.CREDIT).count(),
            1,
        )

    def test_recompute_from_ledger_restores_balance_after_removal(self):
        prop = _make_property(self.ranger, status=PropertyStatus.VERIFIED, reward=0)
        wallet = self.ranger.wallet
        start = wallet.current_balance

        wallet_service.send_reward(prop, self.admin)
        wallet.refresh_from_db()
        self.assertEqual(wallet.current_balance, start + 100)

        # Simulate a demo reset: drop the reward tx, then recompute.
        wallet.transactions.filter(property=prop).delete()
        wallet_service.recompute_from_ledger(wallet)
        wallet.refresh_from_db()
        self.assertEqual(wallet.current_balance, start)
