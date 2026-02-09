from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.authx.models import Firm
from apps.casetypes.models import CaseType

DEFAULT_TYPES = [
    ("Divorce", "DIVORCE"),
    ("Khula", "KHULA"),
    ("Child Custody", "CHILD_CUSTODY"),
    ("Alimony / Maintenance", "ALIMONY"),
    ("Inheritance / Succession", "INHERITANCE"),
    ("Criminal Complaint", "CRIMINAL_COMPLAINT"),
    ("Fraud", "FRAUD"),
    ("Cybercrime", "CYBERCRIME"),
    ("Cheque Bounce", "CHEQUE_BOUNCE"),
    ("Civil Claim", "CIVIL_CLAIM"),
    ("Debt Recovery", "DEBT_RECOVERY"),
    ("Contract Dispute", "CONTRACT_DISPUTE"),
    ("Commercial Dispute", "COMMERCIAL_DISPUTE"),
    ("Rental Dispute", "RENTAL_DISPUTE"),
    ("Labor Complaint", "LABOR_COMPLAINT"),
    ("Arbitration Case", "ARBITRATION"),
    ("Execution Case", "EXECUTION"),
]


class Command(BaseCommand):
    help = "Seed UAE starter case types per firm (idempotent)"

    def handle(self, *args, **options):
        User = get_user_model()
        firms = Firm.objects.all()
        created_total = 0
        skipped_total = 0
        for firm in firms:
            for name, code in DEFAULT_TYPES:
                obj, created = CaseType.objects.get_or_create(
                    firm=firm,
                    name=name,
                    defaults={
                        "code": code,
                        "created_by": getattr(firm, "owner", None) or User.objects.filter(is_superuser=True).first(),
                    },
                )
                if not created and obj.code != code:
                    obj.code = code
                    obj.save(update_fields=["code", "updated_at"])
                created_total += 1 if created else 0
                skipped_total += 0 if created else 1
        self.stdout.write(self.style.SUCCESS(f"Case types seed complete. created={created_total} skipped={skipped_total}"))
