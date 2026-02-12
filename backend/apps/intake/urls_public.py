from django.urls import path
from apps.intake.views import PublicIntakeRequestView

urlpatterns = [
    path("<slug:firm_slug>/intake-requests/", PublicIntakeRequestView.as_view(), name="public-intake"),
]
