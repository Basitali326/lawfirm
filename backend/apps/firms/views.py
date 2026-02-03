from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import NotFound

from apps.authx.models import Firm
from .serializers import FirmMeSerializer


class FirmMeView(generics.RetrieveUpdateAPIView):
    serializer_class = FirmMeSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        firm = Firm.objects.filter(owner=self.request.user).first()
        if not firm:
            raise NotFound('Firm not found for this user.')
        return firm

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)
