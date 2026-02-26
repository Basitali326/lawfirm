from rest_framework.routers import DefaultRouter
from .views import InvoiceViewSet, CaseTypeFeePolicyViewSet

router = DefaultRouter()
router.register(r"invoices", InvoiceViewSet, basename="invoice")
router.register(r"billing/case-type-fees", CaseTypeFeePolicyViewSet, basename="case-type-fee")

urlpatterns = router.urls
