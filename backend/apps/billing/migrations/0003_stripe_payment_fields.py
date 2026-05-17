# Generated for Stripe invoice payments.

from decimal import Decimal
import uuid

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("billing", "0002_casetypefeepolicy_invoicelineitem_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="payment",
            name="payment_status",
            field=models.CharField(
                choices=[
                    ("SUCCEEDED", "Succeeded"),
                    ("FAILED", "Failed"),
                    ("PENDING", "Pending"),
                    ("REFUNDED", "Refunded"),
                    ("PARTIALLY_REFUNDED", "Partially refunded"),
                ],
                default="SUCCEEDED",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="payment",
            name="refunded_amount",
            field=models.DecimalField(decimal_places=2, default=Decimal("0.00"), max_digits=12),
        ),
        migrations.AddField(
            model_name="payment",
            name="stripe_charge_id",
            field=models.CharField(blank=True, db_index=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name="payment",
            name="stripe_checkout_session_id",
            field=models.CharField(blank=True, max_length=255, null=True, unique=True),
        ),
        migrations.AddField(
            model_name="payment",
            name="stripe_checkout_url",
            field=models.URLField(blank=True, max_length=500, null=True),
        ),
        migrations.AddField(
            model_name="payment",
            name="stripe_payment_intent_id",
            field=models.CharField(blank=True, max_length=255, null=True, unique=True),
        ),
        migrations.AddField(
            model_name="payment",
            name="stripe_payment_status",
            field=models.CharField(blank=True, max_length=32, null=True),
        ),
        migrations.CreateModel(
            name="StripeWebhookEvent",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("event_id", models.CharField(max_length=255, unique=True)),
                ("event_type", models.CharField(max_length=128)),
                ("payload", models.JSONField(blank=True, default=dict)),
                ("processing_error", models.TextField(blank=True, null=True)),
                ("received_at", models.DateTimeField(auto_now_add=True)),
                ("processed_at", models.DateTimeField(blank=True, null=True)),
                (
                    "payment",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="stripe_events",
                        to="billing.payment",
                    ),
                ),
            ],
            options={
                "ordering": ["-received_at"],
            },
        ),
        migrations.AddIndex(
            model_name="stripewebhookevent",
            index=models.Index(fields=["event_type", "received_at"], name="billing_str_event_t_a45532_idx"),
        ),
        migrations.AddIndex(
            model_name="stripewebhookevent",
            index=models.Index(fields=["processed_at"], name="billing_str_process_e398e9_idx"),
        ),
    ]
