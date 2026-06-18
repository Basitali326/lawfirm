from django.urls import path

from apps.dashboard.api.views import DashboardAnalyticsAPIView, DashboardSummaryAPIView


urlpatterns = [
    path("dashboard/summary/", DashboardSummaryAPIView.as_view(), name="dashboard-summary"),
    path("dashboard/analytics/", DashboardAnalyticsAPIView.as_view(), name="dashboard-analytics"),
]
