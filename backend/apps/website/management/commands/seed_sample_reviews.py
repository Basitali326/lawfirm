from datetime import time, timedelta

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.authx.models import Firm
from apps.website.models import (
    Appointment,
    AppointmentReview,
    AppointmentStatus,
    AppointmentType,
    EbookPurchaseStatus,
    LegalService,
    ReviewStatus,
)


SAMPLE_REVIEWS = [
    (5, "The consultation was clear, structured, and focused on practical next steps."),
    (5, "Professional guidance and a very helpful explanation of the available legal options."),
    (4, "The legal issues were explained clearly and the consultation helped us decide what to do next."),
]


class Command(BaseCommand):
    help = "Add clearly labelled sample review content to every published legal service."

    def add_arguments(self, parser):
        parser.add_argument("--firm-slug", default="dr-alaa")

    def handle(self, *args, **options):
        firm = Firm.objects.filter(slug=options["firm_slug"]).first()
        if not firm:
            raise CommandError("Firm not found.")

        services = LegalService.objects.filter(
            firm=firm,
            deleted_at__isnull=True,
            status="PUBLISHED",
        ).select_related("lawyer")
        created_count = 0
        appointment_date = timezone.localdate() - timedelta(days=30)

        sample_names = ["Sample Client A", "Sample Client B", "Sample Client C"]
        for service in services:
            legacy_appointment = Appointment.objects.filter(
                firm=firm,
                service=service,
                client_email=f"sample-review-{service.slug}@example.invalid",
            ).first()
            if legacy_appointment:
                legacy_appointment.delete()
            for review_index, (rating, comment) in enumerate(SAMPLE_REVIEWS):
                email = f"sample-review-{review_index + 1}-{service.slug}@example.invalid"
                appointment, _ = Appointment.objects.get_or_create(
                    firm=firm,
                    service=service,
                    client_email=email,
                    defaults={
                        "lawyer": service.lawyer,
                        "client_name": sample_names[review_index],
                        "client_phone": "+971000000000",
                        "message": "Sample appointment created for demonstration review content.",
                        "appointment_type": AppointmentType.ONLINE,
                        "appointment_date": appointment_date - timedelta(days=review_index),
                        "start_time": time(9 + review_index, 0),
                        "end_time": time(10 + review_index, 0),
                        "amount_aed": service.price_aed,
                        "status": AppointmentStatus.COMPLETED,
                        "payment_status": EbookPurchaseStatus.PAID,
                        "paid_at": timezone.now(),
                    },
                )
                _, created = AppointmentReview.objects.update_or_create(
                    appointment=appointment,
                    defaults={
                        "firm": firm,
                        "service": service,
                        "client_name": sample_names[review_index],
                        "rating": rating,
                        "comment": comment,
                        "is_sample": True,
                        "status": ReviewStatus.APPROVED,
                        "approved_at": timezone.now(),
                    },
                )
                created_count += int(created)

        self.stdout.write(
            self.style.SUCCESS(
                f"Sample reviews prepared for {services.count()} services ({created_count} created)."
            )
        )
