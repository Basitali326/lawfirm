from django.db import migrations, models
import apps.cases.models


class Migration(migrations.Migration):

    dependencies = [
        ("cases", "0006_case_opened_at_case_tasks_generated_at"),
    ]

    operations = [
        migrations.AlterField(
            model_name="case",
            name="status",
            field=models.CharField(
                max_length=18,
                choices=apps.cases.models.CaseStatus.choices,
                default=apps.cases.models.CaseStatus.PENDING_PAYMENT,
            ),
        ),
    ]
