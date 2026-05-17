from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("billing", "0003_stripe_payment_fields"),
    ]

    operations = [
        migrations.AlterField(
            model_name="payment",
            name="reference_number",
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
    ]
