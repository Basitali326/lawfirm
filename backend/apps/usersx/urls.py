from django.urls import path
from .views import UsersSummaryView, UsersListView, UserDeleteView

urlpatterns = [
    path("settings/users/summary", UsersSummaryView.as_view(), name="users-summary"),
    path("settings/users", UsersListView.as_view(), name="users-list"),
    path("settings/users/<int:user_id>", UserDeleteView.as_view(), name="users-delete"),
]
