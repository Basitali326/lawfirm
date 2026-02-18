from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from core.responses import api_success, api_error
from common.response import ok
from common.pagination import DefaultPageNumberPagination
from .models import Notification
from .serializers import NotificationSerializer


def current_firm(request):
    firm = getattr(request.user, "firm", None) or getattr(getattr(request.user, "profile", None), "firm", None)
    if not firm and hasattr(request.user, "owned_firm"):
        firm = request.user.owned_firm
    return firm


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = DefaultPageNumberPagination

    def get_queryset(self):
        firm = current_firm(self.request)
        qs = Notification.objects.filter(firm=firm, user=self.request.user)
        is_read = self.request.query_params.get("is_read")
        if is_read is not None:
            if str(is_read).lower() in {"true", "1"}:
                qs = qs.filter(is_read=True)
            elif str(is_read).lower() in {"false", "0"}:
                qs = qs.filter(is_read=False)
        return qs.order_by("-created_at")

    def list(self, request, *args, **kwargs):
        page = self.paginate_queryset(self.get_queryset())
        serializer = NotificationSerializer(page, many=True)
        meta = {
            "count": self.paginator.page.paginator.count,
            "next": self.paginator.get_next_link(),
            "previous": self.paginator.get_previous_link(),
            "page": self.paginator.page.number,
            "page_size": self.paginator.get_page_size(request),
        }
        return ok(serializer.data, meta=meta)

    @action(detail=True, methods=["post"])
    def read(self, request, pk=None):
        firm = current_firm(request)
        try:
            notif = Notification.objects.get(id=pk, firm=firm, user=request.user)
        except Notification.DoesNotExist:
            return api_error("Not found", status_code=404)
        notif.mark_read()
        return ok(NotificationSerializer(notif).data)
