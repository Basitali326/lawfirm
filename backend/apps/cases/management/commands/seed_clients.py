import random

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.authx.models import Firm, UserProfile
from apps.cases.models import ClientProfile


class Command(BaseCommand):
    help = "Seed a few demo client profiles (and linked users) for the default firm."

    def add_arguments(self, parser):
        parser.add_argument(
            "--firm-slug",
            dest="firm_slug",
            default=None,
            help="Slug of firm to attach clients to. If omitted, uses the first firm or creates 'Demo Firm'.",
        )
        parser.add_argument(
            "--count",
            type=int,
            default=3,
            help="Number of demo clients to seed (default: 3).",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        User = get_user_model()
        firm = self._get_firm(options.get("firm_slug"))
        default_user_password = getattr(settings, "DEFAULT_USER_PASSWORD", "Welcome@12345")

        demo_clients = [
            {"name": "Ali Khan", "email": "ali.client@example.com", "phone": "+971565610715"},
            {"name": "Sara Ahmed", "email": "sara.client@example.com", "phone": "+971501234567"},
            {"name": "John Doe", "email": "john.client@example.com", "phone": "+971523334444"},
        ]

        created = 0
        desired_count = options.get("count") or len(demo_clients)

        for data in demo_clients[:desired_count]:
            user, user_created = User.objects.get_or_create(
                email=data["email"],
                defaults={"username": data["email"], "first_name": data["name"].split()[0]},
            )
            if user_created:
                user.set_password(default_user_password)
                user.save()

            UserProfile.objects.update_or_create(
                user=user,
                defaults={"firm": firm, "role": "CLIENT"},
            )

            _, client_created = ClientProfile.objects.get_or_create(
                user=user,
                firm=firm,
                defaults={"name": data["name"]},
            )
            created += 1 if client_created else 0

        self.stdout.write(
            self.style.SUCCESS(
                f"Seed complete for firm '{firm.name}' (slug={firm.slug}). Clients created: {created}"
            )
        )

    def _get_firm(self, firm_slug=None):
        if firm_slug:
            try:
                return Firm.objects.get(slug=firm_slug)
            except Firm.DoesNotExist:
                raise SystemExit(f"No firm found with slug '{firm_slug}'")

        firm = Firm.objects.order_by("id").first()
        if firm:
            return firm

        # Create a minimal demo firm + owner
        User = get_user_model()
        owner = User.objects.create_user(
            username="demo.owner@example.com",
            email="demo.owner@example.com",
            password=getattr(settings, "DEFAULT_USER_PASSWORD", "Welcome@12345"),
            first_name="Demo",
            last_name="Owner",
        )
        firm = Firm.objects.create(name="Demo Firm", owner=owner, email="demo.owner@example.com")
        UserProfile.objects.update_or_create(user=owner, defaults={"firm": firm, "role": "FIRM_OWNER"})
        return firm
