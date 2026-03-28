from django.core.management.base import BaseCommand

from apps.rbac.models import Permission


PERMISSIONS = {
    "collections": ["view", "add", "update", "delete"],
    "categories": ["view", "add", "update", "delete"],
    "products": ["view", "add", "update", "delete"],
    "orders": ["view", "update"],
}


class Command(BaseCommand):
    help = "Seed ecommerce permissions"

    def handle(self, *args, **options):
        created = 0
        for module, actions in PERMISSIONS.items():
            for action in actions:
                code = f"{module}.{action}"
                _, was_created = Permission.objects.update_or_create(
                    code=code,
                    defaults={
                        "module": module,
                        "action": action,
                        "label": f"{action.title()} {module.replace('_', ' ').title()}",
                        "is_active": True,
                    },
                )
                if was_created:
                    created += 1
        self.stdout.write(self.style.SUCCESS(f"Ecommerce permissions ensured. New: {created}"))
