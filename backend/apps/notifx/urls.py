from django.urls import include, path

urlpatterns = [
    path("", include("apps.notifx.api.urls")),
]

