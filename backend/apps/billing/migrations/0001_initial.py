from django.db import migrations, models
import django.db.models.deletion
import uuid
import django.utils.timezone
from django.conf import settings


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("auth", "0012_alter_user_first_name_max_length"),
        ("authx", "0001_initial"),
        ("cases", "0006_case_opened_at_case_tasks_generated_at"),
    ]

    operations = [
        migrations.CreateModel(
            name="FirmInvoiceSequence",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("next_number", models.PositiveIntegerField(default=1)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "firm",
                    models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="invoice_sequence", to="authx.firm"),
                ),
            ],
        ),
        migrations.CreateModel(
            name="Invoice",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("invoice_number", models.CharField(max_length=32, unique=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("DRAFT", "Draft"),
                            ("SENT", "Sent"),
                            ("PARTIAL", "Partial"),
                            ("PAID", "Paid"),
                            ("CANCELLED", "Cancelled"),
                        ],
                        default="SENT",
                        max_length=12,
                    ),
                ),
                ("total_amount", models.DecimalField(decimal_places=2, max_digits=12)),
                ("paid_amount", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("balance_amount", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("issue_date", models.DateField(default=django.utils.timezone.localdate)),
                ("due_date", models.DateField(blank=True, null=True)),
                ("is_deleted", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "case",
                    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="invoices", to="cases.case"),
                ),
                (
                    "client",
                    models.ForeignKey(
                        blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="invoices", to="cases.clientprofile"
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="invoices_created",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "firm",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="invoices", to="authx.firm"),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="Payment",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                (
                    "payment_method",
                    models.CharField(
                        choices=[("CASH", "Cash"), ("STRIPE", "Stripe"), ("BANK", "Bank"), ("OTHER", "Other")], max_length=12
                    ),
                ),
                (
                    "payment_status",
                    models.CharField(
                        choices=[("SUCCEEDED", "Succeeded"), ("FAILED", "Failed"), ("PENDING", "Pending"), ("REFUNDED", "Refunded")],
                        default="SUCCEEDED",
                        max_length=12,
                    ),
                ),
                ("amount", models.DecimalField(decimal_places=2, max_digits=12)),
                ("currency", models.CharField(default="USD", max_length=10)),
                ("paid_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("notes", models.TextField(blank=True, null=True)),
                ("reference_number", models.CharField(blank=True, max_length=64, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "client",
                    models.ForeignKey(
                        blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="payments", to="cases.clientprofile"
                    ),
                ),
                (
                    "firm",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="payments", to="authx.firm"),
                ),
                (
                    "invoice",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="payments", to="billing.invoice"),
                ),
                (
                    "received_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="payments_received",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddIndex(
            model_name="invoice",
            index=models.Index(fields=["firm", "invoice_number"], name="billing_inv_firm_id_2999f3_idx"),
        ),
        migrations.AddIndex(
            model_name="invoice",
            index=models.Index(fields=["firm", "status", "issue_date"], name="billing_inv_firm_id_2cfec1_idx"),
        ),
        migrations.AddIndex(
            model_name="payment",
            index=models.Index(fields=["firm", "invoice", "created_at"], name="billing_pay_firm_id_fab8a1_idx"),
        ),
        migrations.AddIndex(
            model_name="payment",
            index=models.Index(fields=["firm", "client", "created_at"], name="billing_pay_firm_id_e3a635_idx"),
        ),
    ]
