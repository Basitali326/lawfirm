from decimal import Decimal
from uuid import uuid4

from django.db import transaction
from django.db.models import F, Prefetch, Q, Sum
from django.utils import timezone
from rest_framework import serializers

from apps.authx.models import Firm
from apps.cases.utils import get_user_firm
from apps.ecommerce.models import (
    Cart,
    CartItem,
    CartStatus,
    Category,
    Collection,
    Order,
    OrderItem,
    OrderSequence,
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


def resolve_firm(request, *, allow_public=False):
    firm = get_user_firm(getattr(request, "user", None))
    if firm:
        return firm

    firm_id = request.headers.get("X-FIRM-ID") or request.query_params.get("firm_id")
    if firm_id:
        return Firm.objects.filter(id=firm_id).first()

    if allow_public:
        firm_slug = request.query_params.get("firm_slug")
        if firm_slug:
            return Firm.objects.filter(slug=firm_slug).first()
    return None


def pagination_meta(paginator, request):
    return {
        "page": paginator.page.number,
        "page_size": paginator.get_page_size(request),
        "total": paginator.page.paginator.count,
        "total_pages": paginator.page.paginator.num_pages,
        "has_next": paginator.page.has_next(),
        "has_prev": paginator.page.has_previous(),
    }


def product_queryset_for_admin(firm):
    return (
        Product.objects.filter(firm=firm, deleted_at__isnull=True)
        .select_related("collection", "category")
        .prefetch_related(
            Prefetch(
                "media",
                queryset=ProductMedia.objects.filter(deleted_at__isnull=True).order_by("sort_order", "created_at"),
            ),
            "tags",
            "attributes",
            "variants",
        )
    )


def product_queryset_for_store(firm):
    return (
        Product.objects.filter(
            firm=firm,
            deleted_at__isnull=True,
            status=ProductStatus.ACTIVE,
            collection__deleted_at__isnull=True,
            collection__is_active=True,
            category__deleted_at__isnull=True,
            category__is_active=True,
        )
        .select_related("collection", "category")
        .prefetch_related(
            Prefetch(
                "media",
                queryset=ProductMedia.objects.filter(deleted_at__isnull=True).order_by("sort_order", "created_at"),
            ),
            Prefetch(
                "variants",
                queryset=ProductVariant.objects.filter(deleted_at__isnull=True, is_active=True).order_by("created_at"),
            ),
            "tags",
            "attributes",
        )
    )


def update_product_tags_and_attributes(product, tags, attributes):
    if tags is not None:
        ProductTag.objects.filter(product=product).exclude(name__in=tags).delete()
        existing = set(ProductTag.objects.filter(product=product).values_list("name", flat=True))
        ProductTag.objects.bulk_create(
            [ProductTag(firm=product.firm, product=product, name=name) for name in tags if name not in existing],
            ignore_conflicts=True,
        )

    if attributes is not None:
        ProductAttribute.objects.filter(product=product).delete()
        ProductAttribute.objects.bulk_create(
            [
                ProductAttribute(product=product, key=item["key"], value=item["value"])
                for item in attributes
            ]
        )


def get_primary_media(product):
    media = getattr(product, "media", None)
    if hasattr(media, "all"):
        items = [m for m in media.all() if m.deleted_at is None]
    else:
        items = list(ProductMedia.objects.filter(product=product, deleted_at__isnull=True).order_by("sort_order", "created_at"))
    feature = next((item for item in items if item.media_type == ProductMediaType.FEATURE), None)
    return feature or (items[0] if items else None)


def serialize_money(value):
    if value is None:
        return "0.00"
    return f"{Decimal(value):.2f}"


def get_or_create_cart(*, firm, user=None, guest_token=None):
    if user and user.is_authenticated:
        cart = Cart.objects.filter(firm=firm, customer=user, status=CartStatus.ACTIVE).first()
        if cart:
            return cart, None
        return Cart.objects.create(firm=firm, customer=user), None

    token = guest_token or uuid4().hex
    cart = Cart.objects.filter(firm=firm, guest_token=token, status=CartStatus.ACTIVE).first()
    if cart:
        return cart, token
    return Cart.objects.create(firm=firm, guest_token=token), token


def validate_product_purchase_state(product, variant=None):
    if product.deleted_at is not None or product.status != ProductStatus.ACTIVE:
        raise serializers.ValidationError({"product": ["Only active products can be purchased."]})
    if variant:
        if variant.deleted_at is not None or not variant.is_active:
            raise serializers.ValidationError({"variant": ["Only active variants can be purchased."]})
        if variant.product_id != product.id:
            raise serializers.ValidationError({"variant": ["Variant does not belong to product."]})


def available_inventory(product, variant=None):
    if variant:
        return variant.inventory_quantity, product.track_inventory
    return product.inventory_quantity, product.track_inventory


def validate_stock(product, quantity, variant=None):
    available, track_inventory = available_inventory(product, variant)
    if not track_inventory:
        return
    if product.allow_backorders:
        return
    if quantity > available:
        raise serializers.ValidationError({"quantity": ["Insufficient stock."]})


def cart_line_unit_price(product, variant=None):
    return variant.price_aed if variant else product.price_aed


def build_cart_payload(cart, request=None):
    items = []
    subtotal = Decimal("0.00")
    cart_items = (
        cart.items.select_related("product", "variant", "product__collection", "product__category")
        .prefetch_related("product__media")
        .order_by("created_at")
    )
    for item in cart_items:
        product = item.product
        variant = item.variant
        unit_price = cart_line_unit_price(product, variant)
        line_subtotal = unit_price * item.quantity
        subtotal += line_subtotal
        primary_media = get_primary_media(product)
        feature_image = None
        if primary_media and primary_media.image:
            feature_image = request.build_absolute_uri(primary_media.image.url) if request else primary_media.image.url
        items.append(
            {
                "id": str(item.id),
                "product_id": str(product.id),
                "variant_id": str(variant.id) if variant else None,
                "title": product.title,
                "variant_title": variant.title if variant else None,
                "sku": variant.sku if variant else product.sku,
                "quantity": item.quantity,
                "price_aed": serialize_money(unit_price),
                "subtotal_aed": serialize_money(line_subtotal),
                "feature_image": feature_image,
                "inventory_quantity": variant.inventory_quantity if variant else product.inventory_quantity,
            }
        )
    return {
        "id": str(cart.id),
        "currency": cart.currency,
        "status": cart.status,
        "guest_token": cart.guest_token,
        "items": items,
        "subtotal_aed": serialize_money(subtotal),
        "items_count": len(items),
        "updated_at": cart.updated_at,
    }


def add_item_to_cart(*, cart, product, quantity, variant=None):
    validate_product_purchase_state(product, variant)
    validate_stock(product, quantity, variant)
    item, created = CartItem.objects.get_or_create(
        cart=cart,
        product=product,
        variant=variant,
        defaults={"quantity": quantity},
    )
    if not created:
        new_quantity = item.quantity + quantity
        validate_stock(product, new_quantity, variant)
        item.quantity = new_quantity
        item.save(update_fields=["quantity", "updated_at"])
    return item


def update_cart_item_quantity(item, quantity):
    validate_product_purchase_state(item.product, item.variant)
    validate_stock(item.product, quantity, item.variant)
    item.quantity = quantity
    item.save(update_fields=["quantity", "updated_at"])
    return item


@transaction.atomic
def next_order_number(firm):
    sequence, _ = OrderSequence.objects.select_for_update().get_or_create(firm=firm, defaults={"next_number": 1001})
    number = sequence.next_number
    sequence.next_number = number + 1
    sequence.save(update_fields=["next_number", "updated_at"])
    return f"ORD-{number}"


def serialize_order(order):
    return {
        "id": str(order.id),
        "order_number": order.order_number,
        "customer_name": order.customer_name,
        "customer_email": order.customer_email,
        "customer_phone": order.customer_phone,
        "subtotal_aed": serialize_money(order.subtotal_aed),
        "shipping_amount_aed": serialize_money(order.shipping_amount_aed),
        "discount_amount_aed": serialize_money(order.discount_amount_aed),
        "total_amount_aed": serialize_money(order.total_amount_aed),
        "currency": order.currency,
        "order_status": order.order_status,
        "payment_status": order.payment_status,
        "shipping_method": order.shipping_method,
        "shipping_address": order.shipping_address,
        "notes": order.notes,
        "placed_at": order.placed_at,
        "created_at": order.created_at,
        "updated_at": order.updated_at,
        "public_token": str(order.public_token),
        "items": [
            {
                "id": str(item.id),
                "product_id": str(item.product_id) if item.product_id else None,
                "variant_id": str(item.variant_id) if item.variant_id else None,
                "product_title": item.product_title,
                "variant_title": item.variant_title,
                "sku": item.sku,
                "price_aed": serialize_money(item.price_aed),
                "quantity": item.quantity,
                "subtotal_aed": serialize_money(item.subtotal_aed),
            }
            for item in order.items.all().order_by("created_at")
        ],
    }


@transaction.atomic
def place_order_from_cart(*, cart, payload, customer=None):
    items = list(
        cart.items.select_related("product", "variant", "product__firm").select_for_update().order_by("created_at")
    )
    if not items:
        raise serializers.ValidationError({"cart": ["Order cannot be placed with an empty cart."]})

    subtotal = Decimal("0.00")
    order_items = []
    for cart_item in items:
        product = Product.objects.select_for_update().get(id=cart_item.product_id)
        variant = None
        if cart_item.variant_id:
            variant = ProductVariant.objects.select_for_update().get(id=cart_item.variant_id)
        validate_product_purchase_state(product, variant)
        validate_stock(product, cart_item.quantity, variant)
        unit_price = cart_line_unit_price(product, variant)
        line_total = unit_price * cart_item.quantity
        subtotal += line_total
        order_items.append(
            OrderItem(
                product=product,
                variant=variant,
                product_title=product.title,
                variant_title=variant.title if variant else None,
                sku=variant.sku if variant else product.sku,
                price_aed=unit_price,
                quantity=cart_item.quantity,
                subtotal_aed=line_total,
            )
        )

    shipping_amount = Decimal(payload.get("shipping_amount_aed") or "0")
    discount_amount = Decimal(payload.get("discount_amount_aed") or "0")
    total = subtotal + shipping_amount - discount_amount
    if total < 0:
        raise serializers.ValidationError({"discount_amount_aed": ["Discount cannot exceed order total."]})

    order = Order.objects.create(
        firm=cart.firm,
        order_number=next_order_number(cart.firm),
        customer=customer if getattr(customer, "is_authenticated", False) else None,
        customer_name=f'{payload["first_name"]} {payload["last_name"]}'.strip(),
        customer_email=payload["email"],
        customer_phone=payload["phone"],
        subtotal_aed=subtotal,
        shipping_amount_aed=shipping_amount,
        discount_amount_aed=discount_amount,
        total_amount_aed=total,
        currency="AED",
        order_status=OrderStatus.PENDING,
        payment_status=PaymentStatus.COD,
        shipping_method=payload["shipping_method"],
        shipping_address={
            "first_name": payload["first_name"],
            "last_name": payload["last_name"],
            "email": payload["email"],
            "phone": payload["phone"],
            "country": payload["country"],
            "city": payload["city"],
            "area": payload["area"],
            "address_line_1": payload["address_line_1"],
            "address_line_2": payload.get("address_line_2"),
            "postal_code": payload.get("postal_code"),
        },
        notes=payload.get("notes"),
        placed_at=timezone.now(),
    )
    for item in order_items:
        item.order = order
    OrderItem.objects.bulk_create(order_items)

    for cart_item in items:
        if cart_item.variant_id:
            ProductVariant.objects.filter(id=cart_item.variant_id).update(
                inventory_quantity=F("inventory_quantity") - cart_item.quantity
            )
        else:
            Product.objects.filter(id=cart_item.product_id).update(
                inventory_quantity=F("inventory_quantity") - cart_item.quantity
            )

    cart.status = CartStatus.CONVERTED
    cart.converted_to_order = order
    cart.save(update_fields=["status", "converted_to_order", "updated_at"])
    cart.items.all().delete()
    return order
