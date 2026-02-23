from django.urls import path
from .admin_views import (
    AdminFirmCreateView,
    AdminFirmListView,
    AdminFirmDetailView,
    AdminFirmUpdateView,
    AdminResetCeoPasswordView,
)

urlpatterns = [
    path("firms/", AdminFirmListView.as_view(), name="admin-firm-list"),
    path("firms", AdminFirmListView.as_view(), name="admin-firm-list-no-slash"),
    path("firms/create", AdminFirmCreateView.as_view(), name="admin-firm-create"),
    path("firms/create/", AdminFirmCreateView.as_view(), name="admin-firm-create-slash"),
    path("firms/<int:firm_id>/", AdminFirmDetailView.as_view(), name="admin-firm-detail"),
    path("firms/<int:firm_id>", AdminFirmDetailView.as_view(), name="admin-firm-detail-noslash"),
    path("firms/<int:firm_id>/update/", AdminFirmUpdateView.as_view(), name="admin-firm-update"),
    path("firms/<int:firm_id>/update", AdminFirmUpdateView.as_view(), name="admin-firm-update-noslash"),
    path("firms/<int:firm_id>/reset-ceo-password/", AdminResetCeoPasswordView.as_view(), name="admin-firm-reset-ceo"),
    path("firms/<int:firm_id>/reset-ceo-password", AdminResetCeoPasswordView.as_view(), name="admin-firm-reset-ceo-noslash"),
]
