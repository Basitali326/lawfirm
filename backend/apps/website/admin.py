from django.contrib import admin

from .models import (
    Appointment,
    AppointmentReview,
    Article,
    ArticleCategory,
    Certification,
    Ebook,
    EbookPurchase,
    LawyerAvailability,
    LawyerOffDay,
    LegalService,
)


@admin.register(Ebook)
class EbookAdmin(admin.ModelAdmin):
    list_display = ("title", "author", "seller", "price_aed", "status", "is_featured", "firm")
    list_filter = ("status", "is_featured", "firm")
    search_fields = ("title", "author", "isbn")


@admin.register(EbookPurchase)
class EbookPurchaseAdmin(admin.ModelAdmin):
    list_display = ("ebook", "buyer_email", "seller", "amount_aed", "status", "created_at")
    list_filter = ("status", "firm")
    search_fields = ("buyer_email", "buyer_name", "stripe_checkout_session_id")


@admin.register(Certification)
class CertificationAdmin(admin.ModelAdmin):
    list_display = ("title", "sort_order", "is_active", "firm")
    list_filter = ("is_active", "firm")


@admin.register(ArticleCategory)
class ArticleCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active", "firm")


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "author_name", "status", "published_at", "firm")
    list_filter = ("status", "category", "is_featured", "firm")
    search_fields = ("title", "excerpt", "content")


@admin.register(LegalService)
class LegalServiceAdmin(admin.ModelAdmin):
    list_display = ("title", "lawyer", "price_aed", "duration_minutes", "status", "is_featured", "firm")
    list_filter = ("status", "is_featured", "supports_online", "supports_physical", "firm")
    search_fields = ("title", "short_description", "lawyer__email")


@admin.register(LawyerAvailability)
class LawyerAvailabilityAdmin(admin.ModelAdmin):
    list_display = ("lawyer", "weekday", "start_time", "end_time", "is_active", "firm")
    list_filter = ("weekday", "is_active", "firm")


@admin.register(LawyerOffDay)
class LawyerOffDayAdmin(admin.ModelAdmin):
    list_display = ("lawyer", "date", "reason", "is_all_day", "is_active", "firm")
    list_filter = ("is_all_day", "is_active", "firm")


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = (
        "client_name", "service", "lawyer", "appointment_date", "start_time",
        "appointment_type", "status", "payment_status",
    )
    list_filter = ("status", "payment_status", "appointment_type", "firm")
    search_fields = ("client_name", "client_email", "client_phone", "stripe_checkout_session_id")


@admin.register(AppointmentReview)
class AppointmentReviewAdmin(admin.ModelAdmin):
    list_display = ("client_name", "service", "rating", "is_sample", "status", "created_at")
    list_filter = ("status", "rating", "is_sample", "firm")
    search_fields = ("client_name", "comment", "appointment__client_email")
