from rest_framework.routers import DefaultRouter

from apps.task_templates.views import CaseTaskTemplateViewSet

router = DefaultRouter()
router.register(r"settings/task-templates", CaseTaskTemplateViewSet, basename="task-templates")

urlpatterns = router.urls
