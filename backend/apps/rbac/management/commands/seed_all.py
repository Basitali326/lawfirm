from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Run all RBAC seed/cleanup commands in one step."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Running normalize_roles..."))
        call_command("normalize_roles")

        self.stdout.write(self.style.NOTICE("Running seed_default_roles..."))
        call_command("seed_default_roles")

        self.stdout.write(self.style.NOTICE("Running seed_permissions..."))
        call_command("seed_permissions")

        self.stdout.write(self.style.SUCCESS("All seed commands completed."))

