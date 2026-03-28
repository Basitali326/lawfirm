from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView

from apps.ecommerce.models import (
    Category,
    Collection,
    Order,
    Product,
    ProductMedia,
    ProductMediaType,
    ProductVariant,
)
from apps.ecommerce.pagination import EcommercePagination
from apps.ecommerce.permissions import IsAdminStaffOrSuperAdmin
from apps.ecommerce.serializers import (
    CartItemInputSerializer,
    CartItemUpdateSerializer,
    CategorySerializer,
    CheckoutSerializer,
    CollectionSerializer,
    OrderListSerializer,
    OrderPaymentStatusUpdateSerializer,
    OrderStatusUpdateSerializer,
    ProductDetailSerializer,
    ProductListSerializer,
    ProductMediaReorderSerializer,
    ProductMediaSerializer,
    ProductMediaUploadSerializer,
    ProductVariantSerializer,
    ProductWriteSerializer,
)
from apps.ecommerce.services import (
    add_item_to_cart,
    build_cart_payload,
    get_or_create_cart,
    pagination_meta,
    place_order_from_cart,
    product_queryset_for_admin,
    product_queryset_for_store,
    resolve_firm,
    serialize_order,
    update_cart_item_quantity,
)
from apps.rbac.permissions import HasRBACPermission
from core.responses import api_error, api_success


class EcommerceAdminMixin:
    permission_classes = [IsAuthenticated, IsAdminStaffOrSuperAdmin]
    pagination_class = EcommercePagination

    def get_firm(self):
        firm = resolve_firm(self.request)
        if not firm:
            raise ValueError("Firm context not found.")
        return firm

    def paginate_payload(self, queryset, serializer_cls):
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, self.request, view=self)
        serializer = serializer_cls(page or queryset, many=True, context={"request": self.request})
        if page is None:
            return serializer.data, {
                "page": 1,
                "page_size": len(serializer.data),
                "total": len(serializer.data),
                "total_pages": 1,
                "has_next": False,
                "has_prev": False,
            }
        return serializer.data, pagination_meta(paginator, self.request)


class CollectionViewSet(EcommerceAdminMixin, viewsets.ModelViewSet):
    serializer_class = CollectionSerializer
    permission_classes = [IsAuthenticated, HasRBACPermission.with_perms(["collections.view"])]

    def get_permissions(self):
        if self.action == "create":
            self.permission_classes = [IsAuthenticated, HasRBACPermission.with_perms(["collections.add"])]
        elif self.action in {"update", "partial_update"}:
            self.permission_classes = [IsAuthenticated, HasRBACPermission.with_perms(["collections.update"])]
        elif self.action == "destroy":
            self.permission_classes = [IsAuthenticated, HasRBACPermission.with_perms(["collections.delete"])]
        return [permission() for permission in self.permission_classes]

    def get_queryset(self):
        return Collection.objects.filter(firm=self.get_firm(), deleted_at__isnull=True).order_by("title")

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        search = (request.query_params.get("search") or "").strip()
        if search:
            queryset = queryset.filter(Q(title__icontains=search) | Q(slug__icontains=search))
        data, meta = self.paginate_payload(queryset, self.serializer_class)
        return api_success("Collections retrieved", data=data, meta=meta)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        return api_success("Collection retrieved", data=self.get_serializer(instance).data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return api_error("Validation error", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)
        serializer.save(firm=self.get_firm())
        return api_success("Collection created", data=serializer.data, status_code=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        if not serializer.is_valid():
            return api_error("Validation error", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return api_success("Collection updated", data=serializer.data)

    def perform_create(self, serializer):
        serializer.save(firm=self.get_firm())

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.soft_delete()
        return api_success("Collection deleted", data={"id": str(instance.id)})


class CategoryViewSet(EcommerceAdminMixin, viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated, HasRBACPermission.with_perms(["categories.view"])]

    def get_permissions(self):
        if self.action == "create":
            self.permission_classes = [IsAuthenticated, HasRBACPermission.with_perms(["categories.add"])]
        elif self.action in {"update", "partial_update"}:
            self.permission_classes = [IsAuthenticated, HasRBACPermission.with_perms(["categories.update"])]
        elif self.action == "destroy":
            self.permission_classes = [IsAuthenticated, HasRBACPermission.with_perms(["categories.delete"])]
        return [permission() for permission in self.permission_classes]

    def get_queryset(self):
        return Category.objects.filter(firm=self.get_firm(), deleted_at__isnull=True).order_by("name")

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        search = (request.query_params.get("search") or "").strip()
        if search:
            queryset = queryset.filter(Q(name__icontains=search) | Q(slug__icontains=search))
        data, meta = self.paginate_payload(queryset, self.serializer_class)
        return api_success("Categories retrieved", data=data, meta=meta)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        return api_success("Category retrieved", data=self.get_serializer(instance).data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return api_error("Validation error", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)
        serializer.save(firm=self.get_firm())
        return api_success("Category created", data=serializer.data, status_code=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        if not serializer.is_valid():
            return api_error("Validation error", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return api_success("Category updated", data=serializer.data)

    def perform_create(self, serializer):
        serializer.save(firm=self.get_firm())

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.soft_delete()
        return api_success("Category deleted", data={"id": str(instance.id)})


class ProductViewSet(EcommerceAdminMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HasRBACPermission.with_perms(["products.view"])]

    def get_permissions(self):
        if self.action == "create":
            self.permission_classes = [IsAuthenticated, HasRBACPermission.with_perms(["products.add"])]
        elif self.action in {"update", "partial_update"}:
            self.permission_classes = [IsAuthenticated, HasRBACPermission.with_perms(["products.update"])]
        elif self.action == "destroy":
            self.permission_classes = [IsAuthenticated, HasRBACPermission.with_perms(["products.delete"])]
        return [permission() for permission in self.permission_classes]

    def get_queryset(self):
        return product_queryset_for_admin(self.get_firm())

    def get_serializer_class(self):
        if self.action in {"list"}:
            return ProductListSerializer
        if self.action in {"create", "update", "partial_update"}:
            return ProductWriteSerializer
        return ProductDetailSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        search = (request.query_params.get("search") or "").strip()
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(sku__icontains=search) | Q(vendor__icontains=search)
            )
        status_filter = request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        category_id = request.query_params.get("category")
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        collection_id = request.query_params.get("collection")
        if collection_id:
            queryset = queryset.filter(collection_id=collection_id)

        sort = request.query_params.get("sort") or "-updated_at"
        allowed_sorts = {"title", "-title", "created_at", "-created_at", "updated_at", "-updated_at", "price_aed", "-price_aed", "status", "-status"}
        if sort not in allowed_sorts:
            sort = "-updated_at"
        queryset = queryset.order_by(sort)
        data, meta = self.paginate_payload(queryset, self.get_serializer_class())
        return api_success("Products retrieved", data=data, meta=meta)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request, "firm": self.get_firm()})
        if not serializer.is_valid():
            return api_error("Validation error", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)
        product = serializer.save()
        return api_success(
            "Product created successfully",
            data=ProductDetailSerializer(product, context={"request": request}).data,
            status_code=status.HTTP_201_CREATED,
        )

    def retrieve(self, request, *args, **kwargs):
        product = self.get_object()
        return api_success("Product retrieved", data=ProductDetailSerializer(product, context={"request": request}).data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=partial,
            context={"request": request, "firm": self.get_firm()},
        )
        if not serializer.is_valid():
            return api_error("Validation error", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)
        product = serializer.save()
        return api_success("Product updated successfully", data=ProductDetailSerializer(product, context={"request": request}).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.soft_delete()
        return api_success("Product deleted", data={"id": str(instance.id)})


class ProductMediaListCreateView(EcommerceAdminMixin, APIView):
    permission_classes = [IsAuthenticated, HasRBACPermission.with_perms(["products.update"])]

    def get(self, request, product_id):
        firm = self.get_firm()
        product = get_object_or_404(Product.objects.filter(firm=firm, deleted_at__isnull=True), id=product_id)
        media = ProductMedia.objects.filter(product=product, deleted_at__isnull=True).order_by("sort_order", "created_at")
        return api_success("Product media retrieved", data=ProductMediaSerializer(media, many=True, context={"request": request}).data)

    def post(self, request, product_id):
        firm = self.get_firm()
        product = get_object_or_404(Product.objects.filter(firm=firm, deleted_at__isnull=True), id=product_id)
        serializer = ProductMediaUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error("Validation error", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

        if serializer.validated_data["media_type"] == ProductMediaType.FEATURE:
            ProductMedia.objects.filter(
                product=product,
                media_type=ProductMediaType.FEATURE,
                deleted_at__isnull=True,
            ).update(media_type=ProductMediaType.GALLERY)

        media = ProductMedia.objects.create(
            firm=firm,
            product=product,
            media_type=serializer.validated_data["media_type"],
            image=serializer.validated_data["image"],
            alt_text=serializer.validated_data.get("alt_text"),
            sort_order=serializer.validated_data.get("sort_order", 0),
            uploaded_by=request.user,
        )
        return api_success(
            "Product media uploaded",
            data=ProductMediaSerializer(media, context={"request": request}).data,
            status_code=status.HTTP_201_CREATED,
        )


class ProductMediaDetailView(EcommerceAdminMixin, APIView):
    permission_classes = [IsAuthenticated, HasRBACPermission.with_perms(["products.update"])]

    def delete(self, request, product_id, media_id):
        firm = self.get_firm()
        media = get_object_or_404(
            ProductMedia.objects.filter(firm=firm, product_id=product_id, deleted_at__isnull=True), id=media_id
        )
        media.soft_delete()
        return api_success("Product media deleted", data={"id": str(media.id)})


class ProductMediaReorderView(EcommerceAdminMixin, APIView):
    permission_classes = [IsAuthenticated, HasRBACPermission.with_perms(["products.update"])]

    def post(self, request, product_id):
        firm = self.get_firm()
        product = get_object_or_404(Product.objects.filter(firm=firm, deleted_at__isnull=True), id=product_id)
        serializer = ProductMediaReorderSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error("Validation error", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)
        media_ids = [item["id"] for item in serializer.validated_data["items"]]
        media_map = {
            str(m.id): m
            for m in ProductMedia.objects.filter(product=product, deleted_at__isnull=True, id__in=media_ids)
        }
        for item in serializer.validated_data["items"]:
            media = media_map.get(str(item["id"]))
            if media:
                media.sort_order = item["sort_order"]
                media.save(update_fields=["sort_order", "updated_at"])
        media = ProductMedia.objects.filter(product=product, deleted_at__isnull=True).order_by("sort_order", "created_at")
        return api_success("Product media reordered", data=ProductMediaSerializer(media, many=True, context={"request": request}).data)


class ProductVariantListCreateView(EcommerceAdminMixin, APIView):
    permission_classes = [IsAuthenticated, HasRBACPermission.with_perms(["products.update"])]

    def get(self, request, product_id):
        product = get_object_or_404(Product.objects.filter(firm=self.get_firm(), deleted_at__isnull=True), id=product_id)
        variants = ProductVariant.objects.filter(product=product, deleted_at__isnull=True).order_by("created_at")
        return api_success("Product variants retrieved", data=ProductVariantSerializer(variants, many=True).data)

    def post(self, request, product_id):
        firm = self.get_firm()
        product = get_object_or_404(Product.objects.filter(firm=firm, deleted_at__isnull=True), id=product_id)
        serializer = ProductVariantSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error("Validation error", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)
        variant = serializer.save(firm=firm, product=product)
        return api_success("Product variant created", data=ProductVariantSerializer(variant).data, status_code=status.HTTP_201_CREATED)


class ProductVariantDetailView(EcommerceAdminMixin, APIView):
    permission_classes = [IsAuthenticated, HasRBACPermission.with_perms(["products.update"])]

    def patch(self, request, product_id, variant_id):
        variant = get_object_or_404(
            ProductVariant.objects.filter(product_id=product_id, firm=self.get_firm(), deleted_at__isnull=True),
            id=variant_id,
        )
        serializer = ProductVariantSerializer(variant, data=request.data, partial=True)
        if not serializer.is_valid():
            return api_error("Validation error", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)
        variant = serializer.save()
        return api_success("Product variant updated", data=ProductVariantSerializer(variant).data)

    def delete(self, request, product_id, variant_id):
        variant = get_object_or_404(
            ProductVariant.objects.filter(product_id=product_id, firm=self.get_firm(), deleted_at__isnull=True),
            id=variant_id,
        )
        variant.soft_delete()
        return api_success("Product variant deleted", data={"id": str(variant.id)})


class StoreCollectionListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        firm = resolve_firm(request, allow_public=True)
        if not firm:
            return api_error("Firm not found", status_code=status.HTTP_404_NOT_FOUND)
        queryset = Collection.objects.filter(firm=firm, deleted_at__isnull=True, is_active=True).order_by("title")
        paginator = EcommercePagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        data = CollectionSerializer(page or queryset, many=True).data
        meta = pagination_meta(paginator, request) if page is not None else None
        return api_success("Store collections retrieved", data=data, meta=meta)


class StoreCategoryListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        firm = resolve_firm(request, allow_public=True)
        if not firm:
            return api_error("Firm not found", status_code=status.HTTP_404_NOT_FOUND)
        queryset = Category.objects.filter(firm=firm, deleted_at__isnull=True, is_active=True).order_by("name")
        paginator = EcommercePagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        data = CategorySerializer(page or queryset, many=True).data
        meta = pagination_meta(paginator, request) if page is not None else None
        return api_success("Store categories retrieved", data=data, meta=meta)


class StoreProductListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        firm = resolve_firm(request, allow_public=True)
        if not firm:
            return api_error("Firm not found", status_code=status.HTTP_404_NOT_FOUND)
        queryset = product_queryset_for_store(firm)
        search = (request.query_params.get("search") or "").strip()
        if search:
            queryset = queryset.filter(Q(title__icontains=search) | Q(vendor__icontains=search) | Q(sku__icontains=search))
        if request.query_params.get("category"):
            queryset = queryset.filter(category_id=request.query_params.get("category"))
        if request.query_params.get("collection"):
            queryset = queryset.filter(collection_id=request.query_params.get("collection"))
        if request.query_params.get("featured") in {"1", "true", "True"}:
            queryset = queryset.filter(is_featured=True)
        sort = request.query_params.get("sort") or "-created_at"
        allowed_sorts = {"title", "-title", "price_aed", "-price_aed", "created_at", "-created_at"}
        if sort not in allowed_sorts:
            sort = "-created_at"
        queryset = queryset.order_by(sort)
        paginator = EcommercePagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        data = ProductListSerializer(page or queryset, many=True, context={"request": request}).data
        meta = pagination_meta(paginator, request) if page is not None else None
        return api_success("Store products retrieved", data=data, meta=meta)


class StoreFeaturedProductsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        firm = resolve_firm(request, allow_public=True)
        if not firm:
            return api_error("Firm not found", status_code=status.HTTP_404_NOT_FOUND)
        queryset = product_queryset_for_store(firm).filter(is_featured=True).order_by("-updated_at", "-created_at")
        paginator = EcommercePagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        data = ProductListSerializer(page or queryset, many=True, context={"request": request}).data
        meta = pagination_meta(paginator, request) if page is not None else None
        return api_success("Featured products retrieved", data=data, meta=meta)


class StoreProductDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug):
        firm = resolve_firm(request, allow_public=True)
        if not firm:
            return api_error("Firm not found", status_code=status.HTTP_404_NOT_FOUND)
        product = get_object_or_404(product_queryset_for_store(firm), slug=slug)
        related = product_queryset_for_store(firm).filter(category=product.category).exclude(id=product.id)[:4]
        data = ProductDetailSerializer(product, context={"request": request}).data
        data["related_products"] = ProductListSerializer(related, many=True, context={"request": request}).data
        return api_success("Store product retrieved", data=data)


class CartView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        firm = resolve_firm(request, allow_public=True)
        if not firm:
            return api_error("Firm not found", status_code=status.HTTP_404_NOT_FOUND)
        guest_token = request.headers.get("X-Cart-Key") or request.query_params.get("cart_key")
        user = request.user if getattr(request.user, "is_authenticated", False) else None
        cart, created_token = get_or_create_cart(firm=firm, user=user, guest_token=guest_token)
        payload = build_cart_payload(cart, request=request)
        meta = {"cart_key": created_token or cart.guest_token}
        return api_success("Cart retrieved", data=payload, meta=meta)


class CartItemListCreateView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        firm = resolve_firm(request, allow_public=True)
        if not firm:
            return api_error("Firm not found", status_code=status.HTTP_404_NOT_FOUND)
        serializer = CartItemInputSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error("Validation error", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)
        guest_token = request.headers.get("X-Cart-Key") or request.data.get("cart_key")
        user = request.user if getattr(request.user, "is_authenticated", False) else None
        cart, created_token = get_or_create_cart(firm=firm, user=user, guest_token=guest_token)
        product = get_object_or_404(Product.objects.filter(firm=firm, deleted_at__isnull=True), id=serializer.validated_data["product_id"])
        variant = None
        if serializer.validated_data.get("variant_id"):
            variant = get_object_or_404(
                ProductVariant.objects.filter(firm=firm, deleted_at__isnull=True),
                id=serializer.validated_data["variant_id"],
            )
        try:
            add_item_to_cart(
                cart=cart,
                product=product,
                quantity=serializer.validated_data["quantity"],
                variant=variant,
            )
        except Exception as exc:
            detail = getattr(exc, "detail", str(exc))
            return api_error("Validation error", errors=detail, status_code=status.HTTP_400_BAD_REQUEST)
        payload = build_cart_payload(cart, request=request)
        return api_success("Cart updated", data=payload, meta={"cart_key": created_token or cart.guest_token}, status_code=status.HTTP_201_CREATED)


class CartItemDetailView(APIView):
    permission_classes = [AllowAny]

    def _get_item(self, request, item_id):
        firm = resolve_firm(request, allow_public=True)
        if not firm:
            return None, None, api_error("Firm not found", status_code=status.HTTP_404_NOT_FOUND)
        guest_token = request.headers.get("X-Cart-Key") or request.query_params.get("cart_key")
        user = request.user if getattr(request.user, "is_authenticated", False) else None
        cart, created_token = get_or_create_cart(firm=firm, user=user, guest_token=guest_token)
        item = get_object_or_404(cart.items.select_related("product", "variant"), id=item_id)
        return cart, item, created_token

    def patch(self, request, item_id):
        cart, item, created_token = self._get_item(request, item_id)
        if hasattr(created_token, "status_code"):
            return created_token
        serializer = CartItemUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error("Validation error", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)
        try:
            update_cart_item_quantity(item, serializer.validated_data["quantity"])
        except Exception as exc:
            detail = getattr(exc, "detail", str(exc))
            return api_error("Validation error", errors=detail, status_code=status.HTTP_400_BAD_REQUEST)
        return api_success("Cart item updated", data=build_cart_payload(cart, request=request), meta={"cart_key": created_token or cart.guest_token})

    def delete(self, request, item_id):
        cart, item, created_token = self._get_item(request, item_id)
        if hasattr(created_token, "status_code"):
            return created_token
        item.delete()
        return api_success("Cart item removed", data=build_cart_payload(cart, request=request), meta={"cart_key": created_token or cart.guest_token})


class CheckoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        firm = resolve_firm(request, allow_public=True)
        if not firm:
            return api_error("Firm not found", status_code=status.HTTP_404_NOT_FOUND)
        serializer = CheckoutSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error("Validation error", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)
        guest_token = request.headers.get("X-Cart-Key") or request.data.get("cart_key")
        user = request.user if getattr(request.user, "is_authenticated", False) else None
        cart, created_token = get_or_create_cart(firm=firm, user=user, guest_token=guest_token)
        try:
            order = place_order_from_cart(cart=cart, payload=serializer.validated_data, customer=user)
        except Exception as exc:
            detail = getattr(exc, "detail", str(exc))
            return api_error("Checkout failed", errors=detail, status_code=status.HTTP_400_BAD_REQUEST)
        return api_success("Order placed successfully", data=serialize_order(order), meta={"cart_key": created_token or cart.guest_token}, status_code=status.HTTP_201_CREATED)


class AdminOrderListView(EcommerceAdminMixin, APIView):
    permission_classes = [IsAuthenticated, HasRBACPermission.with_perms(["orders.view"])]

    def get(self, request):
        queryset = Order.objects.filter(firm=self.get_firm()).prefetch_related("items").order_by("-placed_at")
        search = (request.query_params.get("search") or "").strip()
        if search:
            queryset = queryset.filter(
                Q(order_number__icontains=search)
                | Q(customer_name__icontains=search)
                | Q(customer_email__icontains=search)
                | Q(customer_phone__icontains=search)
            )
        if request.query_params.get("order_status"):
            queryset = queryset.filter(order_status=request.query_params.get("order_status"))
        if request.query_params.get("payment_status"):
            queryset = queryset.filter(payment_status=request.query_params.get("payment_status"))
        sort = request.query_params.get("sort") or "-placed_at"
        allowed_sorts = {"placed_at", "-placed_at", "total_amount_aed", "-total_amount_aed", "order_status", "-order_status"}
        if sort not in allowed_sorts:
            sort = "-placed_at"
        queryset = queryset.order_by(sort)
        paginator = EcommercePagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        data = OrderListSerializer(page or queryset, many=True).data
        meta = pagination_meta(paginator, request) if page is not None else None
        return api_success("Orders retrieved", data=data, meta=meta)


class AdminOrderDetailView(EcommerceAdminMixin, APIView):
    permission_classes = [IsAuthenticated, HasRBACPermission.with_perms(["orders.view"])]

    def get(self, request, order_id):
        order = get_object_or_404(Order.objects.filter(firm=self.get_firm()).prefetch_related("items"), id=order_id)
        return api_success("Order retrieved", data=serialize_order(order))


class AdminOrderStatusView(EcommerceAdminMixin, APIView):
    permission_classes = [IsAuthenticated, HasRBACPermission.with_perms(["orders.update"])]

    def patch(self, request, order_id):
        order = get_object_or_404(Order.objects.filter(firm=self.get_firm()), id=order_id)
        serializer = OrderStatusUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error("Validation error", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)
        order.order_status = serializer.validated_data["order_status"]
        order.save(update_fields=["order_status", "updated_at"])
        return api_success("Order status updated", data=serialize_order(order))


class AdminOrderPaymentStatusView(EcommerceAdminMixin, APIView):
    permission_classes = [IsAuthenticated, HasRBACPermission.with_perms(["orders.update"])]

    def patch(self, request, order_id):
        order = get_object_or_404(Order.objects.filter(firm=self.get_firm()), id=order_id)
        serializer = OrderPaymentStatusUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error("Validation error", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)
        order.payment_status = serializer.validated_data["payment_status"]
        order.save(update_fields=["payment_status", "updated_at"])
        return api_success("Order payment status updated", data=serialize_order(order))


class MyOrdersListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        firm = resolve_firm(request)
        if not firm:
            return api_error("Firm not found", status_code=status.HTTP_404_NOT_FOUND)
        queryset = Order.objects.filter(firm=firm, customer=request.user).prefetch_related("items").order_by("-placed_at")
        paginator = EcommercePagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        data = OrderListSerializer(page or queryset, many=True).data
        meta = pagination_meta(paginator, request) if page is not None else None
        return api_success("My orders retrieved", data=data, meta=meta)


class MyOrderDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, order_id):
        firm = resolve_firm(request)
        if not firm:
            return api_error("Firm not found", status_code=status.HTTP_404_NOT_FOUND)
        order = get_object_or_404(Order.objects.filter(firm=firm, customer=request.user).prefetch_related("items"), id=order_id)
        return api_success("My order retrieved", data=serialize_order(order))


class OrderSuccessDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        firm = resolve_firm(request, allow_public=True)
        if not firm:
            return api_error("Firm not found", status_code=status.HTTP_404_NOT_FOUND)
        order = get_object_or_404(Order.objects.filter(firm=firm).prefetch_related("items"), public_token=token)
        return api_success("Order retrieved", data=serialize_order(order))
