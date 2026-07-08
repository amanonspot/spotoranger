from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from apps.core.models import (
    AuditLog,
    Invitation,
    Notification,
    OtpSession,
    Property,
    PropertyStatusHistory,
    RangerProfile,
    RecruiterProfile,
    TrainingArticle,
    User,
    Wallet,
    WalletTransaction,
    Withdrawal,
)


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display = ("phone", "full_name", "role", "is_phone_verified", "is_active")
    search_fields = ("phone", "full_name")
    list_filter = ("role", "is_phone_verified", "is_active")
    fieldsets = DjangoUserAdmin.fieldsets + (
        ("Spoto", {"fields": ("full_name", "phone", "role", "is_phone_verified", "deleted_at")}),
    )


admin.site.register(RecruiterProfile)
admin.site.register(RangerProfile)
admin.site.register(Invitation)
admin.site.register(OtpSession)
admin.site.register(Property)
admin.site.register(PropertyStatusHistory)
admin.site.register(Wallet)
admin.site.register(WalletTransaction)
admin.site.register(Withdrawal)
admin.site.register(Notification)
admin.site.register(TrainingArticle)
admin.site.register(AuditLog)

