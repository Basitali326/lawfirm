from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    ArticleCategoryViewSet,
    ArticleViewSet,
    CertificationViewSet,
    EbookCheckoutView,
    EbookCheckoutConfirmView,
    EbookDownloadView,
    EbookPurchaseViewSet,
    EbookViewSet,
    PublicArticleDetailView,
    PublicArticleListView,
    PublicEbookDetailView,
    PublicEbookListView,
    PublicWebsiteDataView,
    SellerViewSet,
    StripeWebhookView,
)

router = DefaultRouter()
router.register("sellers", SellerViewSet, basename="sellers")
router.register("ebooks", EbookViewSet, basename="ebooks")
router.register("certifications", CertificationViewSet, basename="certifications")
router.register("article-categories", ArticleCategoryViewSet, basename="article-categories")
router.register("articles", ArticleViewSet, basename="articles")
router.register("ebook-purchases", EbookPurchaseViewSet, basename="ebook-purchases")

urlpatterns = router.urls + [
    path("website/home/", PublicWebsiteDataView.as_view(), name="website-home"),
    path("website/ebooks/", PublicEbookListView.as_view(), name="website-ebooks"),
    path("website/ebooks/<slug:slug>/", PublicEbookDetailView.as_view(), name="website-ebook-detail"),
    path("website/articles/", PublicArticleListView.as_view(), name="website-articles"),
    path("website/articles/<slug:slug>/", PublicArticleDetailView.as_view(), name="website-article-detail"),
    path("website/ebook-checkout/", EbookCheckoutView.as_view(), name="ebook-checkout"),
    path("website/ebook-checkout/confirm/", EbookCheckoutConfirmView.as_view(), name="ebook-checkout-confirm"),
    path("website/stripe/webhook/", StripeWebhookView.as_view(), name="website-stripe-webhook"),
    path("website/ebook-download/<uuid:token>/", EbookDownloadView.as_view(), name="ebook-download"),
]
