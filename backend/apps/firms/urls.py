from django.urls import path

from .views import FirmMeView

urlpatterns = [
    path('me/', FirmMeView.as_view(), name='firm-me'),
]
