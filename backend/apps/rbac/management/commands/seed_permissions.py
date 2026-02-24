from django.core.management.base import BaseCommand
from apps.rbac.models import Permission


PERMISSION_MATRIX = {
    "intake": ["view", "add", "update", "delete", "export"],
    "clients": ["view", "add", "update", "delete", "export"],
    "cases": ["view", "add", "update", "delete", "export"],
    "documents": ["view", "add", "update", "delete", "upload", "download"],
    "tasks": ["view", "add", "update", "delete", "assign", "export"],
    "hearings": ["view", "add", "update", "delete", "export"],
    "invoices": ["view", "add", "update", "delete", "export"],
    "payments": ["view", "add", "update", "delete", "export"],
    "users": ["view", "add", "update", "delete"],
    "roles": ["view", "add", "update", "delete"],
    "permissions": ["view", "update"],
    "reports": ["view", "export"],
    "settings": ["view", "update"],
    "audit": ["view", "export"],
    "messages": ["view", "add", "update", "delete"],
    "trash": ["view", "restore", "delete"],
    "case_types": ["view", "add", "update", "delete"],
    "task_templates": ["view", "add", "update", "delete"],
}


class Command(BaseCommand):
    help = "Seed permission catalog"

    def handle(self, *args, **options):
        created = 0
        for module, actions in PERMISSION_MATRIX.items():
            for action in actions:
                code = f"{module}.{action}"
                label = f"{action.title()} {module.title()}"
                obj, was_created = Permission.objects.update_or_create(
                    code=code,
                    defaults={
                        "module": module,
                        "action": action,
                        "label": label,
                        "is_active": True,
                    },
                )
                created += 1 if was_created else 0
        self.stdout.write(self.style.SUCCESS(f"Permission seed complete. New: {created}, Total: {Permission.objects.count()}"))
