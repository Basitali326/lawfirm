from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import CaseViewSet, TrashView, GenerateTasksAPIView
from .views import TaskSuggestionsAPIView, ClientListAPIView
from apps.casetypes.views import CaseTypeViewSet

router = DefaultRouter()
router.register(r"cases", CaseViewSet, basename="case")
router.register(r"settings/case-types", CaseTypeViewSet, basename="case-types")

urlpatterns = router.urls + [
    path("trash/", TrashView.as_view(), name="trash"),
    path("cases/<uuid:case_id>/generate-tasks/", GenerateTasksAPIView.as_view(), name="case-generate-tasks"),
    path("cases/<uuid:case_id>/task-suggestions/", TaskSuggestionsAPIView.as_view(), name="case-task-suggestions"),
    path("clients/", ClientListAPIView.as_view(), name="client-list"),
]
