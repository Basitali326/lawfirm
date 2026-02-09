from rest_framework.routers import DefaultRouter

from apps.casetypes.views import CaseTypeViewSet

router = DefaultRouter()
router.register(r"settings/case-types", CaseTypeViewSet, basename="case-types")

urlpatterns = router.urls
