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
            defaults={"username": sa_email, "is_staff": True, "is_superuser": True},
        )
        if sa_password:
            super_admin.set_password(sa_password)
            super_admin.save()
        # Ensure admin flags stay true even if user existed
        super_admin.is_staff = True
        super_admin.is_superuser = True
        # Some deployments may add a custom 'role' field; set if present.
        if hasattr(super_admin, "role"):
            setattr(super_admin, "role", getattr(super_admin, "role", "SUPER_ADMIN") or "SUPER_ADMIN")
            super_admin.save(update_fields=["is_staff", "is_superuser", "role"])
        else:
            super_admin.save(update_fields=["is_staff", "is_superuser"])

        firm_name = os.environ.get("DEMO_FIRM_NAME", "Demo Firm")
        firm_slug = os.environ.get("DEMO_FIRM_SLUG", "demo-firm")
        owner_email = os.environ.get("DEMO_OWNER_EMAIL", "owner@demo.com")
        owner_password = os.environ.get("DEMO_OWNER_PASSWORD", "Owner@12345!")

        owner_defaults = {"username": owner_email}
        if hasattr(User, "role"):
            owner_defaults["role"] = "FIRM_OWNER"
        owner, _ = User.objects.get_or_create(email=owner_email, defaults=owner_defaults)
        if owner_password:
            owner.set_password(owner_password)
            owner.save()
        if hasattr(owner, "role"):
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
        client_defaults = {"username": client_email}
        if hasattr(User, "role"):
            client_defaults["role"] = "CLIENT"
        client_user, _ = User.objects.get_or_create(email=client_email, defaults=client_defaults)
        if client_password:
            client_user.set_password(client_password)
            client_user.save()
        if hasattr(client_user, "role"):
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
