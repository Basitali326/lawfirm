from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from apps.authx.models import Firm
from apps.rbac.models import Role
from apps.rbac.services import assign_permissions_to_role
from apps.rbac.management.commands.seed_permissions import PERMISSION_MATRIX


DEFAULT_ROLE_ORDER = ["FIRM_OWNER", "LAWYER", "PARALEGAL", "CLIENT"]


class Command(BaseCommand):
    help = "Create default roles (Firm Owner, Lawyer, Paralegal, Client) for all firms."

    def handle(self, *args, **options):
        created = 0
        for firm in Firm.objects.all():
            created += self._ensure_roles(firm)
        self.stdout.write(self.style.SUCCESS(f"Default roles ensured. Created: {created}"))

    def _ensure_roles(self, firm):
        created = 0
        # Cleanup legacy role to keep only firm owner + member roles.
        Role.objects.filter(firm=firm, name="FIRM_ADMIN").delete()
        # Firm Owner
        owner_role, was_created = Role.objects.get_or_create(
            firm=firm, name="FIRM_OWNER", defaults={"description": "Full access", "is_system": True}
        )
        created += 1 if was_created else 0
        # Lawyer
        lawyer, was_created = Role.objects.get_or_create(
            firm=firm, name="LAWYER", defaults={"description": "Case-facing permissions", "is_system": True}
        )
        created += 1 if was_created else 0
        # Paralegal
        para, was_created = Role.objects.get_or_create(
            firm=firm, name="PARALEGAL", defaults={"description": "Support staff permissions", "is_system": True}
        )
        created += 1 if was_created else 0
        # Client
        client_role, was_created = Role.objects.get_or_create(
            firm=firm, name="CLIENT", defaults={"description": "Client limited access", "is_system": True}
        )
        created += 1 if was_created else 0

        # Owner: all permissions
        all_codes = [f"{m}.{a}" for m, acts in PERMISSION_MATRIX.items() for a in acts]
        assign_permissions_to_role(owner_role, all_codes)

        # Lawyer: view + add/upload on core modules
        lawyer_codes = []
        keep_modules = [
            "cases",
            "documents",
            "tasks",
            "hearings",
            "intake",
            "clients",
            "reports",
            "audit",
            "messages",
            "case_types",
            "task_templates",
        ]
        for m, acts in PERMISSION_MATRIX.items():
            if m in keep_modules:
                for a in acts:
                    if a in ["view", "download", "upload"] or (a == "add" and m in ["tasks", "documents", "messages"]):
                        lawyer_codes.append(f"{m}.{a}")
        assign_permissions_to_role(lawyer, lawyer_codes)

        # Paralegal: intake/clients add/view/update, cases view, documents upload, tasks view/add, messages add/view
        para_codes = []
        for m, acts in PERMISSION_MATRIX.items():
            if m in ["intake", "clients"]:
                para_codes.extend([f"{m}.{a}" for a in acts if a in ["view", "add", "update"]])
            if m == "cases":
                para_codes.append("cases.view")
            if m == "documents":
                para_codes.extend([f"documents.{a}" for a in acts if a in ["view", "upload", "download"]])
            if m == "tasks":
                para_codes.extend([f"tasks.{a}" for a in acts if a in ["view", "add"]])
            if m == "messages":
                para_codes.extend([f"messages.{a}" for a in acts if a in ["view", "add"]])
            if m in ["case_types", "task_templates"]:
                para_codes.extend([f"{m}.{a}" for a in acts if a in ["view"]])
        assign_permissions_to_role(para, para_codes)

        # Client: minimal view (cases/documents/tasks/messages)
        client_codes = []
        for m in ["cases", "documents", "tasks", "messages", "case_types", "task_templates"]:
            if m in PERMISSION_MATRIX:
                client_codes.append(f"{m}.view")
        assign_permissions_to_role(client_role, client_codes)

        # Assign owner to owner_role
        owner = getattr(firm, "owner", None)
        if owner:
            from apps.rbac.models import UserRole
            UserRole.objects.get_or_create(user=owner, role=owner_role)

        return created
