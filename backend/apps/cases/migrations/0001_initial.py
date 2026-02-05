import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('authx', '0004_emailotp'),
    ]

    operations = [
        migrations.CreateModel(
            name='ClientProfile',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('firm', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='client_profiles', to='authx.firm')),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='client_profile', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='Case',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=255)),
                ('case_type', models.CharField(blank=True, max_length=255, null=True)),
                ('case_number', models.CharField(blank=True, max_length=255, null=True)),
                ('status', models.CharField(choices=[('OPEN', 'Open'), ('HOLD', 'Hold'), ('CLOSED', 'Closed')], default='OPEN', max_length=10)),
                ('priority', models.CharField(choices=[('LOW', 'Low'), ('MEDIUM', 'Medium'), ('HIGH', 'High'), ('URGENT', 'Urgent')], default='MEDIUM', max_length=10)),
                ('description', models.TextField(blank=True, null=True)),
                ('court_name', models.CharField(blank=True, max_length=255, null=True)),
                ('judge_name', models.CharField(blank=True, max_length=255, null=True)),
                ('open_date', models.DateField(default=django.utils.timezone.localdate)),
                ('close_date', models.DateField(blank=True, null=True)),
                ('close_reason', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_deleted', models.BooleanField(default=False)),
                ('deleted_at', models.DateTimeField(blank=True, null=True)),
                ('assigned_lead', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='cases_assigned', to=settings.AUTH_USER_MODEL)),
                ('client', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='cases', to='cases.clientprofile')),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='cases_created', to=settings.AUTH_USER_MODEL)),
                ('firm', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='cases', to='authx.firm')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddConstraint(
            model_name='case',
            constraint=models.UniqueConstraint(
                fields=('firm', 'case_number'),
                condition=models.Q(case_number__isnull=False) & ~models.Q(case_number=''),
                name='uniq_case_number_per_firm_nonblank',
            ),
        ),
    ]
