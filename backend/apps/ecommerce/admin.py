from django.contrib import admin

from apps.ecommerce import models


@admin.register(models.Collection)
class CollectionAdmin(admin.ModelAdmin):
    list_display = ("title", "firm", "is_active", "created_at", "updated_at")
    search_fields = ("title", "slug")
    list_filter = ("is_active", "created_at")


@admin.register(models.Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "firm", "is_active", "created_at")
    search_fields = ("name", "slug")
    list_filter = ("is_active",)


@admin.register(models.Seller)
class SellerAdmin(admin.ModelAdmin):
    list_display = ("name", "company_name", "email", "commission_percent", "is_active", "firm")
    search_fields = ("name", "company_name", "email")
    list_filter = ("is_active", "firm")


class ProductMediaInline(admin.TabularInline):
    model = models.ProductMedia
    extra = 0


class ProductVariantInline(admin.TabularInline):
    model = models.ProductVariant
    extra = 0


@admin.register(models.Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("title", "seller", "firm", "status", "price_aed", "inventory_quantity", "is_featured", "updated_at")
    search_fields = ("title", "slug", "sku", "vendor")
    list_filter = ("status", "is_featured", "track_inventory", "allow_backorders")
    inlines = [ProductMediaInline, ProductVariantInline]


@admin.register(models.Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("order_number", "firm", "customer_name", "total_amount_aed", "order_status", "payment_status", "placed_at")
    search_fields = ("order_number", "customer_name", "customer_email", "customer_phone")
    list_filter = ("order_status", "payment_status", "shipping_method")


@admin.register(models.Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ("id", "firm", "customer", "guest_token", "status", "updated_at")
    search_fields = ("guest_token", "customer__email")
    list_filter = ("status",)

