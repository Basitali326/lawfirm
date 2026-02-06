from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import CaseViewSet, TrashView

router = DefaultRouter()
router.register(r"cases", CaseViewSet, basename="case")

urlpatterns = router.urls + [
    path("trash/", TrashView.as_view(), name="trash"),
]
