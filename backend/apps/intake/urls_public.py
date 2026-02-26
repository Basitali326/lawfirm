from django.urls import path
from apps.intake.views import PublicIntakeRequestView, PublicCaseTypesAPIView

urlpatterns = [
    path("<slug:firm_slug>/case-types/", PublicCaseTypesAPIView.as_view(), name="public-case-types"),
    path("<slug:firm_slug>/intake-requests/", PublicIntakeRequestView.as_view(), name="public-intake"),
]
