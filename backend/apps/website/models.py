import uuid
from pathlib import Path

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.authx.models import Firm
from apps.casetypes.models import CaseType
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


class LegalService(SoftDeleteModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey(Firm, on_delete=models.CASCADE, related_name="legal_services")
    lawyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="legal_services",
    )
    case_type = models.ForeignKey(
        CaseType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="website_services",
    )
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255)
    short_description = models.CharField(max_length=500)
    description = models.TextField()
    how_we_help = models.TextField()
    price_aed = models.DecimalField(max_digits=12, decimal_places=2)
    duration_minutes = models.PositiveIntegerField(default=60)
    experience_years = models.PositiveIntegerField(default=0)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    reviews_count = models.PositiveIntegerField(default=0)
    city = models.CharField(max_length=120, default="Sharjah")
    languages = models.CharField(max_length=255, blank=True, default="Arabic, English")
    image = models.ImageField(upload_to=website_upload_to, blank=True, null=True)
    supports_online = models.BooleanField(default=True)
    supports_physical = models.BooleanField(default=True)
    status = models.CharField(max_length=20, choices=PublishStatus.choices, default=PublishStatus.DRAFT)
    is_featured = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "-is_featured", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["firm", "slug"],
                condition=models.Q(deleted_at__isnull=True),
                name="uniq_legal_service_slug_per_firm",
            )
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = generate_unique_slug(LegalService, self.firm, self.title, instance_id=self.id)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class LawyerAvailability(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey(Firm, on_delete=models.CASCADE, related_name="lawyer_availability")
    lawyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="weekly_availability",
    )
    weekday = models.PositiveSmallIntegerField(
        choices=[
            (0, "Monday"),
            (1, "Tuesday"),
            (2, "Wednesday"),
            (3, "Thursday"),
            (4, "Friday"),
            (5, "Saturday"),
            (6, "Sunday"),
        ]
    )
    start_time = models.TimeField(default="09:00")
    end_time = models.TimeField(default="17:00")
    slot_duration_minutes = models.PositiveIntegerField(default=60)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["lawyer_id", "weekday", "start_time"]
        constraints = [
            models.UniqueConstraint(
                fields=["firm", "lawyer", "weekday", "start_time"],
                name="uniq_lawyer_availability_window",
            )
        ]

    def __str__(self):
        return f"{self.lawyer} - {self.get_weekday_display()}"


class LawyerOffDay(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey(Firm, on_delete=models.CASCADE, related_name="lawyer_off_days")
    lawyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="off_days",
    )
    date = models.DateField()
    reason = models.CharField(max_length=255, blank=True)
    is_all_day = models.BooleanField(default=True)
    start_time = models.TimeField(blank=True, null=True)
    end_time = models.TimeField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-date"]
        constraints = [
            models.UniqueConstraint(
                fields=["firm", "lawyer", "date", "start_time"],
                name="uniq_lawyer_off_period",
            )
        ]

    def __str__(self):
        return f"{self.lawyer} - {self.date}"


class AppointmentStatus(models.TextChoices):
    PENDING_PAYMENT = "PENDING_PAYMENT", "Pending payment"
    CONFIRMED = "CONFIRMED", "Confirmed"
    COMPLETED = "COMPLETED", "Completed"
    CANCELLED = "CANCELLED", "Cancelled"


class AppointmentType(models.TextChoices):
    ONLINE = "ONLINE", "Online"
    PHYSICAL = "PHYSICAL", "Physical"


class Appointment(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey(Firm, on_delete=models.CASCADE, related_name="appointments")
    service = models.ForeignKey(LegalService, on_delete=models.PROTECT, related_name="appointments")
    lawyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="legal_appointments",
    )
    client_name = models.CharField(max_length=255)
    client_email = models.EmailField()
    client_phone = models.CharField(max_length=50)
    message = models.TextField(blank=True)
    appointment_type = models.CharField(max_length=20, choices=AppointmentType.choices)
    appointment_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    amount_aed = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(
        max_length=30,
        choices=AppointmentStatus.choices,
        default=AppointmentStatus.PENDING_PAYMENT,
    )
    payment_status = models.CharField(
        max_length=20,
        choices=EbookPurchaseStatus.choices,
        default=EbookPurchaseStatus.PENDING,
    )
    stripe_checkout_session_id = models.CharField(max_length=255, blank=True, db_index=True)
    stripe_payment_intent_id = models.CharField(max_length=255, blank=True)
    meeting_provider = models.CharField(max_length=50, blank=True)
    meeting_url = models.URLField(blank=True)
    paid_at = models.DateTimeField(blank=True, null=True)
    confirmation_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)

    class Meta:
        ordering = ["-appointment_date", "-start_time"]
        indexes = [
            models.Index(fields=["lawyer", "appointment_date", "start_time"]),
            models.Index(fields=["firm", "status"]),
        ]

    def __str__(self):
        return f"{self.client_name} - {self.service.title} - {self.appointment_date}"
