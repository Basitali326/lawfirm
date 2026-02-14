from django.db import migrations, models
from django.conf import settings
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("authx", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Permission",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("module", models.CharField(max_length=64)),
                ("action", models.CharField(max_length=64)),
                ("code", models.CharField(max_length=128, unique=True)),
                ("label", models.CharField(max_length=255)),
                ("description", models.TextField(null=True, blank=True)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ["module", "action"]},
        ),
        migrations.CreateModel(
            name="Role",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("name", models.CharField(max_length=128)),
                ("description", models.TextField(null=True, blank=True)),
                ("is_system", models.BooleanField(default=False)),
                ("is_deleted", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("firm", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="roles", to="authx.firm")),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="UserRole",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("role", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="user_roles", to="rbac.role")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="user_roles", to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name="RolePermission",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("permission", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="permission_roles", to="rbac.permission")),
                ("role", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="role_permissions", to="rbac.role")),
            ],
        ),
        migrations.AddConstraint(
            model_name="role",
            constraint=models.UniqueConstraint(
                fields=("firm", "name"),
                condition=models.Q(("is_deleted", False)),
                name="uniq_role_name_firm_active",
            ),
        ),
        migrations.AddIndex(
            model_name="permission",
            index=models.Index(fields=["module", "action"], name="rbac_permi_module_action_idx"),
        ),
        migrations.AlterUniqueTogether(name="userrole", unique_together={("user", "role")}),
        migrations.AlterUniqueTogether(name="rolepermission", unique_together={("role", "permission")}),
    ]

