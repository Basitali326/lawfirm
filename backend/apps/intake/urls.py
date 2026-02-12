from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.intake.views import PublicIntakeRequestView, IntakeRequestViewSet, IntakeConvertAPIView

router = DefaultRouter()
router.register(r"intake-requests", IntakeRequestViewSet, basename="intake-requests")

urlpatterns = [
    path("intake-requests/<uuid:pk>/convert/", IntakeConvertAPIView.as_view(), name="intake-convert"),
] + router.urls
