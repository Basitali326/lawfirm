from django.db import migrations, models
import uuid
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ('authx', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='IntakeRequest',
            fields=[
                ('id', models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ('full_name', models.CharField(max_length=255)),
                ('email', models.EmailField(blank=True, max_length=254, null=True)),
                ('phone', models.CharField(max_length=50)),
                ('case_type', models.CharField(blank=True, max_length=255, null=True)),
                ('message', models.TextField(max_length=2000)),
                ('city', models.CharField(blank=True, max_length=255, null=True)),
                ('preferred_contact_time', models.CharField(blank=True, max_length=255, null=True)),
                ('attachments_count', models.PositiveIntegerField(default=0)),
                ('status', models.CharField(choices=[('NEW', 'New'), ('CONTACTED', 'Contacted'), ('QUALIFIED', 'Qualified'), ('REJECTED', 'Rejected'), ('CONVERTED', 'Converted')], default='NEW', max_length=20)),
                ('source', models.CharField(choices=[('WEBSITE', 'Website'), ('WHATSAPP', 'Whatsapp'), ('REFERRAL', 'Referral'), ('OTHER', 'Other')], default='WEBSITE', max_length=20)),
                ('client_ip', models.GenericIPAddressField(blank=True, null=True)),
                ('user_agent', models.TextField(blank=True, null=True)),
                ('spam_score', models.FloatField(blank=True, null=True)),
                ('is_spam', models.BooleanField(default=False)),
                ('internal_note', models.TextField(blank=True, null=True)),
                ('is_deleted', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('assigned_to', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='assigned_intakes', to=settings.AUTH_USER_MODEL)),
                ('firm', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='intake_requests', to='authx.firm')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='intakerequest',
            index=models.Index(fields=['firm', 'created_at'], name='intakerequ_firm_id_5611a3_idx'),
        ),
        migrations.AddIndex(
            model_name='intakerequest',
            index=models.Index(fields=['firm', 'status', 'created_at'], name='intakerequ_firm_id_90b9e6_idx'),
        ),
        migrations.AddIndex(
            model_name='intakerequest',
            index=models.Index(fields=['firm', 'phone'], name='intakerequ_firm_id_c35505_idx'),
        ),
        migrations.AddIndex(
            model_name='intakerequest',
            index=models.Index(fields=['firm', 'email'], name='intakerequ_firm_id_3b88b3_idx'),
        ),
    ]
