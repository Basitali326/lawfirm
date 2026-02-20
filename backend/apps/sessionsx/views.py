from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from core.responses import api_success, api_error
from apps.rbac.permissions import HasRBACPermission
from .models import UserSession, SessionStatus
from .serializers import SessionSerializer
from .services import handle_login, approve_session, deny_session, is_exempt
from .utils import require_device_id, get_client_ip, get_user_agent, get_user_firm

class LoginView(APIView):
    permission_classes = []  # plug into your auth flow

    def post(self, request):
        user = request.user
        device_id = require_device_id(request)
        firm = get_user_firm(user)
        ip = get_client_ip(request)
        ua = get_user_agent(request)
        decision, session_obj = handle_login(user, firm, device_id, ip, ua)
        if decision == "ALLOW":
            return api_success("OK", data={"session_id": str(session_obj.id) if session_obj else None})
        return api_error(
            f"Admin approval required for new device from IP {ip}",
            data={
                "pending_session_id": str(session_obj.id),
                "reason": getattr(session_obj, "reason", None),
                "ip": ip,
            },
            status_code=status.HTTP_403_FORBIDDEN,
        )

class RefreshView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        device_id = require_device_id(request)
        if is_exempt(request.user):
            return api_success("OK")
        refresh_jti = getattr(request.auth, "refresh_jti", None) or request.data.get("refresh_jti")
        if not refresh_jti:
            return api_error("Invalid token", status_code=status.HTTP_401_UNAUTHORIZED)
        try:
            sess = UserSession.objects.get(refresh_jti=refresh_jti, status=SessionStatus.ACTIVE)
        except UserSession.DoesNotExist:
            return api_error("Session not active", status_code=status.HTTP_401_UNAUTHORIZED)
        if sess.device_id != device_id:
            return api_error("Device mismatch", status_code=status.HTTP_401_UNAUTHORIZED)
        sess.last_seen_at = timezone.now()
        sess.save(update_fields=["last_seen_at"])
        return api_success("OK")

class SessionAdminView(APIView):
    permission_classes = [IsAuthenticated, HasRBACPermission.with_perms(["sessions.approve"])]

    def get(self, request):
        firm = get_user_firm(request.user)
        if not firm and not is_exempt(request.user):
            return api_error("User firm not set", status_code=status.HTTP_403_FORBIDDEN)
        qs = UserSession.objects.filter(firm=firm)
        status_q = request.query_params.get("status")
        if status_q:
            qs = qs.filter(status=status_q)
        serializer = SessionSerializer(qs, many=True)
        return api_success("OK", data=serializer.data)

class ApproveSessionView(APIView):
    permission_classes = [IsAuthenticated, HasRBACPermission.with_perms(["sessions.approve"])]

    def post(self, request, pk):
        sess = approve_session(pk, request.user)
        if not sess:
            return api_error("Invalid state", status_code=status.HTTP_400_BAD_REQUEST)
        return api_success("OK", data=SessionSerializer(sess).data)

class DenySessionView(APIView):
    permission_classes = [IsAuthenticated, HasRBACPermission.with_perms(["sessions.approve"])]

    def post(self, request, pk):
        sess = deny_session(pk, request.user)
        if not sess:
            return api_error("Invalid state", status_code=status.HTTP_400_BAD_REQUEST)
        return api_success("OK", data=SessionSerializer(sess).data)

class RevokeSessionsView(APIView):
    permission_classes = [IsAuthenticated, HasRBACPermission.with_perms(["sessions.approve"])]

    def post(self, request, user_id):
        firm = get_user_firm(request.user)
        if not firm and not is_exempt(request.user):
            return api_error("User firm not set", status_code=status.HTTP_403_FORBIDDEN)
        qs = UserSession.objects.filter(
            firm=firm, user_id=user_id, status__in=[SessionStatus.ACTIVE, SessionStatus.PENDING]
        )
        count = qs.update(status=SessionStatus.REVOKED, revoked_at=timezone.now(), approved_by=request.user)
        return api_success("OK", data={"revoked": count})
