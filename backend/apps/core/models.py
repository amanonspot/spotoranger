import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class TimestampedModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True

    def soft_delete(self) -> None:
        self.deleted_at = timezone.now()
        self.save(update_fields=["deleted_at", "updated_at"])


class UserRole(models.TextChoices):
    RANGER = "ranger", "Ranger"
    RECRUITER = "recruiter", "Recruiter"
    ADMIN = "admin", "Admin"


class DeliveryPlatform(models.TextChoices):
    ZOMATO = "zomato", "Zomato"
    SWIGGY = "swiggy", "Swiggy"
    BLINKIT = "blinkit", "Blinkit"
    ZEPTO = "zepto", "Zepto"
    BIGBASKET = "bigbasket", "BigBasket"
    SWISH = "swish", "Swish"
    OTHER = "other", "Other"


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = models.CharField(max_length=150, unique=True)
    full_name = models.CharField(max_length=160)
    phone = models.CharField(max_length=20, unique=True, db_index=True)
    role = models.CharField(max_length=24, choices=UserRole.choices)
    is_phone_verified = models.BooleanField(default=False)
    # OTP fields ported from Spoto main backend (accounts.CustomUser)
    otp = models.CharField(max_length=6, blank=True, null=True)
    otp_expiry = models.DateTimeField(blank=True, null=True)
    max_otp_try = models.CharField(max_length=2, default="3")
    otp_max_out = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    REQUIRED_FIELDS = ["phone", "full_name", "role"]

    def __str__(self) -> str:
        return f"{self.full_name} ({self.phone})"


class RecruiterProfile(TimestampedModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="recruiter_profile")
    invite_code = models.CharField(max_length=32, unique=True, db_index=True)


class RangerProfile(TimestampedModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="ranger_profile")
    recruiter = models.ForeignKey(RecruiterProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name="rangers")
    delivery_platform = models.CharField(max_length=32, choices=DeliveryPlatform.choices)
    preferred_area = models.CharField(max_length=160, db_index=True)
    upi_id = models.CharField(max_length=120, blank=True)
    is_active_ranger = models.BooleanField(default=True)


class InvitationStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    ACCEPTED = "accepted", "Accepted"
    EXPIRED = "expired", "Expired"
    REVOKED = "revoked", "Revoked"


class Invitation(TimestampedModel):
    recruiter = models.ForeignKey(RecruiterProfile, on_delete=models.CASCADE, related_name="invitations")
    phone = models.CharField(max_length=20, blank=True, db_index=True)
    token = models.CharField(max_length=80, unique=True, db_index=True)
    status = models.CharField(max_length=24, choices=InvitationStatus.choices, default=InvitationStatus.PENDING)
    expires_at = models.DateTimeField()
    accepted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="accepted_invitations")


class OtpSession(TimestampedModel):
    phone = models.CharField(max_length=20, db_index=True)
    code_hash = models.CharField(max_length=255)
    attempts = models.PositiveSmallIntegerField(default=0)
    expires_at = models.DateTimeField()
    verified_at = models.DateTimeField(null=True, blank=True)


class BhkType(models.TextChoices):
    ONE_RK = "1_rk", "1 RK"
    ONE_BHK = "1_bhk", "1 BHK"
    TWO_BHK = "2_bhk", "2 BHK"
    THREE_BHK = "3_bhk", "3 BHK"
    FOUR_PLUS = "4_bhk_plus", "4 BHK+"


class PropertyStatus(models.TextChoices):
    SUBMITTED = "submitted", "Submitted"
    UNDER_REVIEW = "under_review", "Under Review"
    NEED_MORE_INFO = "need_more_information", "Need More Information"
    VERIFIED = "verified", "Verified"
    LISTED = "listed_on_spoto", "Listed on Spoto"
    REWARD_CREDITED = "reward_credited", "Reward Credited"
    DUPLICATE = "duplicate", "Duplicate"
    REJECTED = "rejected", "Rejected"


class Property(TimestampedModel):
    ranger = models.ForeignKey(RangerProfile, on_delete=models.PROTECT, related_name="properties")
    building_name = models.CharField(max_length=180, db_index=True)
    area = models.CharField(max_length=180, db_index=True)
    maps_place_id = models.CharField(max_length=255, blank=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    owner_name = models.CharField(max_length=160)
    owner_phone = models.CharField(max_length=20, db_index=True)
    bhk = models.CharField(max_length=24, choices=BhkType.choices)
    monthly_rent = models.PositiveIntegerField()
    deposit = models.PositiveIntegerField()
    flat_number = models.CharField(max_length=64, blank=True)
    floor = models.CharField(max_length=64, blank=True)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=32, choices=PropertyStatus.choices, default=PropertyStatus.SUBMITTED, db_index=True)
    reward_amount = models.PositiveIntegerField(default=0)

    class Meta:
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["owner_phone", "building_name"]),
            models.Index(fields=["ranger", "status"]),
        ]


class PropertyStatusHistory(TimestampedModel):
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name="status_history")
    from_status = models.CharField(max_length=32, choices=PropertyStatus.choices, blank=True)
    to_status = models.CharField(max_length=32, choices=PropertyStatus.choices)
    reason = models.CharField(max_length=255, blank=True)
    suggestion = models.TextField(blank=True)
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)


class Wallet(TimestampedModel):
    ranger = models.OneToOneField(RangerProfile, on_delete=models.PROTECT, related_name="wallet")
    current_balance = models.IntegerField(default=0)
    lifetime_earnings = models.PositiveIntegerField(default=0)
    pending_rewards = models.PositiveIntegerField(default=0)
    withdrawn_amount = models.PositiveIntegerField(default=0)


class WalletTransactionType(models.TextChoices):
    CREDIT = "credit", "Credit"
    DEBIT = "debit", "Debit"
    HOLD = "hold", "Hold"
    RELEASE = "release", "Release"


class WalletTransaction(TimestampedModel):
    wallet = models.ForeignKey(Wallet, on_delete=models.PROTECT, related_name="transactions")
    property = models.ForeignKey(Property, on_delete=models.SET_NULL, null=True, blank=True, related_name="wallet_transactions")
    transaction_type = models.CharField(max_length=16, choices=WalletTransactionType.choices)
    amount = models.IntegerField()
    description = models.CharField(max_length=255)
    balance_after = models.IntegerField()
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)


class WithdrawalStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    PROCESSING = "processing", "Processing"
    PAID = "paid", "Paid"
    REJECTED = "rejected", "Rejected"


class Withdrawal(TimestampedModel):
    wallet = models.ForeignKey(Wallet, on_delete=models.PROTECT, related_name="withdrawals")
    upi_id = models.CharField(max_length=120)
    amount = models.PositiveIntegerField()
    status = models.CharField(max_length=24, choices=WithdrawalStatus.choices, default=WithdrawalStatus.PENDING, db_index=True)
    processed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    processed_at = models.DateTimeField(null=True, blank=True)


class Notification(TimestampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    title = models.CharField(max_length=140)
    body = models.TextField()
    read_at = models.DateTimeField(null=True, blank=True)
    action_url = models.CharField(max_length=255, blank=True)


class TrainingArticle(TimestampedModel):
    title = models.CharField(max_length=180)
    slug = models.SlugField(unique=True)
    summary = models.CharField(max_length=255)
    body = models.TextField()
    video_url = models.URLField(blank=True)
    is_published = models.BooleanField(default=False)


class AuditLog(TimestampedModel):
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=120, db_index=True)
    entity_type = models.CharField(max_length=80, db_index=True)
    entity_id = models.UUIDField(null=True, blank=True, db_index=True)
    metadata = models.JSONField(default=dict, blank=True)

