from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import NotFound
from rest_framework.response import Response

from common.api_response import api_success

from apps.authx.models import Firm, generate_unique_slug
from .serializers import FirmMeSerializer


class FirmMeView(generics.RetrieveUpdateAPIView):
    serializer_class = FirmMeSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def get_object(self):
        user = self.request.user
        # 1) firm owned by user
        firm = Firm.objects.filter(owner=user).first()
        if firm:
            return firm

        # 2) firm attached on profile
        profile = getattr(user, "profile", None)
        if profile and getattr(profile, "firm", None):
            return profile.firm

        # 3) superuser: fall back to first firm
        if user.is_superuser:
            existing = Firm.objects.first()
            if existing:
                return existing

        if user.is_superuser:
            name = f"Admin Firm {user.id}"
            slug = generate_unique_slug(Firm, name)
            firm = Firm.objects.create(
                name=name,
                slug=slug,
                owner=user,
                email=user.email,
                phone="",
                address="",
            )
            return firm

        # No firm: return a sentinel object handled in retrieve below
        return None

    def retrieve(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj is None:
            return api_success(
                {
                    "firm": None,
                    "detail": "Firm not found for this user. Please contact your administrator.",
                    "owner_first_name": request.user.first_name,
                    "owner_last_name": request.user.last_name,
                }
            )
        serializer = self.get_serializer(obj)
        data = serializer.data
        # Also surface current user info for convenience
        data['current_user'] = {
            "id": request.user.id,
            "email": request.user.email,
            "first_name": request.user.first_name,
            "last_name": request.user.last_name,
            "role": getattr(getattr(request.user, "profile", None), "role", None)
            or getattr(request.user, "role", None),
        }
        return api_success(data)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        return api_success(response.data, status=response.status_code)
