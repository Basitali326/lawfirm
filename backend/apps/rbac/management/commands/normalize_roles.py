from django.core.management.base import BaseCommand
from django.db import transaction

from apps.authx.models import Firm
from apps.rbac.models import Role, RolePermission, UserRole


class Command(BaseCommand):
    help = "Normalize role names to uppercase and merge case-variant duplicates per firm."

    @transaction.atomic
    def handle(self, *args, **options):
        merged = 0
        renamed = 0

        for firm in Firm.objects.all():
            active_roles = list(Role.objects.filter(firm=firm, is_deleted=False).order_by("created_at"))
            grouped = {}
            for role in active_roles:
                key = (role.name or "").strip().upper()
                if not key:
                    continue
                grouped.setdefault(key, []).append(role)

            for normalized, roles in grouped.items():
                # Prefer system role, then oldest role.
                roles_sorted = sorted(roles, key=lambda r: (not r.is_system, r.created_at, str(r.id)))
                keeper = roles_sorted[0]

                if keeper.name != normalized:
                    keeper.name = normalized
                    keeper.save(update_fields=["name", "updated_at"])
                    renamed += 1

                for duplicate in roles_sorted[1:]:
                    # Move users safely.
                    user_ids = UserRole.objects.filter(role=duplicate).values_list("user_id", flat=True)
                    for user_id in user_ids:
                        UserRole.objects.get_or_create(user_id=user_id, role=keeper)
                    UserRole.objects.filter(role=duplicate).delete()

                    # Move permissions safely.
                    perm_ids = RolePermission.objects.filter(role=duplicate).values_list("permission_id", flat=True)
                    for permission_id in perm_ids:
                        RolePermission.objects.get_or_create(role=keeper, permission_id=permission_id)
                    RolePermission.objects.filter(role=duplicate).delete()

                    duplicate.is_deleted = True
                    duplicate.save(update_fields=["is_deleted", "updated_at"])
                    merged += 1

        self.stdout.write(
            self.style.SUCCESS(f"Roles normalized. Renamed: {renamed}, merged duplicates: {merged}.")
        )

