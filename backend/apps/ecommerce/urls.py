from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.ecommerce.views import (
    AdminOrderDetailView,
    AdminOrderListView,
    AdminOrderPaymentStatusView,
    AdminOrderStatusView,
    CartItemDetailView,
    CartItemListCreateView,
    CartView,
    CheckoutView,
    CollectionViewSet,
    MyOrderDetailView,
    MyOrdersListView,
    OrderSuccessDetailView,
    ProductMediaDetailView,
    ProductMediaListCreateView,
    ProductMediaReorderView,
    ProductVariantDetailView,
    ProductVariantListCreateView,
    ProductViewSet,
    StoreCollectionListView,
    StoreFeaturedProductsView,
    StoreProductDetailView,
    StoreProductListView,
)

router = DefaultRouter()
router.register(r"collections", CollectionViewSet, basename="ecommerce-collections")
router.register(r"products", ProductViewSet, basename="ecommerce-products")

urlpatterns = router.urls + [
    path("products/<uuid:product_id>/media/", ProductMediaListCreateView.as_view(), name="ecommerce-product-media"),
    path("products/<uuid:product_id>/media/reorder/", ProductMediaReorderView.as_view(), name="ecommerce-product-media-reorder"),
    path("products/<uuid:product_id>/media/<uuid:media_id>/", ProductMediaDetailView.as_view(), name="ecommerce-product-media-detail"),
    path("products/<uuid:product_id>/variants/", ProductVariantListCreateView.as_view(), name="ecommerce-product-variants"),
    path("products/<uuid:product_id>/variants/<uuid:variant_id>/", ProductVariantDetailView.as_view(), name="ecommerce-product-variant-detail"),
    path("orders/", AdminOrderListView.as_view(), name="ecommerce-orders"),
    path("orders/<uuid:order_id>/", AdminOrderDetailView.as_view(), name="ecommerce-order-detail"),
    path("orders/<uuid:order_id>/status/", AdminOrderStatusView.as_view(), name="ecommerce-order-status"),
    path("orders/<uuid:order_id>/payment-status/", AdminOrderPaymentStatusView.as_view(), name="ecommerce-order-payment-status"),
    path("store/products/", StoreProductListView.as_view(), name="ecommerce-store-products"),
    path("store/products/<slug:slug>/", StoreProductDetailView.as_view(), name="ecommerce-store-product-detail"),
    path("store/collections/", StoreCollectionListView.as_view(), name="ecommerce-store-collections"),
    path("store/featured-products/", StoreFeaturedProductsView.as_view(), name="ecommerce-store-featured-products"),
    path("store/orders/success/<uuid:token>/", OrderSuccessDetailView.as_view(), name="ecommerce-store-order-success"),
    path("cart/", CartView.as_view(), name="ecommerce-cart"),
    path("cart/items/", CartItemListCreateView.as_view(), name="ecommerce-cart-items"),
    path("cart/items/<uuid:item_id>/", CartItemDetailView.as_view(), name="ecommerce-cart-item-detail"),
    path("checkout/", CheckoutView.as_view(), name="ecommerce-checkout"),
    path("my/orders/", MyOrdersListView.as_view(), name="ecommerce-my-orders"),
    path("my/orders/<uuid:order_id>/", MyOrderDetailView.as_view(), name="ecommerce-my-order-detail"),
]
