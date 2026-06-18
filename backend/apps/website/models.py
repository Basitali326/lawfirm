import uuid
from pathlib import Path

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.authx.models import Firm
from apps.ecommerce.models import Seller, SoftDeleteModel, TimeStampedModel, generate_unique_slug


def website_upload_to(instance, filename):
    suffix = Path(filename or "").suffix.lower()
    model_name = instance.__class__.__name__.lower()
    return f"firms/{instance.firm_id}/website/{model_name}/{uuid.uuid4().hex}{suffix}"


class PublishStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    PUBLISHED = "PUBLISHED", "Published"


class Ebook(SoftDeleteModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey(Firm, on_delete=models.CASCADE, related_name="ebooks")
    seller = models.ForeignKey(Seller, on_delete=models.SET_NULL, null=True, blank=True, related_name="ebooks")
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255)
    subtitle = models.CharField(max_length=255, blank=True)
    author = models.CharField(max_length=255)
    short_description = models.CharField(max_length=500, blank=True)
    description = models.TextField()
    price_aed = models.DecimalField(max_digits=12, decimal_places=2)
    cover_image = models.ImageField(upload_to=website_upload_to, blank=True, null=True)
    ebook_file = models.FileField(upload_to=website_upload_to, blank=True, null=True)
    pages = models.PositiveIntegerField(default=0)
    isbn = models.CharField(max_length=50, blank=True)
    status = models.CharField(max_length=20, choices=PublishStatus.choices, default=PublishStatus.DRAFT)
    is_featured = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["firm", "slug"],
                condition=models.Q(deleted_at__isnull=True),
                name="uniq_ebook_slug_per_firm",
            )
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = generate_unique_slug(Ebook, self.firm, self.title, instance_id=self.id)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class Certification(SoftDeleteModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey(Firm, on_delete=models.CASCADE, related_name="certifications")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to=website_upload_to, blank=True, null=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["sort_order", "-created_at"]

    def __str__(self):
        return self.title


class ArticleCategory(SoftDeleteModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey(Firm, on_delete=models.CASCADE, related_name="article_categories")
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["firm", "slug"],
                condition=models.Q(deleted_at__isnull=True),
                name="uniq_article_category_slug_per_firm",
            )
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = generate_unique_slug(ArticleCategory, self.firm, self.name, instance_id=self.id)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Article(SoftDeleteModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey(Firm, on_delete=models.CASCADE, related_name="articles")
    category = models.ForeignKey(ArticleCategory, on_delete=models.PROTECT, related_name="articles")
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255)
    excerpt = models.CharField(max_length=500)
    content = models.TextField()
    featured_image = models.ImageField(upload_to=website_upload_to, blank=True, null=True)
    author_name = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=PublishStatus.choices, default=PublishStatus.DRAFT)
    published_at = models.DateTimeField(blank=True, null=True)
    seo_title = models.CharField(max_length=255, blank=True)
    seo_description = models.CharField(max_length=500, blank=True)
    is_featured = models.BooleanField(default=False)

    class Meta:
        ordering = ["-published_at", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["firm", "slug"],
                condition=models.Q(deleted_at__isnull=True),
                name="uniq_article_slug_per_firm",
            )
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = generate_unique_slug(Article, self.firm, self.title, instance_id=self.id)
        if self.status == PublishStatus.PUBLISHED and not self.published_at:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class EbookPurchaseStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    PAID = "PAID", "Paid"
    FAILED = "FAILED", "Failed"
    REFUNDED = "REFUNDED", "Refunded"


class EbookPurchase(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey(Firm, on_delete=models.CASCADE, related_name="ebook_purchases")
    ebook = models.ForeignKey(Ebook, on_delete=models.PROTECT, related_name="purchases")
    seller = models.ForeignKey(Seller, on_delete=models.SET_NULL, null=True, blank=True, related_name="ebook_sales")
    buyer_name = models.CharField(max_length=255)
    buyer_email = models.EmailField()
    amount_aed = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=EbookPurchaseStatus.choices, default=EbookPurchaseStatus.PENDING)
    stripe_checkout_session_id = models.CharField(max_length=255, blank=True, db_index=True)
    stripe_payment_intent_id = models.CharField(max_length=255, blank=True)
    download_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    download_count = models.PositiveIntegerField(default=0)
    paid_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.ebook.title} — {self.buyer_email}"
