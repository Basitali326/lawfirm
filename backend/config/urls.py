from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/authx/', include('apps.authx.urls')),
    path('api/firms/', include('apps.firms.urls')),
    path('api/', include('apps.cases.urls')),  # keeps existing
    path('api/v1/', include('apps.cases.urls')),  # versioned
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='docs'),
]
