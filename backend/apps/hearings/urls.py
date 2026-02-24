from django.urls import path

from apps.hearings.views import CaseHearingsView, HearingDetailView, HearingListView

urlpatterns = [
    path("hearings/", HearingListView.as_view(), name="hearings-list"),
    path("cases/<uuid:case_id>/hearings/", CaseHearingsView.as_view(), name="case-hearings"),
    path("hearings/<uuid:hearing_id>/", HearingDetailView.as_view(), name="hearing-detail"),
]
