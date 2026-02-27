from django.urls import path

from apps.documents.views import (
    CaseDocumentListView,
    CaseDocumentUploadView,
    DocumentDeleteView,
    DocumentDownloadView,
    OpenPaidCasesListView,
    TaskAttachmentListView,
    TaskAttachmentUploadView,
)


urlpatterns = [
    path("documents/cases/open-paid/", OpenPaidCasesListView.as_view(), name="documents-open-paid-cases"),
    path("documents/cases/<uuid:case_id>/upload/", CaseDocumentUploadView.as_view(), name="documents-case-upload"),
    path("documents/cases/<uuid:case_id>/", CaseDocumentListView.as_view(), name="documents-case-list"),
    path("tasks/<uuid:task_id>/attachments/upload/", TaskAttachmentUploadView.as_view(), name="tasks-attachment-upload"),
    path("tasks/<uuid:task_id>/attachments/", TaskAttachmentListView.as_view(), name="tasks-attachment-list"),
    path("documents/<uuid:doc_id>/download/", DocumentDownloadView.as_view(), name="documents-download"),
    path("documents/<uuid:doc_id>/", DocumentDeleteView.as_view(), name="documents-delete"),
]

