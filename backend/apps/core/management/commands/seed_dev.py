from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from apps.core.models import (
    BhkType,
    DeliveryPlatform,
    Notification,
    Property,
    PropertyStatus,
    PropertyStatusHistory,
    RangerProfile,
    TrainingArticle,
    User,
    UserRole,
    Wallet,
    WalletTransaction,
    WalletTransactionType,
)

MOCK_RANGER_PHONE = "9999999999"
# Practice submission the admin can verify + reward to learn the flow. Identified
# by this exact name (no schema flag), and reset via POST /admin/demo/reset.
DEMO_LISTING_NAME = "Demo Listing — Practice"


class Command(BaseCommand):
    help = "Seed local development data, including the mock Ranger account."

    @transaction.atomic
    def handle(self, *args, **options):
        self._seed_admin()
        self._seed_training()
        ranger = self._seed_mock_ranger()
        properties = self._seed_properties(ranger)
        self._seed_wallet(ranger, properties)
        self._seed_notifications(ranger.user, properties)
        self._seed_demo_listing(ranger)

        self.stdout.write(self.style.SUCCESS("Seed data created."))
        self.stdout.write(
            self.style.SUCCESS(
                f"Mock Ranger login -> phone: {MOCK_RANGER_PHONE}, OTP: 0000"
            )
        )
        self.stdout.write(
            self.style.SUCCESS("Mock Admin login  -> phone: 8888888888, OTP: 0000")
        )

    # ------------------------------------------------------------------ admin
    def _seed_admin(self) -> None:
        # Django superuser for the /admin site.
        User.objects.get_or_create(
            username="admin",
            defaults={
                "full_name": "Spoto Admin",
                "phone": "+910000000000",
                "role": UserRole.ADMIN,
                "is_staff": True,
                "is_superuser": True,
                "is_phone_verified": True,
            },
        )
        # Demo admin for phone+OTP login on the admin console.
        User.objects.get_or_create(
            username="admin_demo",
            defaults={
                "full_name": "Spoto Admin",
                "phone": "8888888888",
                "role": UserRole.ADMIN,
                "is_phone_verified": True,
            },
        )

    # --------------------------------------------------------------- training
    def _seed_training(self) -> None:
        for title, summary in [
            ("How to Identify Rental Houses", "Spot signs, boards, guards, and owner conversations quickly."),
            ("Talking to Security Guards", "Ask for useful details without slowing down deliveries."),
            ("Mandatory Information", "The exact fields needed for a high-quality lead."),
            ("Common Mistakes", "Avoid duplicate, incomplete, and unreachable-owner submissions."),
        ]:
            TrainingArticle.objects.get_or_create(
                slug=slugify(title),
                defaults={"title": title, "summary": summary, "body": summary, "is_published": True},
            )

    # ----------------------------------------------------------- mock ranger
    def _seed_mock_ranger(self) -> RangerProfile:
        user, _ = User.objects.get_or_create(
            username="aman_ranger",
            defaults={
                "full_name": "Aman Ranger",
                "phone": MOCK_RANGER_PHONE,
                "role": UserRole.RANGER,
                "is_phone_verified": True,
            },
        )
        ranger, _ = RangerProfile.objects.get_or_create(
            user=user,
            defaults={
                "delivery_platform": DeliveryPlatform.SWIGGY,
                "preferred_area": "Indiranagar",
                "upi_id": "aman@upi",
                "is_active_ranger": True,
            },
        )
        return ranger

    # ------------------------------------------------------------ properties
    def _seed_properties(self, ranger: RangerProfile) -> dict[str, Property]:
        # (status, building, area, bhk, rent, deposit, reward, [(from, to, reason, suggestion), ...])
        specs = [
            (
                PropertyStatus.SUBMITTED,
                "Lakeview Heights", "Indiranagar", BhkType.TWO_BHK, 38000, 200000, 0,
                [("", PropertyStatus.SUBMITTED, "Lead submitted by ranger", "")],
            ),
            (
                PropertyStatus.UNDER_REVIEW,
                "Palm Residency", "HSR Layout", BhkType.THREE_BHK, 46000, 250000, 0,
                [
                    ("", PropertyStatus.SUBMITTED, "Lead submitted by ranger", ""),
                    (PropertyStatus.SUBMITTED, PropertyStatus.UNDER_REVIEW, "Assigned to review queue", ""),
                ],
            ),
            (
                PropertyStatus.NEED_MORE_INFO,
                "Green Meadows", "Koramangala", BhkType.ONE_BHK, 27000, 120000, 0,
                [
                    ("", PropertyStatus.SUBMITTED, "Lead submitted by ranger", ""),
                    (PropertyStatus.SUBMITTED, PropertyStatus.UNDER_REVIEW, "Assigned to review queue", ""),
                    (
                        PropertyStatus.UNDER_REVIEW,
                        PropertyStatus.NEED_MORE_INFO,
                        "Owner phone unreachable",
                        "Please confirm an alternate owner contact number.",
                    ),
                ],
            ),
            (
                PropertyStatus.VERIFIED,
                "Sunrise Apartments", "Whitefield", BhkType.TWO_BHK, 34000, 180000, 100,
                [
                    ("", PropertyStatus.SUBMITTED, "Lead submitted by ranger", ""),
                    (PropertyStatus.SUBMITTED, PropertyStatus.UNDER_REVIEW, "Assigned to review queue", ""),
                    (PropertyStatus.UNDER_REVIEW, PropertyStatus.VERIFIED, "Details verified with owner", ""),
                ],
            ),
            (
                PropertyStatus.LISTED,
                "Orchid Enclave", "Indiranagar", BhkType.THREE_BHK, 52000, 300000, 100,
                [
                    ("", PropertyStatus.SUBMITTED, "Lead submitted by ranger", ""),
                    (PropertyStatus.SUBMITTED, PropertyStatus.VERIFIED, "Details verified with owner", ""),
                    (PropertyStatus.VERIFIED, PropertyStatus.LISTED, "Published on Spoto marketplace", ""),
                ],
            ),
            (
                PropertyStatus.REWARD_CREDITED,
                "Maple Woods", "Bellandur", BhkType.TWO_BHK, 41000, 220000, 100,
                [
                    ("", PropertyStatus.SUBMITTED, "Lead submitted by ranger", ""),
                    (PropertyStatus.SUBMITTED, PropertyStatus.VERIFIED, "Details verified with owner", ""),
                    (PropertyStatus.VERIFIED, PropertyStatus.LISTED, "Published on Spoto marketplace", ""),
                    (PropertyStatus.LISTED, PropertyStatus.REWARD_CREDITED, "Reward credited to wallet", ""),
                ],
            ),
            (
                PropertyStatus.DUPLICATE,
                "Rose Villa", "Jayanagar", BhkType.ONE_RK, 16000, 60000, 0,
                [
                    ("", PropertyStatus.SUBMITTED, "Lead submitted by ranger", ""),
                    (
                        PropertyStatus.SUBMITTED,
                        PropertyStatus.DUPLICATE,
                        "Property already submitted by another ranger",
                        "Check the map before submitting to avoid duplicates.",
                    ),
                ],
            ),
            (
                PropertyStatus.REJECTED,
                "Silver Oak", "Marathahalli", BhkType.FOUR_PLUS, 68000, 400000, 0,
                [
                    ("", PropertyStatus.SUBMITTED, "Lead submitted by ranger", ""),
                    (
                        PropertyStatus.SUBMITTED,
                        PropertyStatus.REJECTED,
                        "Owner not interested in listing",
                        "Confirm owner willingness before submitting.",
                    ),
                ],
            ),
        ]

        result: dict[str, Property] = {}
        for status, building, area, bhk, rent, deposit, reward, history in specs:
            prop, created = Property.objects.get_or_create(
                ranger=ranger,
                building_name=building,
                area=area,
                defaults={
                    "owner_name": f"Owner of {building}",
                    "owner_phone": "8888800000",
                    "bhk": bhk,
                    "monthly_rent": rent,
                    "deposit": deposit,
                    "status": status,
                    "reward_amount": reward,
                    "notes": "Seeded development lead.",
                },
            )
            if created:
                for from_status, to_status, reason, suggestion in history:
                    PropertyStatusHistory.objects.create(
                        property=prop,
                        from_status=from_status,
                        to_status=to_status,
                        reason=reason,
                        suggestion=suggestion,
                        changed_by=None,
                    )
            result[status] = prop
        return result

    # ---------------------------------------------------------------- wallet
    def _seed_wallet(self, ranger: RangerProfile, properties: dict[str, Property]) -> None:
        wallet, _ = Wallet.objects.get_or_create(ranger=ranger)

        # Build an append-only ledger and derive balances from it.
        credited_prop = properties.get(PropertyStatus.REWARD_CREDITED)
        verified_prop = properties.get(PropertyStatus.VERIFIED)
        listed_prop = properties.get(PropertyStatus.LISTED)

        # (type, amount, description, property)
        ledger = [
            (WalletTransactionType.CREDIT, 100, "Reward credited for Maple Woods", credited_prop),
            (WalletTransactionType.CREDIT, 100, "Reward credited for Orchid Enclave", listed_prop),
            (WalletTransactionType.HOLD, 100, "Reward on hold for Sunrise Apartments", verified_prop),
            (WalletTransactionType.DEBIT, 100, "Withdrawal to aman@upi", None),
        ]

        if wallet.transactions.exists():
            return  # already seeded; keep ledger append-only

        balance = 0
        lifetime = 0
        pending = 0
        withdrawn = 0
        for tx_type, amount, description, prop in ledger:
            if tx_type == WalletTransactionType.CREDIT:
                balance += amount
                lifetime += amount
            elif tx_type == WalletTransactionType.DEBIT:
                balance -= amount
                withdrawn += amount
            elif tx_type == WalletTransactionType.HOLD:
                pending += amount
            WalletTransaction.objects.create(
                wallet=wallet,
                property=prop,
                transaction_type=tx_type,
                amount=amount,
                description=description,
                balance_after=balance,
            )

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

    # --------------------------------------------------------- notifications
    def _seed_notifications(self, user: User, properties: dict[str, Property]) -> None:
        credited = properties.get(PropertyStatus.REWARD_CREDITED)
        need_info = properties.get(PropertyStatus.NEED_MORE_INFO)
        verified = properties.get(PropertyStatus.VERIFIED)

        items = [
            ("Reward credited", "You earned ₹100 for Maple Woods. Keep it up!", credited),
            ("Lead verified", "Sunrise Apartments has been verified.", verified),
            ("More info needed", "Green Meadows needs an alternate owner contact.", need_info),
        ]
        for title, body, prop in items:
            action_url = f"/leads/{prop.id}" if prop else ""
            # Guard with exists() rather than get_or_create: reward flows may have
            # already created same-title notifications, which would break get().
            if not Notification.objects.filter(user=user, title=title).exists():
                Notification.objects.create(
                    user=user, title=title, body=body, action_url=action_url
                )

    # ----------------------------------------------------------------- demo
    def _seed_demo_listing(self, ranger: RangerProfile) -> None:
        prop, created = Property.objects.get_or_create(
            ranger=ranger,
            building_name=DEMO_LISTING_NAME,
            defaults={
                "area": "Indiranagar",
                "owner_name": "Demo Owner",
                "owner_phone": "7000000000",
                "bhk": BhkType.TWO_BHK,
                "monthly_rent": 32000,
                "deposit": 150000,
                "status": PropertyStatus.SUBMITTED,
                "reward_amount": 0,
                "notes": "DEMO — practice verifying and rewarding this listing.",
            },
        )
        if created:
            PropertyStatusHistory.objects.create(
                property=prop,
                from_status="",
                to_status=PropertyStatus.SUBMITTED,
                reason="Demo listing seeded for practice",
                changed_by=None,
            )
