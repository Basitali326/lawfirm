from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from apps.ecommerce.models import (
    Category,
    Collection,
    OrderStatus,
    PaymentStatus,
    Product,
    ProductAttribute,
    ProductMedia,
    ProductMediaType,
    ProductStatus,
    ProductTag,
    ProductVariant,
)
from apps.ecommerce.services import (
    get_primary_media,
    serialize_money,
    update_product_tags_and_attributes,
)
from apps.ecommerce.validators import validate_product_media_file


class CollectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Collection
        fields = ["id", "title", "slug", "description", "is_active", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_title(self, value):
        if not value.strip():
            raise serializers.ValidationError("Title is required.")
        return value.strip()


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug", "description", "is_active", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_name(self, value):
        if not value.strip():
            raise serializers.ValidationError("Name is required.")
        return value.strip()


class ProductTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductTag
        fields = ["id", "name"]
        read_only_fields = ["id"]


class ProductAttributeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductAttribute
        fields = ["id", "key", "value"]
        read_only_fields = ["id"]


class ProductMediaSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ProductMedia
        fields = [
            "id",
            "media_type",
            "image",
            "image_url",
            "alt_text",
            "sort_order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "image_url"]

    def get_image_url(self, obj):
        request = self.context.get("request")
        if not obj.image:
            return None
        return request.build_absolute_uri(obj.image.url) if request else obj.image.url


class ProductMediaUploadSerializer(serializers.Serializer):
    image = serializers.FileField(required=True, validators=[validate_product_media_file])
    media_type = serializers.ChoiceField(choices=ProductMediaType.choices, required=False, default=ProductMediaType.GALLERY)
    alt_text = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=255)
    sort_order = serializers.IntegerField(required=False, min_value=0, default=0)


class ProductMediaReorderSerializer(serializers.Serializer):
    items = serializers.ListField(child=serializers.DictField(), allow_empty=False)

    def validate(self, attrs):
        for item in attrs["items"]:
            if "id" not in item or "sort_order" not in item:
                raise serializers.ValidationError({"items": ["Each item must include id and sort_order."]})
        return attrs


class ProductVariantSerializer(serializers.ModelSerializer):
    price_aed = serializers.DecimalField(max_digits=12, decimal_places=2)
    compare_at_price_aed = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)

    class Meta:
        model = ProductVariant
        fields = [
            "id",
            "title",
            "sku",
            "price_aed",
            "compare_at_price_aed",
            "inventory_quantity",
            "barcode",
            "weight",
            "is_active",
            "option_values",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_price_aed(self, value):
        if value < Decimal("0"):
            raise serializers.ValidationError("Price must be >= 0.")
        return value

    def validate_inventory_quantity(self, value):
        if value < 0:
            raise serializers.ValidationError("Inventory must be >= 0.")
        return value


class ProductListSerializer(serializers.ModelSerializer):
    category = serializers.CharField(source="category.name", read_only=True)
    collection = serializers.CharField(source="collection.title", read_only=True)
    feature_image = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "feature_image",
            "title",
            "category",
            "collection",
            "price_aed",
            "inventory_quantity",
            "status",
            "created_at",
            "updated_at",
        ]

    def get_feature_image(self, obj):
        media = get_primary_media(obj)
        if not media or not media.image:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(media.image.url) if request else media.image.url


class ProductDetailSerializer(serializers.ModelSerializer):
    tags = serializers.SerializerMethodField()
    attributes = serializers.SerializerMethodField()
    variants = serializers.SerializerMethodField()
    media = serializers.SerializerMethodField()
    feature_image = serializers.SerializerMethodField()
    collection_detail = serializers.SerializerMethodField()
    category_detail = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "title",
            "slug",
            "short_description",
            "description",
            "category",
            "collection",
            "collection_detail",
            "category_detail",
            "vendor",
            "product_type",
            "price_aed",
            "compare_at_price_aed",
            "cost_per_item",
            "sku",
            "barcode",
            "inventory_quantity",
            "track_inventory",
            "allow_backorders",
            "shipping_required",
            "weight",
            "status",
            "is_featured",
            "feature_image",
            "seo_title",
            "seo_description",
            "seo_keywords",
            "meta_title",
            "meta_description",
            "meta_keywords",
            "tags",
            "attributes",
            "variants",
            "media",
            "created_at",
            "updated_at",
            "deleted_at",
        ]

    def get_feature_image(self, obj):
        media = get_primary_media(obj)
        if not media or not media.image:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(media.image.url) if request else media.image.url

    def get_tags(self, obj):
        return [tag.name for tag in obj.tags.all().order_by("name")]

    def get_attributes(self, obj):
        return ProductAttributeSerializer(obj.attributes.all().order_by("key", "value"), many=True).data

    def get_variants(self, obj):
        variants = obj.variants.filter(deleted_at__isnull=True)
        return ProductVariantSerializer(variants, many=True).data

    def get_media(self, obj):
        media = obj.media.filter(deleted_at__isnull=True)
        return ProductMediaSerializer(media, many=True, context=self.context).data

    def get_collection_detail(self, obj):
        collection = obj.collection
        return {"id": str(collection.id), "title": collection.title, "slug": collection.slug}

    def get_category_detail(self, obj):
        category = obj.category
        return {"id": str(category.id), "name": category.name, "slug": category.slug}


class ProductWriteSerializer(serializers.ModelSerializer):
    tags = serializers.ListField(child=serializers.CharField(max_length=80), required=False)
    attributes = ProductAttributeSerializer(many=True, required=False)

    class Meta:
        model = Product
        fields = [
            "id",
            "title",
            "slug",
            "short_description",
            "description",
            "category",
            "collection",
            "vendor",
            "product_type",
            "price_aed",
            "compare_at_price_aed",
            "cost_per_item",
            "sku",
            "barcode",
            "inventory_quantity",
            "track_inventory",
            "allow_backorders",
            "shipping_required",
            "weight",
            "status",
            "is_featured",
            "seo_title",
            "seo_description",
            "seo_keywords",
            "meta_title",
            "meta_description",
            "meta_keywords",
            "tags",
            "attributes",
        ]
        read_only_fields = ["id"]

    def validate_title(self, value):
        if not value.strip():
            raise serializers.ValidationError("Product title is required.")
        return value.strip()

    def validate_price_aed(self, value):
        if value < Decimal("0"):
            raise serializers.ValidationError("Price must be >= 0.")
        return value

    def validate_inventory_quantity(self, value):
        if value < 0:
            raise serializers.ValidationError("Inventory must be >= 0.")
        return value

    def validate(self, attrs):
        collection = attrs.get("collection") or getattr(self.instance, "collection", None)
        category = attrs.get("category") or getattr(self.instance, "category", None)
        if not collection:
            raise serializers.ValidationError({"collection": ["Collection is required."]})
        if not category:
            raise serializers.ValidationError({"category": ["Category is required."]})
        if collection.deleted_at is not None or not collection.is_active:
            raise serializers.ValidationError({"collection": ["Collection must be active."]})
        if category.deleted_at is not None or not category.is_active:
            raise serializers.ValidationError({"category": ["Category must be active."]})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        tags = validated_data.pop("tags", [])
        attributes = validated_data.pop("attributes", [])
        request = self.context["request"]
        product = Product.objects.create(
            firm=self.context["firm"],
            created_by=request.user,
            updated_by=request.user,
            **validated_data,
        )
        update_product_tags_and_attributes(product, tags, attributes)
        return product

    @transaction.atomic
    def update(self, instance, validated_data):
        tags = validated_data.pop("tags", None)
        attributes = validated_data.pop("attributes", None)
        request = self.context["request"]
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.updated_by = request.user
        instance.save()
        update_product_tags_and_attributes(instance, tags, attributes)
        return instance


class CartItemInputSerializer(serializers.Serializer):
    product_id = serializers.UUIDField(required=True)
    variant_id = serializers.UUIDField(required=False, allow_null=True)
    quantity = serializers.IntegerField(required=False, min_value=1, default=1)


class CartItemUpdateSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(required=True, min_value=1)


class CheckoutSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=120)
    last_name = serializers.CharField(max_length=120)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=50)
    country = serializers.CharField(max_length=120)
    city = serializers.CharField(max_length=120)
    area = serializers.CharField(max_length=120)
    address_line_1 = serializers.CharField(max_length=255)
    address_line_2 = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=255)
    postal_code = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=50)
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    shipping_method = serializers.CharField(max_length=120)
    payment_method = serializers.ChoiceField(choices=[("COD", "COD")], default="COD")
    shipping_amount_aed = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=Decimal("0.00"))
    discount_amount_aed = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=Decimal("0.00"))


class OrderListSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    order_number = serializers.CharField()
    customer = serializers.CharField(source="customer_name")
    date = serializers.DateTimeField(source="placed_at")
    total = serializers.SerializerMethodField()
    order_status = serializers.CharField()
    payment_status = serializers.CharField()
    shipping_method = serializers.CharField()

    def get_total(self, obj):
        return serialize_money(obj.total_amount_aed)


class OrderStatusUpdateSerializer(serializers.Serializer):
    order_status = serializers.ChoiceField(choices=OrderStatus.choices)


class OrderPaymentStatusUpdateSerializer(serializers.Serializer):
    payment_status = serializers.ChoiceField(choices=PaymentStatus.choices)
