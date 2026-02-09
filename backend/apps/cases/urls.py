from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import CaseViewSet, TrashView
from apps.casetypes.views import CaseTypeViewSet

router = DefaultRouter()
router.register(r"cases", CaseViewSet, basename="case")
router.register(r"settings/case-types", CaseTypeViewSet, basename="case-types")

urlpatterns = router.urls + [
    path("trash/", TrashView.as_view(), name="trash"),
]
