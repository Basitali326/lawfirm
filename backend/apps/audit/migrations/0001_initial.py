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
            name='AuditLog',
            fields=[
                ('id', models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ('entity_type', models.CharField(choices=[('CASE', 'Case'), ('CLIENT', 'Client'), ('TASK', 'Task'), ('DOCUMENT', 'Document'), ('USER', 'User'), ('AUTH', 'Auth'), ('OTHER', 'Other')], max_length=20)),
                ('entity_id', models.CharField(max_length=255)),
                ('action', models.CharField(choices=[('CREATED', 'Created'), ('UPDATED', 'Updated'), ('DELETED', 'Deleted'), ('STATUS_CHANGED', 'Status Changed'), ('ASSIGNED', 'Assigned'), ('UPLOADED', 'Uploaded'), ('LOGIN', 'Login'), ('LOGOUT', 'Logout'), ('PASSWORD_CHANGED', 'Password Changed'), ('ROLE_CHANGED', 'Role Changed'), ('OTHER', 'Other')], max_length=32)),
                ('message', models.CharField(blank=True, max_length=255, null=True)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('user_agent', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('actor', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='audit_logs', to=settings.AUTH_USER_MODEL)),
                ('firm', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='audit_logs', to='authx.firm')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['firm', 'created_at'], name='auditlog_firm_ca_1ecf57_idx'),
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['firm', 'entity_type', 'entity_id'], name='auditlog_firm_en_c528e9_idx'),
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['firm', 'actor', 'created_at'], name='auditlog_firm_ac_722479_idx'),
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['firm', 'action', 'created_at'], name='auditlog_firm_ac_825bfb_idx'),
        ),
    ]
