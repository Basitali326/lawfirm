from django.urls import path

from apps.dashboard.api.views import DashboardSummaryAPIView


urlpatterns = [
    path("dashboard/summary/", DashboardSummaryAPIView.as_view(), name="dashboard-summary"),
]

