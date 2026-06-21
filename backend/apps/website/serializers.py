from rest_framework import serializers

from apps.ecommerce.models import Seller

from .models import (
    Appointment,
    AppointmentReview,
    AppointmentType,
    Article,
    ArticleCategory,
    Certification,
    Ebook,
    EbookPurchase,
    LawyerAvailability,
    LawyerOffDay,
    LegalService,
    ReviewStatus,
)


class AbsoluteFileMixin:
    def absolute_file(self, obj, field_name):
        file_field = getattr(obj, field_name, None)
        if not file_field:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(file_field.url) if request else file_field.url


class SellerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Seller
        fields = [
            "id", "name", "email", "phone", "company_name",
            "commission_percent", "is_active", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class EbookSerializer(AbsoluteFileMixin, serializers.ModelSerializer):
    cover_image_url = serializers.SerializerMethodField()
    ebook_file_name = serializers.SerializerMethodField()
    has_ebook_file = serializers.SerializerMethodField()
    seller_name = serializers.CharField(source="seller.name", read_only=True)

    class Meta:
        model = Ebook
        fields = [
            "id", "seller", "seller_name", "title", "slug", "subtitle", "author",
            "short_description", "description", "price_aed", "cover_image",
            "cover_image_url", "ebook_file", "ebook_file_name", "has_ebook_file",
            "pages", "isbn", "status",
            "is_featured", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "slug", "cover_image_url", "ebook_file_name",
            "has_ebook_file", "created_at", "updated_at",
        ]
        extra_kwargs = {
            "cover_image": {"write_only": True, "required": False},
            "ebook_file": {"write_only": True, "required": False},
        }

    def get_cover_image_url(self, obj):
        return self.absolute_file(obj, "cover_image")

    def get_ebook_file_name(self, obj):
        if not obj.ebook_file:
            return None
        return obj.ebook_file.name.rsplit("/", 1)[-1]

    def get_has_ebook_file(self, obj):
        return bool(obj.ebook_file)


class CertificationSerializer(AbsoluteFileMixin, serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Certification
        fields = [
            "id", "title", "description", "image", "image_url", "sort_order",
            "is_active", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "image_url", "created_at", "updated_at"]
        extra_kwargs = {
            "image": {"write_only": True, "required": False},
            "lawyer": {"required": False},
            "case_type": {"required": False, "allow_null": True},
        }

    def get_image_url(self, obj):
        return self.absolute_file(obj, "image")


class ArticleCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ArticleCategory
        fields = ["id", "name", "slug", "description", "is_active", "created_at", "updated_at"]
        read_only_fields = ["id", "slug", "created_at", "updated_at"]


class ArticleSerializer(AbsoluteFileMixin, serializers.ModelSerializer):
    featured_image_url = serializers.SerializerMethodField()
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_slug = serializers.CharField(source="category.slug", read_only=True)

    class Meta:
        model = Article
        fields = [
            "id", "category", "category_name", "category_slug", "title", "slug",
            "excerpt", "content", "featured_image", "featured_image_url", "author_name",
            "status", "published_at", "seo_title", "seo_description", "is_featured",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "slug", "featured_image_url", "created_at", "updated_at"]
        extra_kwargs = {"featured_image": {"write_only": True, "required": False}}

    def get_featured_image_url(self, obj):
        return self.absolute_file(obj, "featured_image")


class EbookPurchaseSerializer(serializers.ModelSerializer):
    ebook_title = serializers.CharField(source="ebook.title", read_only=True)
    seller_name = serializers.CharField(source="seller.name", read_only=True)

    class Meta:
        model = EbookPurchase
        fields = [
            "id", "ebook", "ebook_title", "seller", "seller_name", "buyer_name",
            "buyer_email", "amount_aed", "status", "stripe_checkout_session_id",
            "stripe_payment_intent_id", "download_count", "paid_at", "created_at",
        ]
        read_only_fields = fields


class EbookCheckoutSerializer(serializers.Serializer):
    ebook_id = serializers.UUIDField()
    buyer_name = serializers.CharField(max_length=255)
    buyer_email = serializers.EmailField()


class LegalServiceSerializer(AbsoluteFileMixin, serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    lawyer_name = serializers.SerializerMethodField()
    lawyer_email = serializers.EmailField(source="lawyer.email", read_only=True)
    case_type_name = serializers.CharField(source="case_type.name", read_only=True)
    reviews = serializers.SerializerMethodField()

    class Meta:
        model = LegalService
        fields = [
            "id", "lawyer", "lawyer_name", "lawyer_email", "case_type",
            "case_type_name", "title", "slug", "short_description", "description",
            "how_we_help", "price_aed", "duration_minutes", "experience_years",
            "rating", "reviews_count", "city", "languages", "image", "image_url",
            "supports_online", "supports_physical", "status", "is_featured",
            "sort_order", "reviews", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "slug", "lawyer_name", "lawyer_email", "case_type_name",
            "image_url", "created_at", "updated_at",
        ]
        extra_kwargs = {"image": {"write_only": True, "required": False}}

    def get_image_url(self, obj):
        return self.absolute_file(obj, "image")

    def get_lawyer_name(self, obj):
        name = obj.lawyer.get_full_name().strip()
        return name or obj.lawyer.email

    def get_reviews(self, obj):
        reviews = obj.client_reviews.filter(status=ReviewStatus.APPROVED)[:12]
        return PublicAppointmentReviewSerializer(reviews, many=True).data


class LawyerAvailabilitySerializer(serializers.ModelSerializer):
    lawyer_name = serializers.SerializerMethodField()
    weekday_name = serializers.CharField(source="get_weekday_display", read_only=True)

    class Meta:
        model = LawyerAvailability
        fields = [
            "id", "lawyer", "lawyer_name", "weekday", "weekday_name",
            "start_time", "end_time", "slot_duration_minutes", "is_active",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "lawyer_name", "weekday_name", "created_at", "updated_at"]
        extra_kwargs = {"lawyer": {"required": False}}

    def get_lawyer_name(self, obj):
        return obj.lawyer.get_full_name().strip() or obj.lawyer.email

    def validate(self, attrs):
        start = attrs.get("start_time", getattr(self.instance, "start_time", None))
        end = attrs.get("end_time", getattr(self.instance, "end_time", None))
        if start and end and start >= end:
            raise serializers.ValidationError({"end_time": "End time must be after start time."})
        return attrs


class LawyerOffDaySerializer(serializers.ModelSerializer):
    lawyer_name = serializers.SerializerMethodField()

    class Meta:
        model = LawyerOffDay
        fields = [
            "id", "lawyer", "lawyer_name", "date", "reason", "is_all_day",
            "start_time", "end_time", "is_active", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "lawyer_name", "created_at", "updated_at"]
        extra_kwargs = {"lawyer": {"required": False}}

    def get_lawyer_name(self, obj):
        return obj.lawyer.get_full_name().strip() or obj.lawyer.email

    def validate(self, attrs):
        all_day = attrs.get("is_all_day", getattr(self.instance, "is_all_day", True))
        start = attrs.get("start_time", getattr(self.instance, "start_time", None))
        end = attrs.get("end_time", getattr(self.instance, "end_time", None))
        if not all_day and (not start or not end):
            raise serializers.ValidationError("Start and end time are required for a partial off day.")
        if start and end and start >= end:
            raise serializers.ValidationError({"end_time": "End time must be after start time."})
        return attrs


class AppointmentSerializer(serializers.ModelSerializer):
    service_title = serializers.CharField(source="service.title", read_only=True)
    lawyer_name = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = [
            "id", "service", "service_title", "lawyer", "lawyer_name",
            "client_name", "client_email", "client_phone", "message",
            "appointment_type", "appointment_date", "start_time", "end_time",
            "amount_aed", "status", "payment_status", "stripe_checkout_session_id",
            "stripe_payment_intent_id", "meeting_provider", "meeting_url",
            "paid_at", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "service", "service_title", "lawyer", "lawyer_name",
            "client_name", "client_email", "client_phone", "message",
            "appointment_type", "appointment_date", "start_time", "end_time",
            "amount_aed", "payment_status", "stripe_checkout_session_id",
            "stripe_payment_intent_id", "paid_at", "created_at", "updated_at",
        ]

    def get_lawyer_name(self, obj):
        return obj.lawyer.get_full_name().strip() or obj.lawyer.email


class AppointmentCheckoutSerializer(serializers.Serializer):
    service_id = serializers.UUIDField()
    client_name = serializers.CharField(max_length=255)
    client_email = serializers.EmailField()
    client_phone = serializers.CharField(max_length=50)
    message = serializers.CharField(required=False, allow_blank=True)
    appointment_type = serializers.ChoiceField(choices=AppointmentType.choices)
    appointment_date = serializers.DateField()
    start_time = serializers.TimeField()


class PublicAppointmentReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppointmentReview
        fields = ["id", "client_name", "rating", "comment", "is_sample", "created_at"]
        read_only_fields = fields


class AppointmentReviewSubmitSerializer(serializers.Serializer):
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(min_length=10, max_length=2000)


class AppointmentReviewAdminSerializer(serializers.ModelSerializer):
    service_title = serializers.CharField(source="service.title", read_only=True)
    appointment_date = serializers.DateField(source="appointment.appointment_date", read_only=True)
    client_email = serializers.EmailField(source="appointment.client_email", read_only=True)

    class Meta:
        model = AppointmentReview
        fields = [
            "id", "service", "service_title", "appointment", "appointment_date",
            "client_name", "client_email", "rating", "comment", "status",
            "is_sample", "approved_at", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "service", "service_title", "appointment", "appointment_date",
            "client_name", "client_email", "rating", "comment", "approved_at",
            "is_sample", "created_at", "updated_at",
        ]
