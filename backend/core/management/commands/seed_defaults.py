import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.authx.models import Firm
from apps.cases.models import ClientProfile


class Command(BaseCommand):
    help = "Seed default users and firm (idempotent)"

    def handle(self, *args, **options):
        User = get_user_model()

        sa_email = os.environ.get("SUPERADMIN_EMAIL", "admin@admin.com")
        sa_password = os.environ.get("SUPERADMIN_PASSWORD", "Admin@12345!")
        super_admin, _ = User.objects.get_or_create(
            email=sa_email,
            defaults={"username": sa_email, "role": "SUPER_ADMIN"},
        )
        if sa_password and not super_admin.has_usable_password():
            super_admin.set_password(sa_password)
            super_admin.save()
        super_admin.role = "SUPER_ADMIN"
        super_admin.save(update_fields=["role"])

        firm_name = os.environ.get("DEMO_FIRM_NAME", "Demo Firm")
        firm_slug = os.environ.get("DEMO_FIRM_SLUG", "demo-firm")
        owner_email = os.environ.get("DEMO_OWNER_EMAIL", "owner@demo.com")
        owner_password = os.environ.get("DEMO_OWNER_PASSWORD", "Owner@12345!")

        owner, _ = User.objects.get_or_create(
            email=owner_email,
            defaults={"username": owner_email, "role": "FIRM_OWNER"},
        )
        if not owner.has_usable_password():
            owner.set_password(owner_password)
            owner.save()
        owner.role = "FIRM_OWNER"
        owner.save(update_fields=["role"])

        firm, _ = Firm.objects.get_or_create(slug=firm_slug, defaults={"name": firm_name, "owner": owner})
        if hasattr(owner, "firm"):
            owner.firm = firm
            owner.save(update_fields=["firm"])
        elif hasattr(owner, "firm_id"):
            owner.firm_id = firm.id
            owner.save(update_fields=["firm_id"])

        client_email = os.environ.get("DEMO_CLIENT_EMAIL", "client@demo.com")
        client_password = os.environ.get("DEMO_CLIENT_PASSWORD", "Client@12345!")
        client_user, _ = User.objects.get_or_create(
            email=client_email,
            defaults={"username": client_email, "role": "CLIENT"},
        )
        if not client_user.has_usable_password():
            client_user.set_password(client_password)
            client_user.save()
        client_user.role = "CLIENT"
        client_user.save(update_fields=["role"])
        if hasattr(client_user, "firm"):
            client_user.firm = firm
            client_user.save(update_fields=["firm"])
        elif hasattr(client_user, "firm_id"):
            client_user.firm_id = firm.id
            client_user.save(update_fields=["firm_id"])

        ClientProfile.objects.get_or_create(
            user=client_user,
            defaults={"firm": firm, "name": "Demo Client"},
        )

        self.stdout.write(self.style.SUCCESS("Seed completed."))
