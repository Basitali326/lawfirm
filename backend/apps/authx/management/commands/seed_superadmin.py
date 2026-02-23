from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.authx.models import Firm, UserProfile
from apps.rbac.models import Role, UserRole


DEFAULT_SUPER_EMAIL = "superadmin@platform.local"
DEFAULT_SUPER_PASSWORD = "SuperAdmin@12345"

DEFAULT_ROLES = ["SUPER_ADMIN", "FIRM_OWNER", "LAWYER", "PARALEGAL", "CLIENT"]


class Command(BaseCommand):
    help = "Seed default superadmin user and default roles"

    def handle(self, *args, **options):
        User = get_user_model()
        with transaction.atomic():
            user, created = User.objects.get_or_create(
                email=DEFAULT_SUPER_EMAIL,
                defaults={
                    "username": DEFAULT_SUPER_EMAIL,
                    "is_staff": True,
                    "is_superuser": True,
                },
            )
            if created or not user.check_password(DEFAULT_SUPER_PASSWORD):
                user.set_password(DEFAULT_SUPER_PASSWORD)
            # Always enforce admin flags for seeded superadmin account.
            user.is_staff = True
            user.is_superuser = True
            user.save()
            profile, _ = UserProfile.objects.get_or_create(user=user)

            # Ensure platform firm exists and linked to superadmin
            firm, firm_created = Firm.objects.get_or_create(
                owner=user,
                defaults={
                    "name": "Platform",
                    "slug": "platform",
                    "status": "ACTIVE",
                },
            )
            profile.firm = firm
            profile.role = "SUPER_ADMIN"
            profile.save(update_fields=["firm", "role"])

            # Seed default roles on platform firm
            for role_name in DEFAULT_ROLES:
                Role.objects.get_or_create(
                    firm=firm,
                    name=role_name,
                    defaults={"is_system": True},
                )

            # Enforce a single RBAC role for superadmin: SUPER_ADMIN only.
            super_admin_role = Role.objects.filter(firm=firm, name="SUPER_ADMIN", is_deleted=False).first()
            UserRole.objects.filter(user=user).exclude(role=super_admin_role).delete()
            if super_admin_role:
                UserRole.objects.get_or_create(user=user, role=super_admin_role)

        self.stdout.write(self.style.SUCCESS("Superadmin and default roles seeded."))
