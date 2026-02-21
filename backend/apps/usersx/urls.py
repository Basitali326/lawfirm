from django.urls import path
from .views import UsersSummaryView, UsersListView, UserDeleteView

urlpatterns = [
    # Allow both with and without trailing slash to match frontend calls
    path("settings/users/summary", UsersSummaryView.as_view(), name="users-summary"),
    path("settings/users/summary/", UsersSummaryView.as_view(), name="users-summary-slash"),
    path("settings/users", UsersListView.as_view(), name="users-list"),
    path("settings/users/", UsersListView.as_view(), name="users-list-slash"),
    path("settings/users/<int:user_id>", UserDeleteView.as_view(), name="users-delete"),
    path("settings/users/<int:user_id>/", UserDeleteView.as_view(), name="users-delete-slash"),
]
