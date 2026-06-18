from django.contrib import admin

from .models import Article, ArticleCategory, Certification, Ebook, EbookPurchase


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
