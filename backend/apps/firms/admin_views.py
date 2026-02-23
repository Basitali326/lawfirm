import secrets

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count
from django.utils import timezone
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import BasePermission
from rest_framework.views import APIView

from apps.authx.models import Firm, UserProfile
from apps.rbac.models import Role
from apps.rbac.services import assign_permissions_to_role
from apps.cases.models import Case
from core.responses import api_success, api_error


DEFAULT_TEMP_PASSWORD = "Welcome@12345"


class SuperAdminOnly(BasePermission):
    def has_permission(self, request, view):
        role = (getattr(request.user, "role", "") or getattr(getattr(request.user, "profile", None), "role", "") or "").upper()
        return bool(request.user and request.user.is_authenticated and (request.user.is_superuser or role == "SUPER_ADMIN"))


def ensure_default_roles(firm):
    default_roles = ["FIRM_OWNER", "FIRM_ADMIN", "LAWYER", "PARALEGAL", "CLIENT"]
    created = []
    for name in default_roles:
        role, _ = Role.objects.get_or_create(firm=firm, name=name, defaults={"is_system": True})
        created.append(role)
    return created


class AdminFirmPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


def _serialize_firm(f, counts=False):
    base = {
        "id": f.id,
        "name": f.name,
        "slug": f.slug,
        "status": f.status,
        "email": f.email,
        "phone": f.phone,
        "created_at": f.created_at,
    }
    if counts:
        base["user_count"] = getattr(f, "user_count", None)
        base["case_count"] = getattr(f, "case_count", None)
    return base


class AdminFirmListView(APIView):
    permission_classes = [SuperAdminOnly]
    pagination_class = AdminFirmPagination

    @transaction.atomic
    def post(self, request):
        data = request.data
        firm_name = data.get("firm_name")
        ceo_email = data.get("ceo_email")
        ceo_full_name = data.get("ceo_full_name") or ""
        if not firm_name or not ceo_email:
            return api_error("Validation error", errors={"detail": ["firm_name and ceo_email are required"]}, status_code=status.HTTP_400_BAD_REQUEST)

        from apps.authx.models import generate_unique_slug

        User = get_user_model()
        first_name, *rest = ceo_full_name.split(" ")
        last_name = " ".join(rest) if rest else ""

        user, created_user = User.objects.get_or_create(
            email=ceo_email.lower(),
            defaults={"username": ceo_email.lower(), "first_name": first_name, "last_name": last_name},
        )
        temp_password = DEFAULT_TEMP_PASSWORD
        user.set_password(temp_password)
        user.save()

        firm, created_firm = Firm.objects.get_or_create(
            name=firm_name,
            defaults={
                "slug": generate_unique_slug(Firm, firm_name),
                "owner": user,
                "email": data.get("firm_email"),
                "phone": data.get("firm_phone"),
                "status": "ACTIVE",
            },
        )
        if not created_firm:
            return api_error("Firm already exists", errors={"firm_name": ["Firm with this name already exists"]}, status_code=status.HTTP_409_CONFLICT)

        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.firm = firm
        profile.role = "FIRM_OWNER"
        profile.must_change_password = True
        profile.save(update_fields=["firm", "role", "must_change_password"])

        ensure_default_roles(firm)
        owner_role = Role.objects.filter(firm=firm, name="FIRM_OWNER").first()
        if owner_role:
            user.user_roles.get_or_create(role=owner_role)

        resp = {
            "firm": _serialize_firm(firm),
            "ceo_user": {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
            },
            "temporary_password": temp_password,
        }
        return api_success("Firm created", data=resp, status_code=status.HTTP_201_CREATED)

    def get(self, request):
        qs = Firm.objects.all().annotate(user_count=Count("user_profiles"), case_count=Count("cases"))
        search = request.query_params.get("search")
        status_param = request.query_params.get("status")
        if search:
            qs = qs.filter(name__icontains=search)
        if status_param:
            qs = qs.filter(status__iexact=status_param)
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(qs, request)
        data = [_serialize_firm(f, counts=True) for f in (page or qs)]
        meta = None
        if page is not None:
            meta = {
                "page": paginator.page.number,
                "page_size": paginator.get_page_size(request),
                "total": paginator.page.paginator.count,
                "total_pages": paginator.page.paginator.num_pages,
            }
            return api_success("Firms retrieved", data=data, meta=meta)
        meta = {"page": 1, "page_size": len(data), "total": len(data), "total_pages": 1}
        return api_success("Firms retrieved", data=data, meta=meta)


class AdminFirmDetailView(APIView):
    permission_classes = [SuperAdminOnly]

    def get(self, request, firm_id):
        try:
            f = Firm.objects.get(id=firm_id)
        except Firm.DoesNotExist:
            return api_error("Not found", status_code=status.HTTP_404_NOT_FOUND)
        user_count = UserProfile.objects.filter(firm=f).count()
        case_count = Case.objects.filter(firm=f, is_deleted=False).count() if hasattr(Case, "firm") else 0
        data = {
            "id": f.id,
            "name": f.name,
            "slug": f.slug,
            "status": f.status,
            "email": f.email,
            "phone": f.phone,
            "created_at": f.created_at,
            "user_count": user_count,
            "case_count": case_count,
        }
        return api_success("Firm retrieved", data=data)


class AdminFirmUpdateView(APIView):
    permission_classes = [SuperAdminOnly]

    def patch(self, request, firm_id):
        try:
            f = Firm.objects.get(id=firm_id)
        except Firm.DoesNotExist:
            return api_error("Not found", status_code=status.HTTP_404_NOT_FOUND)
        name = request.data.get("name")
        status_val = request.data.get("status")
        email = request.data.get("email")
        phone = request.data.get("phone")
        if name:
            if Firm.objects.filter(name__iexact=name).exclude(id=firm_id).exists():
                return api_error("Validation error", errors={"name": ["Firm name must be unique"]}, status_code=status.HTTP_400_BAD_REQUEST)
            f.name = name
        if status_val:
            f.status = status_val
        if email is not None:
            f.email = email
        if phone is not None:
            f.phone = phone
        f.save()
        data = {
            "id": f.id,
            "name": f.name,
            "slug": f.slug,
            "status": f.status,
            "email": f.email,
            "phone": f.phone,
        }
        return api_success("Firm updated", data=data)


class AdminResetCeoPasswordView(APIView):
    permission_classes = [SuperAdminOnly]

    def post(self, request, firm_id):
        try:
            f = Firm.objects.select_related("owner").get(id=firm_id)
        except Firm.DoesNotExist:
            return api_error("Not found", status_code=status.HTTP_404_NOT_FOUND)
        new_password = DEFAULT_TEMP_PASSWORD
        owner = f.owner
        owner.set_password(new_password)
        owner.save()
        profile, _ = UserProfile.objects.get_or_create(user=owner)
        profile.must_change_password = True
        profile.save(update_fields=["must_change_password"])
        data = {
            "temporary_password": new_password,
            "ceo_user": {"id": owner.id, "email": owner.email},
        }
        return api_success("Password reset", data=data)
