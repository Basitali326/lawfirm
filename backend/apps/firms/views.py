from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import NotFound
from rest_framework.response import Response

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
        firm = Firm.objects.filter(owner=user).first()
        if firm:
            return firm

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
            return Response(
                {
                    "firm": None,
                    "detail": "Firm not found for this user. Please contact your administrator.",
                    "role": request.user.is_superuser and "Super Admin" or "",
                    "owner_first_name": request.user.first_name,
                    "owner_last_name": request.user.last_name,
                },
                status=200,
            )
        serializer = self.get_serializer(obj)
        data = serializer.data
        data['role'] = request.user.is_superuser and "Super Admin" or ""
        data['owner_first_name'] = request.user.first_name
        data['owner_last_name'] = request.user.last_name
        return Response(data)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)
