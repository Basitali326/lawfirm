from rest_framework import serializers

from apps.ecommerce.models import Seller

from .models import Article, ArticleCategory, Certification, Ebook, EbookPurchase


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
        extra_kwargs = {"image": {"write_only": True, "required": False}}

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
