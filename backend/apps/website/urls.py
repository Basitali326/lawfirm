from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    ArticleCategoryViewSet,
    ArticleViewSet,
    AppointmentCheckoutConfirmView,
    AppointmentCheckoutView,
    AppointmentViewSet,
    CertificationViewSet,
    EbookCheckoutView,
    EbookCheckoutConfirmView,
    EbookDownloadView,
    EbookPurchaseViewSet,
    EbookViewSet,
    LawyerAvailabilityViewSet,
    LawyerOffDayViewSet,
    LegalServiceViewSet,
    PublicArticleDetailView,
    PublicArticleListView,
    PublicEbookDetailView,
    PublicEbookListView,
    PublicLegalServiceDetailView,
    PublicLegalServiceListView,
    PublicLegalServiceSlotsView,
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
router.register("legal-services", LegalServiceViewSet, basename="legal-services")
router.register("lawyer-availability", LawyerAvailabilityViewSet, basename="lawyer-availability")
router.register("lawyer-off-days", LawyerOffDayViewSet, basename="lawyer-off-days")
router.register("appointments", AppointmentViewSet, basename="appointments")

urlpatterns = router.urls + [
    path("website/home/", PublicWebsiteDataView.as_view(), name="website-home"),
    path("website/ebooks/", PublicEbookListView.as_view(), name="website-ebooks"),
    path("website/ebooks/<slug:slug>/", PublicEbookDetailView.as_view(), name="website-ebook-detail"),
    path("website/articles/", PublicArticleListView.as_view(), name="website-articles"),
    path("website/articles/<slug:slug>/", PublicArticleDetailView.as_view(), name="website-article-detail"),
    path("website/services/", PublicLegalServiceListView.as_view(), name="website-services"),
    path("website/services/<slug:slug>/", PublicLegalServiceDetailView.as_view(), name="website-service-detail"),
    path("website/services/<slug:slug>/slots/", PublicLegalServiceSlotsView.as_view(), name="website-service-slots"),
    path("website/appointment-checkout/", AppointmentCheckoutView.as_view(), name="appointment-checkout"),
    path("website/appointment-checkout/confirm/", AppointmentCheckoutConfirmView.as_view(), name="appointment-checkout-confirm"),
    path("website/ebook-checkout/", EbookCheckoutView.as_view(), name="ebook-checkout"),
    path("website/ebook-checkout/confirm/", EbookCheckoutConfirmView.as_view(), name="ebook-checkout-confirm"),
    path("website/stripe/webhook/", StripeWebhookView.as_view(), name="website-stripe-webhook"),
    path("website/ebook-download/<uuid:token>/", EbookDownloadView.as_view(), name="ebook-download"),
]
