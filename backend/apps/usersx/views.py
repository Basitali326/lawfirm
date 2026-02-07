from django.db import IntegrityError
from django.db.models.deletion import ProtectedError
from django.contrib.auth import get_user_model
from rest_framework import permissions, status
from rest_framework.views import APIView
from django.conf import settings

from core.responses import api_success, api_error
from apps.authx.models import Firm, UserProfile
from .serializers import InviteCreateSerializer
from .permissions import IsFirmOwner
from .models import InviteToken

User = get_user_model()
USER_LIMIT = 10


def resolve_firm_for_user(user):
    firm = getattr(user, "firm", None)
    if firm:
        return firm
    owned = getattr(user, "owned_firm", None)
    if owned:
        return owned
    profile = getattr(user, "profile", None)
    if profile and getattr(profile, "firm", None):
        return profile.firm
    firm_id = getattr(user, "firm_id", None)
    if firm_id:
        try:
            from apps.authx.models import Firm
            return Firm.objects.filter(id=firm_id).first()
        except Exception:
            return None
    # fallback: if user is owner of a firm
    try:
        from apps.authx.models import Firm
        return Firm.objects.filter(owner=user).first()
    except Exception:
        return None


def default_firm_for_superadmin():
    try:
        return Firm.objects.first()
    except Exception:
        return None


def firm_user_counts(firm):
    if not firm:
        total = User.objects.filter(is_active=True).count()
        remaining = max(0, USER_LIMIT - total)
        return total, remaining
    if any(f.name == "firm" for f in User._meta.fields):
        total = User.objects.filter(firm=firm, is_active=True).count()
    else:
        owner_count = 1 if getattr(firm, "owner_id", None) else 0
        total = owner_count + User.objects.filter(profile__firm=firm, is_active=True).count()
    remaining = max(0, USER_LIMIT - total)
    return total, remaining


class UsersSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsFirmOwner]

    def get(self, request):
        firm = resolve_firm_for_user(request.user)
        if not firm:
            if request.user.is_superuser:
                firm_id = request.query_params.get("firm_id")
                if firm_id:
                    firm = Firm.objects.filter(id=firm_id).first()
                if not firm:
                    firm = default_firm_for_superadmin()
            if not firm:
                return api_error("User not associated with a firm", status_code=status.HTTP_400_BAD_REQUEST)
        total, remaining = firm_user_counts(firm)
        return api_success("Users summary", data={"total": total, "limit": USER_LIMIT, "remaining": remaining})


class UsersListView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsFirmOwner]

    def _firm_for_request(self, request):
        firm = resolve_firm_for_user(request.user)
        if not firm and request.user.is_superuser:
            firm_id = request.data.get("firm_id") if hasattr(request, "data") else None
            firm_id = firm_id or request.query_params.get("firm_id")
            if firm_id:
                firm = Firm.objects.filter(id=firm_id).first()
            if not firm:
                firm = default_firm_for_superadmin()
        return firm

    def get(self, request):
        firm = self._firm_for_request(request)
        if not firm:
            return api_error("User not associated with a firm", status_code=status.HTTP_400_BAD_REQUEST)
        if any(f.name == "firm" for f in User._meta.fields):
            users = User.objects.filter(firm=firm, is_active=True).select_related("profile").order_by("-date_joined")
        else:
            users = (
                User.objects.filter(profile__firm=firm, is_active=True)
                .select_related("profile")
                .order_by("-date_joined")
            )
        data = [
            {
                "id": u.id,
                "name": f"{u.first_name} {u.last_name}".strip(),
                "email": u.email,
                "role": (
                    "FIRM_OWNER"
                    if getattr(firm, "owner_id", None) == u.id
                    else getattr(getattr(u, "profile", None), "role", None)
                ),
                "created_at": u.date_joined,
            }
            for u in users
        ]
        total, remaining = firm_user_counts(firm)
        return api_success("Users retrieved", data=data, meta={"total": total, "limit": USER_LIMIT, "remaining": remaining})

    def post(self, request):
        firm = self._firm_for_request(request)
        if not firm:
            return api_error("User not associated with a firm", status_code=status.HTTP_400_BAD_REQUEST)
        total, remaining = firm_user_counts(firm)
        if remaining <= 0:
            return api_error(
                "User limit reached (10). Upgrade plan to add more users.",
                errors={"limit": ["User limit reached"]},
                status_code=status.HTTP_409_CONFLICT,
            )

        serializer = InviteCreateSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return api_error("Validation error", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        user_kwargs = {
            "first_name": data["first_name"],
            "last_name": data["last_name"],
            "email": data["email"],
            "username": data["email"],
            "is_active": True,
        }
        if any(f.name == "firm" for f in User._meta.fields):
            user_kwargs["firm"] = firm
        user = User.objects.create(**user_kwargs)
        user.set_password("Abcd.@123456")
        user.save(update_fields=["password"])
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.role = data.get("role")
        profile.firm = firm
        profile.save(update_fields=["role", "firm"])
        total, remaining = firm_user_counts(firm)
        return api_success(
            "User created",
            data={
                "id": user.id,
                "email": user.email,
                "role": profile.role,
                "first_name": user.first_name,
                "last_name": user.last_name,
            },
            meta={"total": total, "limit": USER_LIMIT, "remaining": remaining},
            status_code=status.HTTP_201_CREATED,
        )


class UserDeleteView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsFirmOwner]

    def delete(self, request, user_id):
        firm = resolve_firm_for_user(request.user)
        if not firm and request.user.is_superuser:
            firm_id = request.data.get("firm_id") or request.query_params.get("firm_id")
            if firm_id:
                firm = Firm.objects.filter(id=firm_id).first()
            if not firm:
                firm = default_firm_for_superadmin()
        if not firm:
            return api_error("User not associated with a firm", status_code=status.HTTP_400_BAD_REQUEST)

        try:
            target = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return api_error("User not found", status_code=status.HTTP_404_NOT_FOUND)

        if any(f.name == "firm" for f in User._meta.fields):
            if getattr(target, "firm_id", None) != getattr(firm, "id", None):
                return api_error("Cannot modify users outside your firm", status_code=status.HTTP_403_FORBIDDEN)

        if target == request.user:
            return api_error("You cannot delete yourself", status_code=status.HTTP_400_BAD_REQUEST)

        is_firm_owner = False
        if getattr(firm, "owner_id", None) == target.id:
            is_firm_owner = True
        if (getattr(target, "role", "") or "").upper() == "FIRM_OWNER":
            is_firm_owner = True
        if is_firm_owner:
            return api_error("Cannot delete firm owner", status_code=status.HTTP_400_BAD_REQUEST)

        try:
            target.delete()
        except ProtectedError as exc:
            return api_error(
                "Unable to delete user",
                errors={"detail": "User has related records and cannot be deleted."},
                status_code=status.HTTP_409_CONFLICT,
            )
        except IntegrityError as exc:
            return api_error("Unable to delete user", errors={"detail": str(exc)}, status_code=status.HTTP_409_CONFLICT)
        except Exception as exc:  # pragma: no cover
            return api_error("Unable to delete user", errors={"detail": str(exc)}, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return api_success("User deleted", data={"id": user_id})


class InvitesListView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsFirmOwner]

    def get(self, request):
        firm = resolve_firm_for_user(request.user)
        if not firm and request.user.is_superuser:
            firm_id = request.query_params.get("firm_id")
            if firm_id:
                firm = Firm.objects.filter(id=firm_id).first()
            if not firm:
                firm = default_firm_for_superadmin()
        if not firm:
            return api_error("User not associated with a firm", status_code=status.HTTP_400_BAD_REQUEST)

        invites = (
            InviteToken.objects.select_related("invited_user", "created_by")
            .filter(firm=firm)
            .order_by("-created_at")
        )
        now = timezone.now()
        data = []
        for inv in invites:
            if inv.used_at:
                status_label = "USED"
            elif inv.expires_at <= now:
                status_label = "EXPIRED"
            else:
                status_label = "PENDING"
            invited_user = inv.invited_user
            data.append(
                {
                    "id": str(inv.id),
                    "email": getattr(invited_user, "email", None),
                    "name": f"{getattr(invited_user, 'first_name', '')} {getattr(invited_user, 'last_name', '')}".strip()
                    or getattr(invited_user, "email", ""),
                    "role": inv.role or getattr(invited_user, "role", None),
                    "status": status_label,
                    "sent_at": inv.created_at,
                    "expires_at": inv.expires_at,
                    "used_at": inv.used_at,
                    "invited_by": getattr(inv.created_by, "email", None),
                }
            )
        return api_success("Invites retrieved", data=data, meta={"count": len(data)})


class InviteDeleteView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsFirmOwner]

    def delete(self, request, invite_id):
        firm = resolve_firm_for_user(request.user)
        if not firm and request.user.is_superuser:
            firm_id = request.query_params.get("firm_id")
            if firm_id:
                firm = Firm.objects.filter(id=firm_id).first()
            if not firm:
                firm = default_firm_for_superadmin()
        if not firm:
            return api_error("User not associated with a firm", status_code=status.HTTP_400_BAD_REQUEST)
        try:
            invite = InviteToken.objects.get(id=invite_id)
        except InviteToken.DoesNotExist:
            return api_error("Invite not found", status_code=status.HTTP_404_NOT_FOUND)
        if invite.firm_id != firm.id:
            return api_error("Cannot delete invites outside your firm", status_code=status.HTTP_403_FORBIDDEN)
        invite.delete()
        return api_success("Invite deleted", data={"id": str(invite_id)})


class InviteUserView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsFirmOwner]

    def post(self, request):
        firm = resolve_firm_for_user(request.user)
        if not firm and request.user.is_superuser:
            firm_id = request.data.get("firm_id") or request.query_params.get("firm_id")
            if firm_id:
                firm = Firm.objects.filter(id=firm_id).first()
            if not firm:
                firm = default_firm_for_superadmin()
        if not firm:
            return api_error("User not associated with a firm", status_code=status.HTTP_400_BAD_REQUEST)
        total, remaining = firm_user_counts(firm)
        if remaining <= 0:
            return api_error(
                "User limit reached (10). Upgrade plan to add more users.",
                errors={"limit": ["User limit reached"]},
                status_code=status.HTTP_409_CONFLICT,
            )

        serializer = InviteCreateSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return api_error("Validation error", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        user_kwargs = {
            "first_name": data["first_name"],
            "last_name": data["last_name"],
            "email": data["email"],
            "username": data["email"],
            "is_active": True,
        }
        if any(f.name == "firm" for f in User._meta.fields):
            user_kwargs["firm"] = firm
        if any(f.name == "role" for f in User._meta.fields):
            user_kwargs["role"] = data["role"]
        user = User.objects.create(**user_kwargs)
        user.set_password("Abcd.@123456")
        user.save(update_fields=["password"])
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.role = data.get("role")
        profile.firm = firm
        profile.save(update_fields=["role", "firm"])
        total, remaining = firm_user_counts(firm)
        return api_success(
            "User created",
            data={
                "id": user.id,
                "email": user.email,
                "role": profile.role,
                "first_name": user.first_name,
                "last_name": user.last_name,
            },
            meta={"total": total, "limit": USER_LIMIT, "remaining": remaining},
            status_code=status.HTTP_201_CREATED,
        )


class InviteValidateView(APIView):
    permission_classes = []

    def get(self, request):
        return api_error("Invite flow disabled", status_code=status.HTTP_400_BAD_REQUEST)


class InviteSetPasswordView(APIView):
    permission_classes = []

    def post(self, request):
        return api_error("Invite flow disabled", status_code=status.HTTP_400_BAD_REQUEST)
