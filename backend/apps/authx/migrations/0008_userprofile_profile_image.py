from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("authx", "0007_firm_status_userprofile_must_change_password"),
    ]

    operations = [
        migrations.AddField(
            model_name="userprofile",
            name="profile_image",
            field=models.ImageField(blank=True, null=True, upload_to="profiles/"),
        ),
    ]

