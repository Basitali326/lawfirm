from django.urls import path

from .views import FirmMeView

urlpatterns = [
    path('profile/', FirmMeView.as_view(), name='firm-profile'),
]
