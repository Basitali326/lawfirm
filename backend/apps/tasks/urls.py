from rest_framework.routers import DefaultRouter
from django.urls import path

from apps.tasks.views import (
    TaskViewSet,
    OpenCasesTasksView,
    TaskNoteCreateView,
    CaseTaskCreateView,
)

router = DefaultRouter()
router.register(r"tasks", TaskViewSet, basename="tasks")

# Place custom endpoints before router.urls so they don't get swallowed by the
# router's detail route (tasks/<pk>/).
urlpatterns = [
    path("tasks/open-cases/", OpenCasesTasksView.as_view(), name="tasks-open-cases"),
    path("tasks/<uuid:task_id>/notes/", TaskNoteCreateView.as_view(), name="task-notes"),
    path("cases/<uuid:case_id>/tasks/", CaseTaskCreateView.as_view(), name="case-task-create"),
] + router.urls
