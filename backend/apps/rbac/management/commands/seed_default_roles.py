from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from apps.authx.models import Firm
from apps.rbac.models import Role
from apps.rbac.services import assign_permissions_to_role
from apps.rbac.management.commands.seed_permissions import PERMISSION_MATRIX


class Command(BaseCommand):
    help = "Create default roles (Firm Admin, Lawyer, Staff) for all firms."

    def handle(self, *args, **options):
        created = 0
        for firm in Firm.objects.all():
            created += self._ensure_roles(firm)
        self.stdout.write(self.style.SUCCESS(f"Default roles ensured. Created: {created}"))

    def _ensure_roles(self, firm):
        created = 0
        admin, was_created = Role.objects.get_or_create(
            firm=firm, name="Firm Admin", defaults={"description": "Full access", "is_system": True}
        )
        created += 1 if was_created else 0
        lawyer, was_created = Role.objects.get_or_create(
            firm=firm, name="Lawyer", defaults={"description": "Case-facing permissions", "is_system": True}
        )
        created += 1 if was_created else 0
        staff, was_created = Role.objects.get_or_create(
            firm=firm, name="Staff", defaults={"description": "Support staff permissions", "is_system": True}
        )
        created += 1 if was_created else 0

        # Admin: all
        all_codes = [f"{m}.{a}" for m, acts in PERMISSION_MATRIX.items() for a in acts]
        assign_permissions_to_role(admin, all_codes)

        # Lawyer: view-heavy
        lawyer_codes = []
        keep_modules = ["cases", "documents", "tasks", "hearings", "intake", "clients", "reports", "audit"]
        for m, acts in PERMISSION_MATRIX.items():
            if m in keep_modules:
                lawyer_codes.extend([f"{m}.{a}" for a in acts if a in ["view", "download", "upload"] or a == "add" and m in ["tasks", "documents"]])
        assign_permissions_to_role(lawyer, lawyer_codes)

        # Staff: intake/clients add/view, cases view, documents upload
        staff_codes = []
        for m, acts in PERMISSION_MATRIX.items():
            if m in ["intake", "clients"]:
                staff_codes.extend([f"{m}.{a}" for a in acts if a in ["view", "add", "update"]])
            if m == "cases":
                staff_codes.append("cases.view")
            if m == "documents":
                staff_codes.extend([f"documents.{a}" for a in acts if a in ["view", "upload", "download"]])
        assign_permissions_to_role(staff, staff_codes)

        # Optionally assign owner to admin
        owner = getattr(firm, "owner", None)
        if owner:
            from apps.rbac.models import UserRole

            UserRole.objects.get_or_create(user=owner, role=admin)

        return created
