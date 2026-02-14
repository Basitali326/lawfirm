from typing import Iterable, Set

from django.core.cache import cache

from apps.cases.utils import get_user_firm
from apps.rbac.models import Permission, RolePermission, UserRole


CACHE_TTL = 60 * 10  # 10 minutes


def _cache_key(user_id: int):
    return f"user_perms:{user_id}"


def user_has_perm(user, code: str) -> bool:
    if not user or not user.is_authenticated:
        return False
    return code in get_effective_permissions(user)


def get_effective_permissions(user, *, force=False) -> Set[str]:
    if not user or not user.is_authenticated:
        return set()
    firm = get_user_firm(user)
    firm_id = getattr(firm, "id", None)
    key = _cache_key(user.id)
    if not force:
        cached = cache.get(key)
        if cached is not None:
            return cached

    base_filter = {
        "permission_roles__role__user_roles__user": user,
        "is_active": True,
        "permission_roles__role__is_deleted": False,
    }
    if firm_id:
        base_filter["permission_roles__role__firm_id"] = firm_id

    qs = Permission.objects.filter(**base_filter).values_list("code", flat=True).distinct()
    perms = set(qs)
    cache.set(key, perms, CACHE_TTL)
    return perms


def invalidate_user_perms(user_id: int):
    cache.delete(_cache_key(user_id))


def invalidate_role_users(role_id):
    user_ids = list(UserRole.objects.filter(role_id=role_id).values_list("user_id", flat=True))
    for uid in user_ids:
        invalidate_user_perms(uid)


def assign_permissions_to_role(role, codes: Iterable[str]):
    perms = list(Permission.objects.filter(code__in=codes, is_active=True))
    RolePermission.objects.filter(role=role).exclude(permission__code__in=codes).delete()
    existing_codes = set(RolePermission.objects.filter(role=role).values_list("permission__code", flat=True))
    to_create = [rp for p in perms if p.code not in existing_codes for rp in [RolePermission(role=role, permission=p)]]
    RolePermission.objects.bulk_create(to_create, ignore_conflicts=True)
    invalidate_role_users(role.id)
    return perms


def set_roles_for_user(user, role_ids: Iterable[str]):
    current_ids = set(UserRole.objects.filter(user=user).values_list("role_id", flat=True))
    target_ids = set(role_ids)
    to_delete = current_ids - target_ids
    to_add = target_ids - current_ids
    if to_delete:
        UserRole.objects.filter(user=user, role_id__in=to_delete).delete()
    if to_add:
        UserRole.objects.bulk_create([UserRole(user=user, role_id=rid) for rid in to_add], ignore_conflicts=True)
    invalidate_user_perms(user.id)
