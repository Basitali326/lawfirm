import uuid
from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.text import slugify

from apps.authx.models import Firm


def generate_unique_slug(model, firm, base_value, slug_field="slug", instance_id=None):
    base_slug = slugify(base_value) or "item"
    slug = base_slug
    index = 1
    qs = model.objects.filter(firm=firm)
    if instance_id:
        qs = qs.exclude(id=instance_id)
    while qs.filter(**{slug_field: slug}).exists():
        slug = f"{base_slug}-{index}"
        index += 1
    return slug


def product_media_upload_to(instance, filename):
    suffix = Path(filename or "").suffix.lower()
    return f"firms/{instance.firm_id}/ecommerce/products/{instance.product_id}/{uuid.uuid4().hex}{suffix}"


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class SoftDeleteModel(TimeStampedModel):
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True

    @property
    def is_deleted(self):
        return bool(self.deleted_at)

    def soft_delete(self):
        self.deleted_at = timezone.now()
        self.save(update_fields=["deleted_at", "updated_at"])


class Collection(SoftDeleteModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey(Firm, on_delete=models.CASCADE, related_name="ecommerce_collections")
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["title"]
        constraints = [
            models.UniqueConstraint(
                fields=["firm", "slug"],
                condition=models.Q(deleted_at__isnull=True),
                name="uniq_ecom_collection_slug_per_firm",
            )
        ]
        indexes = [
            models.Index(fields=["firm", "is_active"]),
            models.Index(fields=["firm", "slug"]),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = generate_unique_slug(Collection, self.firm, self.title, instance_id=self.id)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class Category(SoftDeleteModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey(Firm, on_delete=models.CASCADE, related_name="ecommerce_categories")
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["firm", "slug"],
                condition=models.Q(deleted_at__isnull=True),
                name="uniq_ecom_category_slug_per_firm",
            )
        ]
        indexes = [
            models.Index(fields=["firm", "is_active"]),
            models.Index(fields=["firm", "slug"]),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = generate_unique_slug(Category, self.firm, self.name, instance_id=self.id)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class ProductStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    DRAFT = "DRAFT", "Draft"
    UNLISTED = "UNLISTED", "Unlisted"


class Seller(SoftDeleteModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey(Firm, on_delete=models.CASCADE, related_name="ecommerce_sellers")
    name = models.CharField(max_length=255)
    email = models.EmailField()
    phone = models.CharField(max_length=50, blank=True, null=True)
    company_name = models.CharField(max_length=255, blank=True, null=True)
    commission_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0.00"))
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["firm", "email"],
                condition=models.Q(deleted_at__isnull=True),
                name="uniq_ecom_seller_email_per_firm",
            )
        ]

    def __str__(self):
        return self.name


class Product(SoftDeleteModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey(Firm, on_delete=models.CASCADE, related_name="ecommerce_products")
    collection = models.ForeignKey(Collection, on_delete=models.PROTECT, related_name="products", null=True, blank=True)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products", null=True, blank=True)
    seller = models.ForeignKey(Seller, on_delete=models.SET_NULL, related_name="books", null=True, blank=True)
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255)
    short_description = models.CharField(max_length=500, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    vendor = models.CharField(max_length=255, blank=True, null=True)
    product_type = models.CharField(max_length=255, blank=True, null=True)
    price_aed = models.DecimalField(max_digits=12, decimal_places=2)
    compare_at_price_aed = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    cost_per_item = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    sku = models.CharField(max_length=120)
    barcode = models.CharField(max_length=120, blank=True, null=True)
    inventory_quantity = models.IntegerField(default=0)
    track_inventory = models.BooleanField(default=True)
    allow_backorders = models.BooleanField(default=False)
    shipping_required = models.BooleanField(default=True)
    weight = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)
    status = models.CharField(max_length=20, choices=ProductStatus.choices, default=ProductStatus.DRAFT)
    is_featured = models.BooleanField(default=False)
    seo_title = models.CharField(max_length=255, blank=True, null=True)
    seo_description = models.TextField(blank=True, null=True)
    seo_keywords = models.CharField(max_length=255, blank=True, null=True)
    meta_title = models.CharField(max_length=255, blank=True, null=True)
    meta_description = models.TextField(blank=True, null=True)
    meta_keywords = models.CharField(max_length=255, blank=True, null=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="ecommerce_products_created"
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="ecommerce_products_updated"
    )

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["firm", "slug"],
                condition=models.Q(deleted_at__isnull=True),
                name="uniq_ecom_product_slug_per_firm",
            ),
            models.UniqueConstraint(
                fields=["firm", "sku"],
                condition=models.Q(deleted_at__isnull=True),
                name="uniq_ecom_product_sku_per_firm",
            ),
        ]
        indexes = [
            models.Index(fields=["firm", "status", "created_at"]),
            models.Index(fields=["firm", "collection", "status"]),
            models.Index(fields=["firm", "category", "status"]),
            models.Index(fields=["firm", "is_featured", "status"]),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = generate_unique_slug(Product, self.firm, self.title, instance_id=self.id)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class ProductMediaType(models.TextChoices):
    FEATURE = "FEATURE", "Feature"
    GALLERY = "GALLERY", "Gallery"


class ProductMedia(SoftDeleteModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey(Firm, on_delete=models.CASCADE, related_name="ecommerce_product_media")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="media")
    media_type = models.CharField(max_length=20, choices=ProductMediaType.choices, default=ProductMediaType.GALLERY)
    image = models.FileField(upload_to=product_media_upload_to, max_length=512)
    alt_text = models.CharField(max_length=255, blank=True, null=True)
    sort_order = models.PositiveIntegerField(default=0)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="ecommerce_product_media_uploaded"
    )

    class Meta:
        ordering = ["sort_order", "created_at"]
        indexes = [
            models.Index(fields=["firm", "product", "sort_order"]),
        ]


class ProductTag(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey(Firm, on_delete=models.CASCADE, related_name="ecommerce_product_tags")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="tags")
    name = models.CharField(max_length=80)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["product", "name"], name="uniq_ecom_product_tag_name")
        ]


class ProductAttribute(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="attributes")
    key = models.CharField(max_length=120)
    value = models.CharField(max_length=255)

    class Meta:
        ordering = ["key", "value"]
        constraints = [
            models.UniqueConstraint(fields=["product", "key", "value"], name="uniq_ecom_product_attribute")
        ]


class ProductVariant(SoftDeleteModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey(Firm, on_delete=models.CASCADE, related_name="ecommerce_product_variants")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="variants")
    title = models.CharField(max_length=255)
    sku = models.CharField(max_length=120)
    price_aed = models.DecimalField(max_digits=12, decimal_places=2)
    compare_at_price_aed = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    inventory_quantity = models.IntegerField(default=0)
    barcode = models.CharField(max_length=120, blank=True, null=True)
    weight = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    option_values = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["firm", "sku"],
                condition=models.Q(deleted_at__isnull=True),
                name="uniq_ecom_variant_sku_per_firm",
            )
        ]
        indexes = [
            models.Index(fields=["firm", "product", "is_active"]),
        ]


class CartStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    CONVERTED = "CONVERTED", "Converted"
    ABANDONED = "ABANDONED", "Abandoned"


class Cart(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey(Firm, on_delete=models.CASCADE, related_name="ecommerce_carts")
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True, related_name="ecommerce_carts"
    )
    guest_token = models.CharField(max_length=64, null=True, blank=True, db_index=True)
    currency = models.CharField(max_length=10, default="AED")
    status = models.CharField(max_length=20, choices=CartStatus.choices, default=CartStatus.ACTIVE)
    notes = models.TextField(blank=True, null=True)
    converted_to_order = models.ForeignKey(
        "Order", on_delete=models.SET_NULL, null=True, blank=True, related_name="source_carts"
    )

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["firm", "customer", "status"]),
            models.Index(fields=["firm", "guest_token", "status"]),
        ]


class CartItem(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="cart_items")
    variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE, null=True, blank=True, related_name="cart_items")
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ["created_at"]
        constraints = [
            models.UniqueConstraint(fields=["cart", "product", "variant"], name="uniq_ecom_cart_line")
        ]


class OrderStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    CONFIRMED = "CONFIRMED", "Confirmed"
    PROCESSING = "PROCESSING", "Processing"
    SHIPPED = "SHIPPED", "Shipped"
    DELIVERED = "DELIVERED", "Delivered"
    CANCELLED = "CANCELLED", "Cancelled"


class PaymentStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    COD = "COD", "Cash On Delivery"
    PAID = "PAID", "Paid"
    FAILED = "FAILED", "Failed"
    REFUNDED = "REFUNDED", "Refunded"


class OrderSequence(models.Model):
    firm = models.OneToOneField(Firm, on_delete=models.CASCADE, related_name="ecommerce_order_sequence")
    next_number = models.PositiveIntegerField(default=1001)
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Order(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey(Firm, on_delete=models.CASCADE, related_name="ecommerce_orders")
    order_number = models.CharField(max_length=32, unique=True)
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="ecommerce_orders"
    )
    customer_name = models.CharField(max_length=255)
    customer_email = models.EmailField()
    customer_phone = models.CharField(max_length=50)
    subtotal_aed = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    shipping_amount_aed = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    discount_amount_aed = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    total_amount_aed = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    currency = models.CharField(max_length=10, default="AED")
    order_status = models.CharField(max_length=20, choices=OrderStatus.choices, default=OrderStatus.PENDING)
    payment_status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.COD)
    shipping_method = models.CharField(max_length=120)
    shipping_address = models.JSONField(default=dict)
    notes = models.TextField(blank=True, null=True)
    placed_at = models.DateTimeField(default=timezone.now)
    public_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)

    class Meta:
        ordering = ["-placed_at", "-created_at"]
        indexes = [
            models.Index(fields=["firm", "order_status", "placed_at"]),
            models.Index(fields=["firm", "payment_status", "placed_at"]),
            models.Index(fields=["firm", "customer", "placed_at"]),
            models.Index(fields=["firm", "order_number"]),
        ]


class OrderItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True, related_name="order_items")
    variant = models.ForeignKey(ProductVariant, on_delete=models.SET_NULL, null=True, blank=True, related_name="order_items")
    product_title = models.CharField(max_length=255)
    variant_title = models.CharField(max_length=255, blank=True, null=True)
    sku = models.CharField(max_length=120)
    price_aed = models.DecimalField(max_digits=12, decimal_places=2)
    quantity = models.PositiveIntegerField()
    subtotal_aed = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
