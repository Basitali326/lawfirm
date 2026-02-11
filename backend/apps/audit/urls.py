from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.audit.views import AuditLogViewSet, CaseAuditLogViewSet

router = DefaultRouter()
router.register(r"audit-logs", AuditLogViewSet, basename="audit-logs")

case_router = DefaultRouter()
case_router.register(r"cases/(?P<case_id>[^/.]+)/audit-logs", CaseAuditLogViewSet, basename="case-audit-logs")

urlpatterns = router.urls + case_router.urls
