from collections import defaultdict

from django.db import transaction
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cases.utils import api_response
from apps.cases.utils import get_user_firm
from apps.rbac.models import Permission, Role
from apps.rbac.permissions import HasRBACPermission
from apps.rbac.serializers import (
    PermissionModuleSerializer,
    RolePermissionListSerializer,
    RolePermissionUpdateSerializer,
    RoleSerializer,
    UserRoleUpdateSerializer,
    MeSerializer,
)
from apps.rbac.services import assign_permissions_to_role, get_effective_permissions, set_roles_for_user, user_has_perm


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100

    def get_paginated_response(self, data):
        return api_response(
            True,
            "OK",
            data=data,
            meta={
                "page": self.page.number,
                "page_size": self.get_page_size(self.request),
                "total": self.page.paginator.count,
                "total_pages": self.page.paginator.num_pages,
                "has_next": self.page.has_next(),
                "has_prev": self.page.has_previous(),
            },
        )


class PermissionCatalogView(APIView):
    permission_classes = [HasRBACPermission.with_perms(["permissions.view"])]

    def get(self, request):
        perms = Permission.objects.filter(is_active=True).order_by("module", "action")
        grouped = defaultdict(list)
        for p in perms:
            grouped[p.module].append(p)
        modules = [{"module": m, "permissions": PermissionModuleSerializer({"module": m, "permissions": grouped[m]}).data["permissions"]} for m in grouped]
        return api_response(True, "OK", {"modules": modules})


class RoleViewSet(viewsets.ModelViewSet):
    serializer_class = RoleSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["name"]
    permission_classes = [HasRBACPermission]
    required_permissions_map = {
        "list": ["roles.view"],
        "retrieve": ["roles.view"],
        "create": ["roles.add"],
        "update": ["roles.update"],
        "partial_update": ["roles.update"],
        "destroy": ["roles.delete"],
        "permissions": ["permissions.view"],
        "set_permissions": ["permissions.update"],
    }

    def get_queryset(self):
        user = self.request.user
        firm = get_user_firm(user)
        if firm is None and getattr(user, "is_superuser", False):
            from apps.authx.models import Firm
            firm = Firm.objects.first()
        return Role.objects.filter(firm=firm, is_deleted=False)

    def get_permissions(self):
        perms = self.required_permissions_map.get(self.action, [])
        return [HasRBACPermission.with_perms(perms)()]

    def destroy(self, request, *args, **kwargs):
        role = self.get_object()
        if role.is_system:
            return api_response(False, "Validation error", errors={"detail": ["Cannot delete system role"]},
                                status=status.HTTP_400_BAD_REQUEST)
        if role.user_roles.filter(user=request.user).exists():
            return api_response(
                False,
                "Validation error",
                errors={"detail": ["You cannot delete a role assigned to yourself. Remove yourself first."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if role.user_roles.exists():
            return api_response(
                False,
                "Validation error",
                errors={"detail": ["Role is assigned to users. Remove assignments before deleting."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        role.is_deleted = True
        role.save(update_fields=["is_deleted"])
        return api_response(True, "OK", data=None, status=status.HTTP_204_NO_CONTENT)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        role = self.get_object()
        serializer = self.get_serializer(role)
        return api_response(True, "OK", serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        role = serializer.save()
        # Optional permission_codes payload; if omitted we leave the role empty.
        codes = request.data.get("permission_codes", [])
        if codes:
            assign_permissions_to_role(role, codes)
        return api_response(True, "OK", self.get_serializer(role).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return api_response(True, "OK", serializer.data)

    @action(detail=True, methods=["get"], url_path="permissions")
    def permissions(self, request, pk=None):
        role = self.get_object()
        codes = list(role.role_permissions.select_related("permission").values_list("permission__code", flat=True))
        return api_response(True, "OK", data={"permission_codes": codes})

    @permissions.mapping.put
    def set_permissions(self, request, pk=None):
        role = self.get_object()
        serializer = RolePermissionUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        codes = serializer.validated_data["permission_codes"]
        perms = assign_permissions_to_role(role, codes)
        return api_response(True, "OK", data={"permission_codes": [p.code for p in perms]})


class UserRoleView(APIView):
    permission_classes = [HasRBACPermission.with_perms(["users.update"])]

    def get(self, request, user_id):
        firm = get_user_firm(request.user)
        roles = Role.objects.filter(user_roles__user_id=user_id, is_deleted=False, firm=firm)
        return api_response(True, "OK", data={"role_ids": list(roles.values_list("id", flat=True))})

    def put(self, request, user_id):
        serializer = UserRoleUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        role_ids = serializer.validated_data["role_ids"]
        # user firm check
        target_user = get_object_or_404(request.user.__class__, id=user_id)
        target_firm = get_user_firm(target_user)
        request_firm = get_user_firm(request.user)
        if target_firm is None:
            target_firm = request_firm
        if getattr(target_firm, "id", None) != getattr(request_firm, "id", None):
            return api_response(False, "Validation error", errors={"detail": ["User not in your firm"]},
                                status=status.HTTP_400_BAD_REQUEST)
        # firm scope check
        if Role.objects.filter(id__in=role_ids, firm=request_firm, is_deleted=False).count() != len(role_ids):
            return api_response(False, "Validation error", errors={"role_ids": ["Invalid roles for this firm"]},
                                status=status.HTTP_400_BAD_REQUEST)
        set_roles_for_user(target_user, role_ids)
        return api_response(True, "OK", data={"role_ids": role_ids})


class MeView(APIView):
    def get(self, request):
        perms = list(get_effective_permissions(request.user))
        data = {
          "id": request.user.id,
          "email": request.user.email,
          "name": getattr(request.user, "get_full_name", lambda: request.user.email)() or request.user.email,
          "roles": list(request.user.user_roles.filter(role__is_deleted=False).values_list("role__name", flat=True)),
          "permissions": perms,
        }
        return api_response(True, "OK", data)
