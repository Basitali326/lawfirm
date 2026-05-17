from rest_framework.routers import DefaultRouter
from django.urls import path

from .views import InvoiceViewSet, CaseTypeFeePolicyViewSet, StripeWebhookView

router = DefaultRouter()
router.register(r"invoices", InvoiceViewSet, basename="invoice")
router.register(r"billing/case-type-fees", CaseTypeFeePolicyViewSet, basename="case-type-fee")

urlpatterns = [
    path("billing/stripe/webhook/", StripeWebhookView.as_view(), name="stripe-webhook"),
    *router.urls,
]
